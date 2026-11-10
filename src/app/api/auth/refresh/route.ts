import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { verifyJWT, signAccessToken, isRequestSecure } from '@/utils/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    let refreshToken: string | undefined;

    // 1. Check direct Authorization / x-refresh-token headers
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      refreshToken = authHeader.substring(7).trim();
    }
    if (!refreshToken) {
      refreshToken = request.headers.get('x-refresh-token') || undefined;
    }

    // 2. Check cookies
    if (!refreshToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/);
      if (match) refreshToken = decodeURIComponent(match[1]);
    }
    if (!refreshToken) {
      try {
        const cookieStore = await cookies();
        refreshToken = cookieStore.get('refresh_token')?.value;
      } catch { }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is missing.' },
        { status: 401 }
      );
    }

    // 3. Cryptographically verify refresh token
    const payload = await verifyJWT(refreshToken);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token. Please sign in again.' },
        { status: 401 }
      );
    }

    // 4. Verify user exists and retrieve current database record
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User account not found or has been deactivated.' },
        { status: 401 }
      );
    }

    // 5. Issue new short-lived Access Token (1 hour)
    const newAccessToken = await signAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const secure = isRequestSecure(request);
    const cookieStore = await cookies();

    cookieStore.set({
      name: 'auth_token',
      value: newAccessToken,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    const response = NextResponse.json({
      success: true,
      token: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'auth_token',
      value: newAccessToken,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh authentication session.' },
      { status: 500 }
    );
  }
}
