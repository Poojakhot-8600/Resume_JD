import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { z } from 'zod';
import { generateMockDataForJob } from '@/utils/mockGenerator';
import { serializeBigInt } from '@/utils/serialize';

const uploadSchema = z.object({
  positionId: z.number().int().positive().optional(),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  department: z.string().min(2, 'Department is required'),
  location: z.string().min(2, 'Location is required'),
  experience: z.string().min(1, 'Experience is required'),
  jdText: z.string().min(10, 'Job description raw text is too short'),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = uploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed.', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { positionId, title, department, location, experience, jdText } = validation.data;
    const finalPositionId = positionId 
      ? BigInt(positionId) 
      : BigInt(Math.floor(10000000 + Math.random() * 90000000));

    // Create Job in initial PROCESSING status
    const job = await prisma.job.create({
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

    const requestId = crypto.randomUUID();
    const webhookUrl = process.env.N8N_JD_WEBHOOK_URL;
    const secret = process.env.N8N_SHARED_SECRET || 'super-secret-key';

    if (webhookUrl) {
      // Async trigger to n8n (non-blocking)
      console.log(`[API jobs/upload] POST to n8n async webhook: ${webhookUrl}`);
      
      // Fire-and-forget call so we don't timeout the client connection
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
          jobId: job.id.toString(), // Convert BigInt to string for n8n
          title,
          jdRawText: jdText,
          jdFileUrl: null, // Optional, can be empty
        }),
      }).catch((err) => {
        console.error('[API jobs/upload] n8n webhook execution failed in background:', err);
      });
    } else {
      // Dev Simulation Fallback: Populate mock details and candidate evaluations synchronously
      console.log('[API jobs/upload] No N8N_JD_WEBHOOK_URL defined. Generating mock details and candidates synchronously...');
      await generateMockDataForJob(job.id, title, experience);
    }

    return NextResponse.json(serializeBigInt({ success: true, job }));
  } catch (error: any) {
    console.error('Error creating and parsing job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
