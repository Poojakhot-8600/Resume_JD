import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { z } from 'zod';

const jdCompleteSchema = z.object({
  jobId: z.string(),
  requestId: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      topic: z.string(),
      options: z.array(z.string()).optional(),
      answer: z.string().optional(),
    })
  ).min(1),
  parsedJDData: z.object({
    skills: z.array(z.string()),
    mustHave: z.array(z.string()),
    goodToHave: z.array(z.string()),
    experience: z.string(),
    seniority: z.string(),
    topics: z.array(z.string()),
    weights: z.record(z.string(), z.number()),
  }),
});

export async function POST(request: Request) {
  try {
    // 1. Shared secret authentication check
    const webhookSecret = process.env.N8N_SHARED_SECRET || 'super-secret-key';
    const clientSecret = request.headers.get('x-webhook-secret') || request.headers.get('x-n8n-secret');

    if (!clientSecret || clientSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
    }

    // 2. Validate request payload using Zod
    const body = await request.json();
    const result = jdCompleteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload format.', details: result.error.format() }, { status: 400 });
    }

    const { jobId, requestId, questions, parsedJDData } = result.data;
    const positionId = BigInt(jobId);

    // 3. Retrieve target Job
    const job = await prisma.job.findUnique({
      where: { id: positionId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Target Job not found.' }, { status: 404 });
    }

    // 4. Idempotency Check: prevent duplicate inserts if n8n retries the webhook
    const existingQuestionsCount = await (prisma as any).questionBank.count({
      where: { positionId },
    });

    if (existingQuestionsCount > 0 || job.status === 'ACTIVE') {
      console.log(`[Webhook jd-complete] Idempotency triggered. Job ${jobId} already processed.`);
      return NextResponse.json({
        success: true,
        message: 'Job questions already processed and populated.',
      });
    }

    // 5. Write generated question batch to QuestionBank
    await (prisma as any).questionBank.createMany({
      data: questions.map((q) => ({
        positionId,
        question: q.question,
        topic: q.topic,
        options: q.options || null,
        answer: q.answer || null,
      })),
    });

    // 6. Update Job parsed information and status to ACTIVE
    await prisma.job.update({
      where: { id: positionId },
      data: {
        skills: parsedJDData.skills,
        mustHave: parsedJDData.mustHave,
        goodToHave: parsedJDData.goodToHave,
        experience: parsedJDData.experience,
        seniority: parsedJDData.seniority,
        topics: parsedJDData.topics,
        weights: parsedJDData.weights,
        status: 'ACTIVE',
      },
    });

    console.log(`[Webhook jd-complete] Job ${jobId} populated successfully with ${questions.length} questions.`);

    return NextResponse.json({
      success: true,
      message: 'Question pool populated and Job is active.',
    });
  } catch (error: any) {
    console.error('Error processing n8n jd-complete webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
