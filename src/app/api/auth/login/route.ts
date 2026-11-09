import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { signJWT, signAccessToken, signRefreshToken, isRequestSecure } from '@/utils/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/server';
import { env } from '@/config/env';
import crypto from 'crypto';

const loginSchema = z.object({
  email: z
    .string({ message: 'Please enter your email address.' })
    .min(1, 'Please enter your email address.'),
  password: z
    .string({ message: 'Please enter your password.' })
    .min(1, 'Please enter your password.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Authenticate with Supabase Auth as the source of truth for login credentials
    let isAuthenticated = false;
    let authUser: any = null;

    try {
      const supabase = await createClient();
      const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!supabaseError && supabaseAuth?.user) {
        isAuthenticated = true;
        authUser = supabaseAuth.user;
      }
    } catch (supabaseErr) {
      console.warn('Supabase signInWithPassword check failed:', supabaseErr);
    }

    // 2. Fetch User table record (case-insensitive)
    let user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    });

    // Self-heal: auto-create admin user if missing in User table
    if (!user && normalizedEmail === env.defaultAdminEmail) {
      const defaultHash = await bcrypt.hash(env.defaultAdminPassword, 10);
      user = await prisma.user.create({
        data: {
          id: authUser?.id || crypto.randomUUID(),
          name: 'System Admin',
          email: env.defaultAdminEmail,
          passwordHash: defaultHash,
          role: 'ADMIN',
        },
      });
    }

    // 3. Fallback: Authenticate against local database bcrypt hash if not authenticated by Supabase
    if (!isAuthenticated && user && user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (isMatch) {
        isAuthenticated = true;
      }
    }

    // 4. Auto-create user record in Prisma if authenticated via Supabase but missing in DB
    if (isAuthenticated && !user && authUser) {
      const userCount = await prisma.user.count();
      const role = userCount === 0 || normalizedEmail === env.defaultAdminEmail ? 'ADMIN' : 'RECRUITER';
      const defaultHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          id: authUser.id,
          name: authUser.user_metadata?.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash: defaultHash,
          role,
        },
      });
    }

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    // Keep User record's passwordHash in sync if password was verified via Supabase Auth
    if (authUser && user) {
      const updatedHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: updatedHash },
      }).catch(() => { });
    }

    // Issue short-lived Access Token (1 hour) and long-lived Refresh Token (7 days)
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    // Set HTTP session cookies
    const secure = isRequestSecure(request);
    const cookieStore = await cookies();

    // 1. Access Token Cookie (1 hour)
    cookieStore.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    // 2. Refresh Token Cookie (7 days)
    cookieStore.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const response = NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Also set directly on response headers for edge compatibility
    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    response.cookies.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Custom Login API error:', error);
    return NextResponse.json(
      {
        error: 'An unexpected authentication error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
