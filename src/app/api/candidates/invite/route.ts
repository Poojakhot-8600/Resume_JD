import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { sendAssessmentInviteEmail } from '@/services/email';
import { serializeBigInt } from '@/utils/serialize';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, jobId, assessmentToken: reqToken, assessmentStatus: reqStatus } = body;

    if (!name || !email || !jobId) {
      return NextResponse.json({ error: 'Name, email, and job are required.' }, { status: 400 });
    }

    const positionId = BigInt(parseInt(jobId.toString(), 10));

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: positionId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Selected job position not found.' }, { status: 404 });
    }

    // Generate unique unguessable token unless explicitly null/empty
    const assessmentToken = (reqToken === null || reqToken === '') ? null : (reqToken || crypto.randomUUID());

    // Determine status: explicitly null/empty or fallback to status or INVITED
    const assessmentStatus = (reqStatus === null || reqStatus === '') 
      ? null 
      : (reqStatus || (assessmentToken ? 'INVITED' : null));

    const nameParts = name.trim().split(/\s+/);
    const fname = nameParts[0] || '';
    const lname = nameParts.slice(1).join(' ') || '.';
    const candidateId = Math.floor(100000 + Math.random() * 900000).toString();

    // Create candidate record
    const candidate = await prisma.candidate.create({
      data: {
        positionId,
        candidateId,
        fname,
        lname,
        email,
        phone: phone || null,
        assessmentStatus: assessmentStatus as any,
        assessmentToken,
        inviteSentAt: (assessmentToken ? new Date() : null) as any,
      },
    });

    // Send invitation email if token is present
    if (assessmentToken) {
      await sendAssessmentInviteEmail({
        candidateEmail: email,
        candidateName: name,
        jobTitle: job.title || '',
        token: assessmentToken,
      });
    }

    return NextResponse.json(serializeBigInt({ success: true, candidate }));
  } catch (error: any) {
    console.error('Error inviting candidate:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
