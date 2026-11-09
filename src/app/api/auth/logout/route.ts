import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    const cookieOpts = getAuthCookieOptions(request, 0);
    const cookieStore = await cookies();

    // 1. Clear access token cookie in cookieStore
    cookieStore.set(cookieOpts.name, '', {
      ...cookieOpts,
      maxAge: 0,
      expires: new Date(0),
    });

    // 2. Clear refresh token cookie in cookieStore
    cookieStore.set({
      name: 'refresh_token',
      value: '',
      httpOnly: true,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    // 3. Clear cookies on response headers directly to ensure client browser drops them
    response.cookies.set(cookieOpts.name, '', {
      ...cookieOpts,
      maxAge: 0,
      expires: new Date(0),
    });

    response.cookies.set({
      name: 'refresh_token',
      value: '',
      httpOnly: true,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'An unexpected logout error occurred.' },
      { status: 500 }
    );
  }
}
