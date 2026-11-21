import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { serializeBigInt } from '@/utils/serialize';
import { getJobScope } from '@/services/authz';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get('scope');
    const onlyMine = scopeParam === 'mine';

    // Role-based scope: ADMIN sees all jobs by default; RECRUITER strictly sees own jobs
    const scope = getJobScope(user, { onlyMine });

    const jobs = await prisma.job.findMany({
      where: scope,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
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
