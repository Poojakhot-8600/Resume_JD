import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { evaluateAssessment } from '@/services/n8n';
import { z } from 'zod';

const submitSchema = z.object({
  token: z.string().min(1),
  answers: z.record(z.string(), z.string()),
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
    const validation = submitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Token and answers are required.' },
        { status: 400 }
      );
    }

    const { token, answers } = validation.data;

    // 3. Retrieve candidate and existing assessment record
    const candidate = await prisma.candidate.findUnique({
      where: { assessmentToken: token },
      include: {
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

    // 4. Secure single-submission enforcement (Return 400, not 200)
    if (
      candidate.assessmentStatus === 'COMPLETED' ||
      candidate.assessmentStatus === 'EVALUATED'
    ) {
      return NextResponse.json(
        { error: 'Assessment has already been completed and submitted.' },
        { status: 400 }
      );
    }

    // 5. Server-Side Slot Time-Window Check
    if (!candidate.booking || !candidate.booking.slot) {
      return NextResponse.json(
        { error: 'No booked assessment slot found for this candidate.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const slot = candidate.booking.slot;

    // Reject if too early
    if (now < slot.startTime) {
      return NextResponse.json(
        { error: 'Assessment slot has not opened yet.' },
        { status: 400 }
      );
    }

    // Allow up to a 5-minute grace period buffer for network transit lag
    const maxAllowedTime = new Date(slot.endTime.getTime() + 5 * 60 * 1000);
    if (now > maxAllowedTime) {
      return NextResponse.json(
        { error: 'Assessment submission window has expired.' },
        { status: 400 }
      );
    }

    const assessment = candidate.assessments[0];

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment details not found.' }, { status: 404 });
    }

    // 6. Save candidate answers first to database (safekeeping)
    const completedAt = new Date();
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        answers: answers as any,
        completedAt,
      },
    });

    // 7. Update candidate status to COMPLETED
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { assessmentStatus: 'COMPLETED' },
    });

    // 8. Call AI evaluator webhook (n8n or mock grading engine)
    try {
      console.log(`[API assessment/submit] Evaluating responses for candidate ${candidate.name}...`);
      const evaluation = await evaluateAssessment({
        jobId: candidate.positionId.toString(),
        candidateId: candidate.id,
        questions: assessment.questions as any[],
        answers: answers as Record<string, string>,
      });

      console.log('[API assessment/submit] AI Grading completed:', evaluation);

      // Save scoring details to DB
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          score: evaluation.score,
          percentage: evaluation.percentage,
          evaluationData: evaluation.evaluationData as any,
        },
      });

      // Update candidate status to EVALUATED
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { assessmentStatus: 'EVALUATED' },
      });
    } catch (evalErr) {
      console.error(
        '[API assessment/submit] AI evaluation failed or webhook timed out:',
        evalErr
      );
      // Do not fail the candidate's HTTP request; their answers are saved.
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing assessment submission:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
