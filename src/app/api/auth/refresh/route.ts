import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import {
  verifyJWT,
  signJWT,
  getAuthCookieOptions,
  COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_MAX_HOURS,
} from '@/utils/auth';
import { prisma } from '@/database/db';

export async function POST(request: Request) {
  try {
    let token: string | undefined;

    // 1. Try request Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Try request cookie
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      if (match) token = decodeURIComponent(match[1]);
    }

    // 3. Try Next.js cookieStore
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(COOKIE_NAME)?.value;
      } catch {}
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No active session token provided to refresh.' },
        { status: 401 }
      );
    }

    // Verify current token
    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Session has expired or is invalid. Please sign in again.' },
        { status: 401 }
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const authTime = payload.auth_time || nowSec;

    // Enforce absolute session lifespan cap (SESSION_MAX_HOURS)
    if (nowSec - authTime >= SESSION_MAX_HOURS * 3600) {
      return NextResponse.json(
        {
          error: `Maximum session lifespan of ${SESSION_MAX_HOURS} hours exceeded. Please sign in again.`,
        },
        { status: 401 }
      );
    }

    // Fetch user details or use payload
    let userName = payload.name;
    let userRole = payload.role;
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { name: true, role: true },
      });
      if (user) {
        userName = user.name;
        userRole = user.role;
      }
    } catch {}

    // Sign new token with refreshed sliding expiration keeping original auth_time
    const newToken = await signJWT(
      {
        id: payload.id,
        name: userName,
        email: payload.email,
        role: userRole,
        auth_time: authTime,
      },
      SESSION_IDLE_TIMEOUT_MINUTES,
      authTime
    );

    // Set updated cookie
    const cookieOpts = getAuthCookieOptions(request);
    const cookieStore = await cookies();
    cookieStore.set(cookieOpts.name, newToken, cookieOpts);

    const response = NextResponse.json(
      {
        success: true,
        token: newToken,
        auth_time: authTime,
        expiresInSeconds: SESSION_IDLE_TIMEOUT_MINUTES * 60,
        user: {
          id: payload.id,
          name: userName,
          email: payload.email,
          role: userRole,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    response.cookies.set(cookieOpts.name, newToken, cookieOpts);

    return response;
  } catch (error: any) {
    console.error('Session refresh API error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session.' },
      { status: 500 }
    );
  }
}
