import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = process.env.COOKIE_NAME || 'auth_token';
const SESSION_MAX_HOURS = parseInt(process.env.SESSION_MAX_HOURS || '8', 10);

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Extract session token from cookie or Authorization header
  let token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  let isValid = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey(), { clockTolerance: 10 });
      const nowSec = Math.floor(Date.now() / 1000);

      // Check exp claim
      const isNotExpired = !payload.exp || nowSec < (payload.exp as number);

      // Check absolute session cap
      const authTime = (payload.auth_time as number) || (payload.iat as number) || nowSec;
      const isWithinMaxHours = nowSec - authTime < SESSION_MAX_HOURS * 3600;

      if (isNotExpired && isWithinMaxHours && payload.id) {
        isValid = true;
      }
    } catch {
      isValid = false;
    }
  }

  // 2. If unauthenticated or session expired
  if (!isValid) {
    // If requesting an API route, respond with 401 JSON
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'Unauthorized: Session missing or expired' },
        { status: 401 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return response;
    }

    // For dashboard pages, redirect to /login with reason
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'expired');
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  }

  // 3. Authenticated request: proceed with security headers preventing back-button caching
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/team/:path*',
    '/api/settings/defaults',
  ],
};
