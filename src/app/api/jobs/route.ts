import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { serializeBigInt } from '@/utils/serialize';
import { getJobScope } from '@/services/authz';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tenant-isolated query: ADMIN sees all, RECRUITER sees only their own jobs
    const scope = getJobScope(user);

    const jobs = await prisma.job.findMany({
      where: scope,
      include: {
        _count: {
          select: { candidates: true, questions: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Auto-populate mock questions for any PROCESSING or empty jobs on-the-fly in development
    const webhookUrl = process.env.N8N_JD_WEBHOOK_URL;
    if (!webhookUrl) {
      const { generateMockDataForJob } = await import('@/utils/mockGenerator');
      let didUpdate = false;
      for (const job of jobs) {
        if (job.status === 'PROCESSING' || job._count.questions === 0) {
          console.log(`[API jobs] Auto-generating mock details for list job: ${job.id}`);
          await generateMockDataForJob(job.id, job.title || '', job.experience || 'Not Specified');
          didUpdate = true;
        }
      }

      if (didUpdate) {
        const updatedJobs = await prisma.job.findMany({
          where: scope,
          include: {
            _count: {
              select: { candidates: true, questions: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        return NextResponse.json(serializeBigInt({ success: true, jobs: updatedJobs }));
      }
    }

    return NextResponse.json(serializeBigInt({ success: true, jobs }));
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
