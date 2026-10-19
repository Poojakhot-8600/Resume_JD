import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { pool } from '@/database/db';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import * as z from 'zod';

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = resetSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verify token
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (
        payload.email !== normalizedEmail ||
        payload.purpose !== 'password_recovery'
      ) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token. Please request a new link.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new link.' },
        { status: 400 }
      );
    }

    // 2. Hash new password
    const newHash = await bcrypt.hash(password, 10);
    const now = new Date();

    // 3. Update in Supabase auth.users (the source of truth)
    await pool.query(
      `
      UPDATE auth.users 
      SET encrypted_password = $1, 
          recovery_token = '', 
          recovery_sent_at = NULL, 
          updated_at = $2 
      WHERE email = $3
    `,
      [newHash, now, normalizedEmail]
    );

    // 4. Update in public."User" table
    await prisma.user.updateMany({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully! You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
