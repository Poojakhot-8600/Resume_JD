import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { serializeBigInt } from '@/utils/serialize';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidates = await prisma.candidate.findMany({
      include: {
        job: {
          select: { title: true },
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

    const serializedCandidates = serializeBigInt(candidates);
    return NextResponse.json({ success: true, candidates: serializedCandidates });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
