import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { getCurrentUser } from '@/utils/auth';
import { z } from 'zod';

const slotCreateSchema = z.object({
  startTime: z.string().transform((v) => new Date(v)),
  endTime: z.string().transform((v) => new Date(v)),
  capacity: z.number().int().min(1),
});

export async function GET() {
  try {
    const slots = await prisma.slot.findMany({
      orderBy: { startTime: 'asc' },
    });
    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = slotCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid slot parameters.', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { startTime, endTime, capacity } = validation.data;

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'Start time must be before end time.' },
        { status: 400 }
      );
    }

    const slot = await prisma.slot.create({
      data: {
        startTime,
        endTime,
        capacity,
        bookedCount: 0,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, slot });
  } catch (error: any) {
    console.error('Error creating slot:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
