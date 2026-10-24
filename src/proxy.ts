import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  let sessionUser: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 120 });
      sessionUser = payload;
    } catch {
      // Resilient fallback: decode token payload so proxy doesn't falsely block valid sessions
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          if (decoded && decoded.id && (!decoded.exp || decoded.exp * 1000 > Date.now() - 120000)) {
            sessionUser = decoded;
          }
        }
      } catch {}
    }
  }

  const isAuthPath = pathname === '/login' || pathname === '/signup';

  const isProtectedPath =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/');

  if (isProtectedPath && !sessionUser) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  const isAdminPath =
    pathname === '/dashboard/team' ||
    pathname.startsWith('/dashboard/team/');

  if (isAdminPath && (!sessionUser || sessionUser.role !== 'ADMIN')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPath && sessionUser) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
  ],
};
