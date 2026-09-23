import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  let sessionUser = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionUser = payload;
    } catch {
      // Invalid token, treat as unauthenticated
    }
  }

  const isAuthPath = pathname === '/login' || pathname === '/signup';

  const isProtectedPath =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/');

  if (isProtectedPath && !sessionUser) {
    const redirectUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  const isAdminPath =
    pathname === '/dashboard/team' ||
    pathname.startsWith('/dashboard/team/');

  if (isAdminPath && (!sessionUser || sessionUser.role !== 'ADMIN')) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPath && sessionUser) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/jobs/:path*',
    '/candidates/:path*',
    '/results/:path*',
  ],
};
