import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { candidateId, score, percentage, evaluationData } = body;

    if (
      !candidateId ||
      score === undefined ||
      percentage === undefined ||
      !evaluationData
    ) {
      return NextResponse.json(
        { error: 'candidateId, score, percentage, and evaluationData are required.' },
        { status: 400 }
      );
    }

    // Find corresponding assessment
    const assessment = await prisma.assessment.findUnique({
      where: { candidateId },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment record not found.' }, { status: 404 });
    }

    // Update scoring details
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        score,
        percentage,
        evaluationData: evaluationData as any,
      },
    });

    // Mark candidate as EVALUATED
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { assessmentStatus: 'EVALUATED' },
    });

    console.log(
      `[n8n Callback API] Successfully processed async grading callback for candidate: ${candidateId}`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in n8n grading callback API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
