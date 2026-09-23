import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';

// Lightweight IP Rate Limiter
const ipCache = new Map<string, { count: number; lastReset: number }>();

function isRateLimited(ip: string, limit = 30, windowMs = 60000): boolean {
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

export async function GET(request: Request) {
  try {
    // 1. IP rate limit check
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { assessmentToken: token },
      include: {
        job: { select: { title: true } },
        assessments: true,
        booking: {
          include: {
            slot: true,
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Invalid assessment token.' }, { status: 404 });
    }

    const now = new Date();
    let isWindowActive = false;
    let isBeforeWindow = false;
    let isAfterWindow = false;
    let slotStart: Date | null = null;
    let slotEnd: Date | null = null;

    if (candidate.booking && candidate.booking.slot) {
      const slot = candidate.booking.slot;
      slotStart = slot.startTime;
      slotEnd = slot.endTime;
      isWindowActive = now >= slot.startTime && now <= slot.endTime;
      isBeforeWindow = now < slot.startTime;
      isAfterWindow = now > slot.endTime;
    }

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.assessmentStatus,
        jobTitle: candidate.job?.title || candidate.currentJobTitle || 'Candidate Assessment',
        slotStart,
        slotEnd,
        isWindowActive,
        isBeforeWindow,
        isAfterWindow,
      },
      assessment: candidate.assessments[0] || null,
    });
  } catch (error: any) {
    console.error('Error validating assessment token:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
