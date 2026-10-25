import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    const cookieOpts = getAuthCookieOptions(request, 0);
    const cookieStore = await cookies();

    // Clear session cookie in cookieStore
    cookieStore.set(cookieOpts.name, '', {
      ...cookieOpts,
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

    // Also clear cookie on response directly to ensure client browser drops it
    response.cookies.set(cookieOpts.name, '', {
      ...cookieOpts,
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
