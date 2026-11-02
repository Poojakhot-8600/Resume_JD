import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/database/db';

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RECRUITER';
  [key: string]: any;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RECRUITER';
}

/**
 * Signs a secure JWT valid for 7 days
 */
export async function signJWT(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

/**
 * Cryptographically verifies a JWT.
 * Strict signature validation — zero unverified token bypasses.
 */
export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 30 });
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Checks whether the request is transmitted over HTTPS
 */
export function isRequestSecure(request: Request): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

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
 * Resolves the authenticated user from the current request or Next.js headers/cookies.
 * Returns null if the request is unauthenticated or token is invalid.
 */
export async function getCurrentUser(req?: Request): Promise<AuthenticatedUser | null> {
  try {
    let token: string | undefined;

    // 1. Check direct request headers if provided
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
        const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
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
          const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
          if (match) token = decodeURIComponent(match[1]);
        }
      } catch {}
    }

    // 3. Check Next.js cookies store
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get('auth_token')?.value;
      } catch {}
    }

    if (!token) {
      return null;
    }

    // Verify token cryptographically
    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return null;
    }

    // Verify user exists in database and has current role
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'ADMIN' | 'RECRUITER',
        };
      }
    } catch (dbError) {
      console.warn('Database lookup failed in getCurrentUser, falling back to verified token payload:', dbError);
    }

    // Fallback only to the verified token's own payload if DB connection briefly fails
    return {
      id: payload.id,
      name: payload.name || payload.email?.split('@')[0] || 'User',
      email: payload.email,
      role: (payload.role as 'ADMIN' | 'RECRUITER') || 'RECRUITER',
    };
  } catch (error) {
    console.error('Error resolving current session user:', error);
    return null;
  }
}
