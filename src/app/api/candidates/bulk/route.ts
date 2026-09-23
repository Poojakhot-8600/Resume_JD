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

    const { candidates, defaultJobId, customWebhookUrl } = await request.json();

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: candidates array is required.' }, { status: 400 });
    }

    const candidateWebhookUrl =
      process.env.N8N_CANDIDATE_RESUME_WEBHOOK_URL ||
      process.env.N8N_CANDIDATE_IMPORT_URL;
    const jobWebhookUrl = process.env.N8N_JD_WEBHOOK_URL;
    const secret = process.env.N8N_SHARED_SECRET || 'super-secret-key';
    
    // Fallback to Job Webhook if Candidate webhook is not explicitly configured
    const activeWebhookUrl = customWebhookUrl || candidateWebhookUrl || jobWebhookUrl;

    // If webhook URL is defined, forward parsed rows directly to n8n workflow
    if (activeWebhookUrl) {
      console.log(`[API candidates/bulk] Forwarding bulk candidates to n8n webhook: ${activeWebhookUrl}`);
      try {
        const response = await fetch(activeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': secret,
          },
          body: JSON.stringify(candidates.map((c: any) => {
            const fname = c.Candidate_FNAME || c.Candidate_Fname || c.fname || '';
            const lname = c.Candidate_LNAME || c.Candidate_Lname || c.lname || '';
            
            let finalFname = fname;
            let finalLname = lname;
            
            if (!finalFname) {
              const fullName = c.Name || c.name || c['Full Name'] || c['Candidate Name'] || '';
              const nameParts = fullName.trim().split(/\s+/);
              finalFname = nameParts[0] || '';
              finalLname = nameParts.slice(1).join(' ') || '.';
            }

            const rawPositionId = c.Position_ID || c.jobId || defaultJobId || '0';
            const rawCandidateId = c.Candidate_ID || Math.floor(100000 + Math.random() * 900000);
            
            const cleanCandidateIdStr = rawCandidateId.toString().replace(/\D/g, '');
            const candidateIdInt = parseInt(cleanCandidateIdStr, 10) || Math.floor(100000 + Math.random() * 900000);

            const rawToken = c.assessmentToken ?? c.AssessmentToken ?? c.token ?? c.Token;
            const rawStatus = c.assessmentStatus ?? c.AssessmentStatus ?? c.status ?? c.Status;

            const assessmentToken = (rawToken === null || rawToken === '' || rawToken === undefined || rawToken === 'null') 
              ? null 
              : rawToken.toString();

            const assessmentStatus = (rawStatus === null || rawStatus === '' || rawStatus === undefined || rawStatus === 'null')
              ? (assessmentToken ? 'INVITED' : null)
              : rawStatus.toString();

            return {
              Position_ID: parseInt(rawPositionId.toString(), 10),
              Candidate_ID: candidateIdInt,
              Candidate_FNAME: finalFname,
              Candidate_LNAME: finalLname || '.',
              Candidate_EMAIL: c.Candidate_EMAIL || c.candidateEmail || c.Email || c.email || '',
              assessmentToken,
              assessmentStatus
            };
          }))
        });

        let resData: any = {};
        try {
          resData = await response.json();
        } catch (_) {}

        return NextResponse.json(serializeBigInt({
          success: true,
          message: resData.message || 'Candidates forwarded to n8n workflow successfully.',
          n8nResponse: resData
        }));
      } catch (err: any) {
        console.error('[API candidates/bulk] Failed to forward candidates to n8n:', err);
        return NextResponse.json({ error: 'Failed to contact candidate n8n webhook.' }, { status: 502 });
      }
    }

    // Load active jobs to resolve job titles if needed
    const activeJobs = await prisma.job.findMany({
      where: { status: 'ACTIVE' },
    });

    const createdCandidates = [];
    let succeededCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const c of candidates) {
      const fname = c.Candidate_FNAME || c.Candidate_Fname || c.fname || '';
      const lname = c.Candidate_LNAME || c.Candidate_Lname || c.lname || '';
      
      let finalFname = fname;
      let finalLname = lname;
      
      const name = c.Name || c.name || c['Full Name'] || c['Candidate Name'];
      if (name && !finalFname) {
        const nameParts = name.trim().split(/\s+/);
        finalFname = nameParts[0] || '';
        finalLname = nameParts.slice(1).join(' ') || '.';
      }

      const email = c.Candidate_EMAIL || c.candidateEmail || c.Email || c.email;
      const phone = c.Phone || c.phone || c['Phone Number'] || null;
      let jobId = c.Position_ID || c.jobId || c.JobId || defaultJobId;

      // Resolve job title to ID if title is provided
      const jobTitle = c['Job Title'] || c.jobTitle || c.JobTitle;
      
      let positionId: bigint | null = null;
      if (jobId) {
        positionId = BigInt(parseInt(jobId.toString(), 10));
      } else if (jobTitle) {
        const matchedJob = activeJobs.find(
          (j) => j.title?.toLowerCase().trim() === jobTitle.toLowerCase().trim()
        );
        if (matchedJob) {
          positionId = matchedJob.id;
        }
      }

      if (!finalFname || !email || !positionId) {
        // Skip invalid rows
        failedCount++;
        continue;
      }

      const job = activeJobs.find((j) => j.id === positionId) || await prisma.job.findUnique({ where: { id: positionId } });
      if (!job) {
        failedCount++;
        continue;
      }

      const rawCandidateId = c.Candidate_ID || c.Candidate_Id || Math.floor(100000 + Math.random() * 900000);
      const cleanCandidateIdStr = rawCandidateId.toString().replace(/\D/g, '');
      const candidateId = (cleanCandidateIdStr || Math.floor(100000 + Math.random() * 900000)).toString();

      // Check duplicate
      const existingCandidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { positionId, candidateId },
            { positionId, email },
          ],
        },
      });

      if (existingCandidate) {
        skippedCount++;
        continue;
      }

      const rawToken = c.assessmentToken ?? c.AssessmentToken ?? c.token ?? c.Token;
      const rawStatus = c.assessmentStatus ?? c.AssessmentStatus ?? c.status ?? c.Status;

      const assessmentToken = (rawToken === null || rawToken === '' || rawToken === undefined || rawToken === 'null') 
        ? null 
        : rawToken.toString();

      const assessmentStatus = (rawStatus === null || rawStatus === '' || rawStatus === undefined || rawStatus === 'null')
        ? (assessmentToken ? 'INVITED' : null)
        : rawStatus.toString();

      // Create in db
      const candidate = await prisma.candidate.create({
        data: {
          positionId,
          candidateId,
          fname: finalFname,
          lname: finalLname || '.',
          email,
          phone: phone ? phone.toString() : null,
          assessmentStatus: assessmentStatus as any,
          assessmentToken,
          inviteSentAt: (assessmentToken ? new Date() : null) as any,
        },
      });

      // Send email invitation if token is present
      if (assessmentToken) {
        try {
          await sendAssessmentInviteEmail({
            candidateEmail: email,
            candidateName: `${finalFname} ${finalLname}`.trim(),
            jobTitle: job.title || '',
            token: assessmentToken,
          });
        } catch (emailErr) {
          console.error(`Failed to send invite email to ${email}:`, emailErr);
        }
      }

      createdCandidates.push(candidate);
      succeededCount++;
    }

    return NextResponse.json(serializeBigInt({
      success: true,
      count: succeededCount,
      succeeded: succeededCount,
      failed: failedCount,
      skipped: skippedCount
    }));
  } catch (error: any) {
    console.error('Error in bulk candidate import:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
