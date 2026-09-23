import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { sendAssessmentInviteEmail } from '@/services/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch candidate and job info
    const candidate = await prisma.candidate.findFirst({
      where: { id },
      include: { job: { select: { title: true } } },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    let assessmentToken = candidate.assessmentToken;
    if (!assessmentToken) {
      assessmentToken = crypto.randomUUID();
      await prisma.candidate.update({
        where: { id },
        data: {
          assessmentToken,
          assessmentStatus: 'INVITED',
          inviteSentAt: new Date(),
        },
      });
    }

    // Dispatch email invitation again
    await sendAssessmentInviteEmail({
      candidateEmail: candidate.email,
      candidateName: `${candidate.fname} ${candidate.lname}`.trim(),
      jobTitle: candidate.job?.title || candidate.currentJobTitle || '',
      token: assessmentToken,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resending candidate invitation email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
