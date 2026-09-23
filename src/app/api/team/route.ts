import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { getCurrentUser } from '@/utils/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createHRUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'RECRUITER']).default('RECRUITER'),
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    // Retrieve all user accounts, sorting admins first then alphabetically by name
    const users = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' }, // ADMIN comes before RECRUITER alphabetically (A before R)
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching team list:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createHRUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed.', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    console.log(`[Admin Panel] New HR/Recruiter account created: ${email}`);

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Error creating HR user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
