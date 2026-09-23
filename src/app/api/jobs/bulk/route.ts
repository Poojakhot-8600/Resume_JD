import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { generateMockDataForJob } from '@/utils/mockGenerator';
import { serializeBigInt } from '@/utils/serialize';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobs, customWebhookUrl } = await req.json();

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const secret = process.env.N8N_SHARED_SECRET || 'super-secret-key';
    const webhookUrl = process.env.N8N_JD_WEBHOOK_URL;
    const activeWebhookUrl = customWebhookUrl || webhookUrl;

    // If Job Webhook is configured, forward the parsed CSV rows directly to n8n
    if (activeWebhookUrl) {
      console.log(`[API jobs/bulk] Forwarding bulk jobs to n8n webhook: ${activeWebhookUrl}`);
      try {
        const response = await fetch(activeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': secret,
            'x-selected-label': 'JDInfo',
            'selectedLabel': 'JDInfo',
          },
          body: JSON.stringify(jobs.map((j: any) => ({
            Position_ID: j.Position_ID?.toString() || `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            "Job Title": j['Job Title'] || j.title || 'Untitled Position',
            "JD": j.JD || j.jdText || ''
          })))
        });

        let resData: any = {};
        try {
          resData = await response.json();
        } catch (_) {}

        return NextResponse.json(serializeBigInt({
          success: true,
          message: resData.message || 'Jobs forwarded to n8n workflow successfully.',
          n8nResponse: resData
        }));
      } catch (err: any) {
        console.error('[API jobs/bulk] Failed to forward jobs to n8n:', err);
        return NextResponse.json({ error: 'Failed to contact n8n job upload webhook.' }, { status: 502 });
      }
    }

    const createdCount = [];

    for (const job of jobs) {
      const title = job['Job Title'] || 'Untitled Job';
      const experience = job.Experience || 'Not Specified';
      
      const finalPositionId = job.Position_ID 
        ? BigInt(parseInt(job.Position_ID.toString(), 10)) 
        : BigInt(Math.floor(10000000 + Math.random() * 90000000));

      // Check if job with this positionId or title already exists in company
      const existing = await prisma.job.findFirst({
        where: {
          OR: [
            { id: finalPositionId },
            { title, createdBy: user.id }
          ]
        }
      });

      if (existing) {
        continue;
      }

      const dbJob = await prisma.job.create({
        data: {
          id: finalPositionId,
          title,
          department: job.Department || 'General',
          location: job.Location || 'Remote',
          experience,
          status: 'PROCESSING',
          jdRawText: job.JD || '',
          createdBy: user.id,
        },
      });

      // Synchronously generate mock questions & evaluation answers
      await generateMockDataForJob(dbJob.id, dbJob.title || '', dbJob.experience || 'Not Specified');
      createdCount.push(dbJob.id);
    }

    return NextResponse.json(serializeBigInt({ success: true, count: createdCount.length }));
  } catch (error: any) {
    console.error('Error in bulk job creation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
