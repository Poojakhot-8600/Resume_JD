import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { sendAssessmentInviteEmail } from '@/services/email';
import { serializeBigInt } from '@/utils/serialize';
import { assertJobOwnership, AuthorizationError, NotFoundError } from '@/services/authz';
import crypto from 'crypto';

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

    // jobId can be either a BigInt ID string (e.g. "1100112") or a job_code string (e.g. "JOB-1100112")
    // Try to find job by job_code first, then fall back to numeric ID
    let job = await prisma.job.findFirst({ where: { jobCode: jobId.toString() } });
    if (!job) {
      const numericId = parseInt(jobId.toString(), 10);
      if (!isNaN(numericId)) {
        job = await prisma.job.findUnique({ where: { id: BigInt(numericId) } });
      }
    }

    if (!job) {
      return NextResponse.json({ error: `Job not found: ${jobId}` }, { status: 404 });
    }

    // Verify caller has ownership (or is ADMIN)
    await assertJobOwnership(job.id, user);

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

    // Create candidate record — link via positionId (BigInt FK to job_descriptions.id)
    const candidate = await prisma.candidate.create({
      data: {
        positionId: job.id,
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
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error inviting candidate:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
