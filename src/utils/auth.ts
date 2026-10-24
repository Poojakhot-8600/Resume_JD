import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/database/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
);

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

export async function signJWT(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function isRequestSecure(request: Request): boolean {
  // Explicit environment override: COOKIE_SECURE=false or COOKIE_SECURE=true
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

  // Check reverse-proxy protocol header (standard for Nginx, Cloudflare, Hostinger, etc.)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    const proto = forwardedProto.split(',')[0].trim().toLowerCase();
    if (proto === 'https') return true;
    if (proto === 'http') return false;
  }

  // Check request URL protocol
  try {
    const url = new URL(request.url);
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:') return false;
  } catch { }

  // Check NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (appUrl.startsWith('https://')) return true;
  if (appUrl.startsWith('http://')) return false;

  // Fallback: only secure if production and not explicitly an http address
  return process.env.NODE_ENV === 'production' && !appUrl.startsWith('http://');
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload) return null;

    // Get active user data from the database
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
      console.warn('Database lookup failed in getCurrentUser, falling back to token payload:', dbError);
    }

    // Fallback to verified token payload so authenticated user is never locked out
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role as any,
    };
  } catch (error) {
    console.error('Error resolving current session user:', error);
    return null;
  }
}
