import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { signJWT } from '@/utils/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string(),
  password: z.string().min(1, 'Password is required'),
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

    // Search user record
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    // Validate password match
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    // Sign session token payload
    const token = await signJWT({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Set secure HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Custom Login API error:', error);
    const detail = error?.message || 'An unexpected authentication error occurred.';
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? `Database/Server Error: ${detail}`
            : 'An unexpected authentication error occurred.',
      },
      { status: 500 }
    );
  }
}
