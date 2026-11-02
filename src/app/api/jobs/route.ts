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

    return NextResponse.json(serializeBigInt({ success: true, jobs }));
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
