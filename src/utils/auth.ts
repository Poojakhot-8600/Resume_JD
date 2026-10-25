import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/database/db';

// ==============================================================================
// CONFIGURATION CONSTANTS (read from environment, with secure defaults)
// ==============================================================================
export const SESSION_IDLE_TIMEOUT_MINUTES = parseInt(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES || '20',
  10
);
export const SESSION_WARNING_SECONDS = parseInt(
  process.env.SESSION_WARNING_SECONDS || '60',
  10
);
export const SESSION_MAX_HOURS = parseInt(
  process.env.SESSION_MAX_HOURS || '8',
  10
);
export const COOKIE_NAME = process.env.COOKIE_NAME || 'auth_token';
export const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax';
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN.trim() : undefined;

export function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
  );
}

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  auth_time?: number; // Unix timestamp in seconds of original login
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Signs a JWT with:
 * - sliding 20-minute expiration (or SESSION_IDLE_TIMEOUT_MINUTES)
 * - original login timestamp (auth_time)
 * - absolute cap at SESSION_MAX_HOURS from auth_time
 */
export async function signJWT(
  payload: TokenPayload,
  slidingMinutes?: number,
  originalAuthTime?: number
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const authTime = originalAuthTime ?? payload.auth_time ?? nowSec;
  const idleMin = slidingMinutes ?? SESSION_IDLE_TIMEOUT_MINUTES;
  const maxExp = authTime + SESSION_MAX_HOURS * 3600;
  const targetExp = Math.min(nowSec + idleMin * 60, maxExp);

  return new SignJWT({
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    auth_time: authTime,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(nowSec)
    .setExpirationTime(targetExp)
    .sign(getJwtSecret());
}

/**
 * Strictly verifies JWT signature, exp, and absolute session duration limit.
 * Returns null if missing, invalid, or expired.
 */
export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 10 });
    const verified = payload as unknown as TokenPayload;

    const nowSec = Math.floor(Date.now() / 1000);

    // 1. Check expiration
    if (verified.exp && nowSec >= verified.exp) {
      return null;
    }

    // 2. Check absolute session lifespan cap (SESSION_MAX_HOURS from original login)
    if (verified.auth_time) {
      const maxAllowedSec = verified.auth_time + SESSION_MAX_HOURS * 3600;
      if (nowSec >= maxAllowedSec) {
        return null;
      }
    }

    return verified;
  } catch (err) {
    return null;
  }
}

/**
 * Determines whether the cookie should have the Secure attribute.
 * Respects explicit COOKIE_SECURE environment variable, never enables Secure on localhost/IP over HTTP.
 */
export function isRequestSecure(request?: Request): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

  if (!request) return false;

  const host = request.headers.get('host') || '';
  if (
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host) ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  ) {
    return false;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    const proto = forwardedProto.split(',')[0].trim().toLowerCase();
    if (proto === 'https') return true;
    if (proto === 'http') return false;
  }

  try {
    const url = new URL(request.url);
    if (url.protocol === 'https:') return true;
  } catch {}

  return false;
}

/**
 * Returns standardized cookie options according to environment configuration.
 */
export function getAuthCookieOptions(request?: Request, maxAgeSeconds?: number) {
  const secure = isRequestSecure(request);
  const maxAge = maxAgeSeconds ?? (SESSION_IDLE_TIMEOUT_MINUTES * 60);

  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: COOKIE_SAMESITE,
    path: '/',
    domain: COOKIE_DOMAIN || undefined,
    maxAge,
  };
}

/**
 * Resolves the authenticated user from Request headers, cookies, or Next.js headers.
 * Returns null if the token is missing, invalid, or expired.
 */
export async function getCurrentUser(req?: Request) {
  try {
    let token: string | undefined;

    // 1. Check direct request headers / cookies if Request object passed
    if (req) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
      if (!token) {
        token = req.headers.get('x-auth-token') || undefined;
      }
      if (!token) {
        const cookieHeader = req.headers.get('cookie') || '';
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
        if (match) token = decodeURIComponent(match[1]);
      }
    }

    // 2. Check Next.js request headers
    if (!token) {
      try {
        const headerList = await headers();
        const authHeader = headerList.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        }
        if (!token) {
          token = headerList.get('x-auth-token') || undefined;
        }
        if (!token) {
          const cookieHeader = headerList.get('cookie') || '';
          const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
          if (match) token = decodeURIComponent(match[1]);
        }
      } catch {}
    }

    // 3. Check Next.js cookies store
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(COOKIE_NAME)?.value;
      } catch {}
    }

    // If no token found, user is unauthenticated
    if (!token) {
      return null;
    }

    // Verify token expiration and signature
    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return null;
    }

    // Look up user in database
    try {
      let user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!user && payload.email) {
        user = await prisma.user.findFirst({
          where: { email: { equals: payload.email, mode: 'insensitive' } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });
      }

      if (user) return user;
    } catch (dbError) {
      console.warn('[auth] DB lookup error in getCurrentUser, using verified token payload:', dbError);
    }

    // Fall back to verified token payload
    return {
      id: payload.id,
      name: payload.name || payload.email?.split('@')[0] || 'User',
      email: payload.email,
      role: (payload.role as any) || 'RECRUITER',
    };
  } catch (error) {
    console.error('[auth] Error in getCurrentUser:', error);
    return null;
  }
}
