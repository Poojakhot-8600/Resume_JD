import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { signJWT, isRequestSecure } from '@/utils/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import * as z from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = signupSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parseResult.data;

    // Check if email already exists in DB
    let user = await prisma.user.findUnique({
      where: { email },
    });

    const hashed = await bcrypt.hash(password, 10);

    if (user) {
      // If user exists and has a passwordHash, they are already registered
      if (user.passwordHash) {
        return NextResponse.json(
          { error: 'Email address is already registered.' },
          { status: 400 }
        );
      } else {
        // If it was seeded without a passwordHash, update it with the credentials
        user = await prisma.user.update({
          where: { email },
          data: {
            name,
            passwordHash: hashed,
          },
        });
      }
    } else {
      // Create a brand new recruiter user profile
      const userCount = await prisma.user.count();
      const finalRole = userCount === 0 ? 'ADMIN' : 'RECRUITER';

      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: hashed,
          role: finalRole,
        },
      });
    }

    // Automatically sync new account into Supabase auth.users
    try {
      const { syncUserToSupabaseAuth } = await import('@/utils/supabase/syncUser');
      await syncUserToSupabaseAuth({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: hashed,
      });
    } catch (syncErr) {
      console.warn('Auto-sync to Supabase auth.users warning:', syncErr);
    }

    // Sign session token payload
    const token = await signJWT({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Set secure HTTP-only session cookie on both cookieStore and response
    const secure = isRequestSecure(request);
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Custom Signup API error:', error);
    const detail = error?.message || 'An unexpected signup error occurred.';
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? `Database/Server Error: ${detail}`
            : 'An unexpected signup error occurred.',
      },
      { status: 500 }
    );
  }
}
