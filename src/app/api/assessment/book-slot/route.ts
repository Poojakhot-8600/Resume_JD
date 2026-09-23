import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { sendBookingConfirmationEmail } from '@/services/email';
import { z } from 'zod';

const bookingSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  slotId: z.string().min(1, 'Slot selection is required'),
});

// Lightweight IP Rate Limiter
const ipCache = new Map<string, { count: number; lastReset: number }>();

function isRateLimited(ip: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const data = ipCache.get(ip) || { count: 0, lastReset: now };

  if (now - data.lastReset > windowMs) {
    data.count = 1;
    data.lastReset = now;
  } else {
    data.count += 1;
  }
  ipCache.set(ip, data);

  return data.count > limit;
}

export async function POST(request: Request) {
  try {
    // 1. IP rate limit check
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Validate inputs
    const body = await request.json();
    const validation = bookingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid booking details.', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { token, slotId } = validation.data;

    // 3. Find candidate and verify status
    const candidate = await prisma.candidate.findUnique({
      where: { assessmentToken: token },
      include: {
        job: { select: { title: true } },
        booking: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Invalid candidate assessment link.' }, { status: 404 });
    }

    if (candidate.assessmentStatus !== 'SHORTLISTED') {
      if (candidate.assessmentStatus === 'SCHEDULED' || candidate.booking) {
        return NextResponse.json(
          { error: 'Candidate has already scheduled their assessment slot.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Candidate is not in a state to book an assessment slot.' },
        { status: 400 }
      );
    }

    // 4. Retrieve and validate Slot
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot || slot.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Selected slot is not active or not found.' }, { status: 400 });
    }

    if (slot.bookedCount >= slot.capacity) {
      return NextResponse.json({ error: 'Selected slot is fully booked.' }, { status: 400 });
    }

    const now = new Date();
    if (slot.endTime <= now) {
      return NextResponse.json({ error: 'Selected slot window has already expired.' }, { status: 400 });
    }

    // 5. Transaction: Increment bookedCount, create booking and update candidate status
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify bookedCount under lock
      const lockedSlot = await tx.slot.findUnique({
        where: { id: slotId },
      });

      if (!lockedSlot || lockedSlot.bookedCount >= lockedSlot.capacity) {
        throw new Error('Slot filled up. Please select a different slot.');
      }

      // Increment count
      await tx.slot.update({
        where: { id: slotId },
        data: { bookedCount: { increment: 1 } },
      });

      // Create Booking
      const booking = await tx.slotBooking.create({
        data: {
          candidateId: candidate.id,
          slotId: slot.id,
        },
      });

      // Update candidate status
      await tx.candidate.update({
        where: { id: candidate.id },
        data: { assessmentStatus: 'SCHEDULED' },
      });

      return booking;
    });

    // 6. Send Confirmation Email
    await sendBookingConfirmationEmail({
      candidateEmail: candidate.email,
      candidateName: `${candidate.fname} ${candidate.lname}`.trim(),
      jobTitle: candidate.job?.title || candidate.currentJobTitle || '',
      startTime: slot.startTime,
      endTime: slot.endTime,
      token: candidate.assessmentToken || '',
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment slot booked successfully.',
      booking: result,
    });
  } catch (error: any) {
    console.error('Error booking slot:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
