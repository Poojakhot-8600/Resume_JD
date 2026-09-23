import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { getCurrentUser } from '@/utils/auth';
import { z } from 'zod';
import { serializeBigInt } from '@/utils/serialize';

const importJobItemSchema = z.object({
  positionId: z.any().optional(),
  title: z.string().min(2),
  department: z.string().min(2),
  location: z.string().min(2),
  experience: z.string().min(1),
  jdText: z.string().min(10),
});

const importRequestSchema = z.object({
  jobs: z.array(importJobItemSchema).min(1, 'At least one job description is required.'),
  duplicateStrategy: z.enum(['skip', 'override']),
  customWebhookUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = importRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid import payload.', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { jobs, duplicateStrategy, customWebhookUrl } = validation.data;

    const secret = process.env.N8N_SHARED_SECRET || 'super-secret-key';
    const webhookUrl = process.env.N8N_JD_WEBHOOK_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const activeWebhookUrl = customWebhookUrl || webhookUrl;

    // If n8n Job Webhook is configured, forward the entire array to n8n directly
    if (activeWebhookUrl) {
      console.log(`[API jobs/import] Forwarding bulk jobs to n8n webhook: ${activeWebhookUrl}`);
      try {
        const response = await fetch(activeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': secret,
            'x-selected-label': 'JDInfo',
            'selectedLabel': 'JDInfo',
          },
          body: JSON.stringify(jobs.map((j) => ({
            Position_ID: j.positionId?.toString() || j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000),
            "Job Title": j.title,
            "JD": j.jdText
          })))
        });

        let resData: any = {};
        try {
          resData = await response.json();
        } catch (_) { }

        return NextResponse.json(serializeBigInt({
          success: true,
          message: resData.message || 'Jobs forwarded to n8n workflow successfully.',
          n8nResponse: resData
        }));
      } catch (err: any) {
        console.error('[API jobs/import] Failed to forward jobs to n8n:', err);
        return NextResponse.json({ error: 'Failed to contact n8n job upload webhook.' }, { status: 502 });
      }
    }

    let newlyAdded = 0;
    let overridden = 0;
    let skippedDuplicates = 0;

    for (const jobItem of jobs) {
      const { positionId, title, department, location, experience, jdText } = jobItem;
      const finalPositionId = positionId 
        ? BigInt(parseInt(positionId.toString(), 10)) 
        : BigInt(Math.floor(10000000 + Math.random() * 90000000));

      // Check if job with exact same title and department OR positionId already exists
      const existingJob = await prisma.job.findFirst({
        where: {
          OR: [
            { id: finalPositionId },
            { title, department, createdBy: user.id }
          ]
        },
      });

      if (existingJob) {
        if (duplicateStrategy === 'skip') {
          skippedDuplicates++;
          continue;
        } else {
          // Override: Update existing record, reset questions and set to PROCESSING
          await prisma.job.update({
            where: { id: existingJob.id },
            data: {
              location,
              experience,
              jdRawText: jdText,
              status: 'PROCESSING',
            },
          });

          // Delete existing parsed questions to let n8n rebuild them
          await (prisma as any).questionBank.deleteMany({
            where: { positionId: existingJob.id },
          });

          overridden++;

          // Trigger n8n async parsing for the updated job
          triggerAsyncParsing(existingJob.id, title, jdText, experience, secret, webhookUrl, appUrl);
        }
      } else {
        // Create new Job in initial PROCESSING status
        const newJob = await prisma.job.create({
          data: {
            id: finalPositionId,
            title,
            department,
            location,
            experience,
            jdRawText: jdText,
            createdBy: user.id,
            status: 'PROCESSING',
          },
        });

        newlyAdded++;

        // Trigger n8n async parsing for the new job
        triggerAsyncParsing(newJob.id, title, jdText, experience, secret, webhookUrl, appUrl);
      }
    }

    return NextResponse.json(serializeBigInt({
      success: true,
      stats: {
        total: jobs.length,
        newlyAdded,
        overridden,
        skippedDuplicates,
      },
    }));
  } catch (error: any) {
    console.error('Error importing jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Private helper to trigger n8n or mock parser in background
function triggerAsyncParsing(
  jobId: bigint,
  title: string,
  jdRawText: string,
  experience: string,
  secret: string,
  webhookUrl: string | undefined,
  appUrl: string
) {
  const requestId = crypto.randomUUID();

  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
        'x-selected-label': 'JDInfo',
        'selectedLabel': 'JDInfo',
      },
      body: JSON.stringify({
        requestId,
        jobId: jobId.toString(),
        title,
        jdRawText,
        jdFileUrl: null,
      }),
    }).catch((err) => {
      console.error(`[Import Async Trigger] n8n webhook failed for Job ${jobId}:`, err);
    });
  } else {
    // Simulate callback async local parsing in background
    setTimeout(async () => {
      try {
        const mockQuestions = [
          { question: `Describe a complex feature you built using React for a ${title} position.`, topic: 'System Architecture' },
          { question: `What are your best-practice strategies for database schema design and migrations in this ${title} role?`, topic: 'Database & ORMs' },
          { question: `Explain how you approach error handling, validation, and security protocols in ${title} backend services.`, topic: 'API Implementation' },
        ];
        const mockJDData = {
          skills: ['TypeScript', 'React', 'Prisma'],
          mustHave: [`Experience in a ${title} position`],
          goodToHave: ['Good communication skills'],
          experience,
          seniority: 'Mid-Level',
          topics: ['System Architecture', 'Database & ORMs', 'API Implementation'],
          weights: { TypeScript: 40, React: 30, Prisma: 30 }
        };

        await fetch(`${appUrl}/api/webhooks/n8n/jd-complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': secret,
          },
          body: JSON.stringify({
            jobId: jobId.toString(),
            requestId: 'mock-import-request',
            questions: mockQuestions,
            parsedJDData: mockJDData,
          }),
        });
      } catch (err) {
        console.error('[Import Dev Simulation] Failed mock callback trigger:', err);
      }
    }, 2000);
  }
}
