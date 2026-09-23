import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { z } from 'zod';

const generateSchema = z.object({
  token: z.string().min(1),
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

    // 2. Validate body parameters
    const body = await request.json();
    const validation = generateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Token is required.' },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // 3. Find candidate and verify status
    const candidate = await prisma.candidate.findUnique({
      where: { assessmentToken: token },
      include: {
        job: true,
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

    // 4. Server-Side Slot Time-Window Check
    if (!candidate.booking || !candidate.booking.slot) {
      return NextResponse.json(
        { error: 'You must schedule an assessment slot before you can start the test.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const slot = candidate.booking.slot;

    if (now < slot.startTime) {
      return NextResponse.json(
        { error: `Assessment has not started yet. Your slot opens at ${slot.startTime.toLocaleString()}.` },
        { status: 400 }
      );
    }

    if (now > slot.endTime) {
      return NextResponse.json(
        { error: 'Assessment slot has already closed and expired.' },
        { status: 400 }
      );
    }

    // 5. Lock-in questions: Return existing assessment if already generated
    if (candidate.assessments.length > 0) {
      return NextResponse.json({
        success: true,
        assessment: candidate.assessments[0],
      });
    }

    // 6. Draw 20 random questions from Job's QuestionBank
    const questionPool = await prisma.questionBank.findMany({
      where: { positionId: candidate.positionId },
    });

    let selectedQuestions: { id: string; question: string; topic: string }[] = [];

    if (questionPool.length > 0) {
      // Shuffle pool and select up to 20
      const shuffled = [...questionPool].sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, 20).map((q) => ({
        id: q.id,
        question: q.question,
        topic: q.topic,
      }));
    } else {
      // Fallback: If QuestionBank is empty, use mock generator
      console.warn(`[API generate] QuestionBank is empty for job ${candidate.positionId.toString()}. Using mock questions fallback.`);
      const mockQuestions = [
        { id: 'mq1', question: `Describe a complex feature you built using React. What technical challenges did you face?`, topic: 'System Architecture' },
        { id: 'mq2', question: `What are your best-practice strategies for database schema design and migrations when working with SQL databases and Prisma?`, topic: 'Database & ORMs' },
        { id: 'mq3', question: `Explain how you approach error handling, input validation, and security protocols when designing backend API endpoints.`, topic: 'API Implementation' },
        { id: 'mq4', question: `How do you handle client-side vs. server-side state coordination? For example, using Zustand or React Context.`, topic: 'State Management' },
      ];
      selectedQuestions = mockQuestions;
    }

    // 7. Store locked-in questions in database
    const assessment = await prisma.assessment.create({
      data: {
        candidateId: candidate.id,
        jobId: candidate.positionId,
        questions: selectedQuestions as any,
        assignedQuestionIds: selectedQuestions.map((q) => q.id),
      },
    });

    // 8. Update candidate status to STARTED
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { assessmentStatus: 'STARTED' },
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    console.error('Error generating assessment questions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
