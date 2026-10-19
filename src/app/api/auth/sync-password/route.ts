import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { createClient } from '@/utils/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser || !authUser.email) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid recovery session required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { status: 400 }
      );
    }

    // Synchronize bcrypt hash in the public "User" table to match Supabase Auth
    const normalizedEmail = authUser.email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    });

    if (existingUser) {
      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: hashed,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Password sync error:', err);
    return NextResponse.json(
      { error: 'Failed to synchronize user record' },
      { status: 500 }
    );
  }
}
