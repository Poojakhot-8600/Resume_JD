import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { sendShortlistInviteEmail } from '@/services/email';
import { assertCandidateOwnership, AuthorizationError, NotFoundError } from '@/services/authz';

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

    // Enforce candidate ownership derived from parent job
    const candidate = await assertCandidateOwnership(id, user);

    let assessmentToken = candidate.assessmentToken;
    if (!assessmentToken) {
      assessmentToken = crypto.randomUUID();
      await prisma.candidate.update({
        where: { id },
        data: {
          assessmentToken,
          inviteSentAt: new Date(),
        },
      });
    }

    // Shortlist candidate
    await prisma.candidate.update({
      where: { id },
      data: {
        assessmentStatus: 'SHORTLISTED',
      },
    });

    // Send congratulations & booking slot email
    await sendShortlistInviteEmail({
      candidateEmail: candidate.email ?? '',
      candidateName: `${candidate.fname ?? ''} ${candidate.lname ?? ''}`.trim(),
      jobTitle: candidate.job?.title || candidate.currentJobTitle || '',
      token: assessmentToken,
    });

    return NextResponse.json({ success: true, message: 'Candidate shortlisted successfully.' });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error shortlisting candidate:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
