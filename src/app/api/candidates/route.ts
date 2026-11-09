import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { serializeBigInt } from '@/utils/serialize';
import { getCandidateScope } from '@/services/authz';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tenant-isolated query: ADMIN sees all candidates, RECRUITER sees only candidates from their owned jobs
    const scope = getCandidateScope(user);

    const candidates = await prisma.candidate.findMany({
      where: scope,
      include: {
        job: {
          select: { jobCode: true, title: true, createdBy: true },
        },
        assessments: {
          select: {
            score: true,
            percentage: true,
            questions: true,
            answers: true,
            evaluationData: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedCandidates = candidates.map((c: any) => ({
      ...c,
      name: `${c.fname || ''} ${c.lname || ''}`.trim() || c.fname || 'Unnamed Candidate',
      // Expose job_code as jobId for frontend compatibility
      jobId: c.job?.jobCode || (c.positionId ? String(c.positionId) : ''),
    }));

    const serializedCandidates = serializeBigInt(formattedCandidates);
    return NextResponse.json({ success: true, candidates: serializedCandidates });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
