import { NextResponse } from 'next/server';
import { prisma, pool } from '@/database/db';

export async function POST(request: Request) {
  try {
    // Shared secret authorization check
    const cronSecret = process.env.CRON_SECRET || 'super-cron-secret-key';
    const authHeader = request.headers.get('authorization');

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron trigger.' }, { status: 401 });
    }

    const now = new Date();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);

    // Find and delete job_descriptions that have been Inactive for more than 15 days
    let deletedJdsCount = 0;
    try {
      // First get the job codes of the ones we are about to delete
      const staleJdsRes = await pool.query(
        `SELECT content_hash, job_code FROM job_descriptions 
         WHERE status = 'Inactive' AND inactive_at < $1`,
        [fifteenDaysAgo.toISOString()]
      );

      const staleJds = staleJdsRes.rows;
      if (staleJds.length > 0) {
        const hashes = staleJds.map(jd => jd.content_hash);
        const jobCodes = staleJds.map(jd => jd.job_code).filter(Boolean);

        // Delete related output records to avoid foreign-key constraints
        if (jobCodes.length > 0) {
          await pool.query(
            `DELETE FROM output WHERE job_code = ANY($1::text[])`,
            [jobCodes]
          );
        }

        // Delete the job_descriptions
        const deleteRes = await pool.query(
          `DELETE FROM job_descriptions WHERE content_hash = ANY($1::text[]) RETURNING *`,
          [hashes]
        );
        deletedJdsCount = deleteRes.rowCount || 0;
        console.log(`[Cron Expirations] Deleted ${deletedJdsCount} stale job descriptions.`);
      }
    } catch (jdError) {
      console.error('[Cron Expirations] Error deleting stale job descriptions:', jdError);
    }

    // Find and delete candidates that have been Inactive for more than 15 days
    try {
      const staleCandidates = await prisma.candidate.findMany({
        where: {
          status: 'Inactive',
          inactiveAt: {
            lt: fifteenDaysAgo,
          },
        },
        select: {
          id: true,
          candidateId: true,
        },
      });

      if (staleCandidates.length > 0) {
        const pks = staleCandidates.map(c => c.id);
        const externalIds = staleCandidates.map(c => c.candidateId).filter(Boolean);

        // Delete from output table first to avoid foreign-key constraint issues
        if (externalIds.length > 0) {
          await pool.query(
            `DELETE FROM output WHERE candidate_id = ANY($1::text[])`,
            [externalIds]
          );
        }

        // Delete from candidates table via Prisma (which also cascades to SlotBooking, Assessments)
        const deleted = await prisma.candidate.deleteMany({
          where: {
            id: { in: pks },
          },
        });

        console.log(`[Cron Expirations] Deleted ${deleted.count} stale candidates.`);
      }
    } catch (candError) {
      console.error('[Cron Expirations] Error deleting stale candidates:', candError);
    }

    // 1. Find all candidates in SCHEDULED or STARTED state whose booked slot endTime is in the past
    const expiredCandidates = await prisma.candidate.findMany({
      where: {
        assessmentStatus: {
          in: ['SCHEDULED', 'STARTED'],
        },
        booking: {
          slot: {
            endTime: {
              lt: now,
            },
          },
        },
      } as any,
      select: {
        id: true,
        name: true,
        assessmentStatus: true,
      },
    });

    console.log(`[Cron Expirations] Found ${expiredCandidates.length} candidates whose assessment slots have expired.`);

    if (expiredCandidates.length > 0) {
      // 2. Perform bulk update to status EXPIRED
      const candidateIds = expiredCandidates.map((c) => c.id);
      await prisma.candidate.updateMany({
        where: {
          id: {
            in: candidateIds,
          },
        },
        data: {
          assessmentStatus: 'EXPIRED' as any,
        },
      });
      console.log(`[Cron Expirations] Updated ${expiredCandidates.length} candidates to EXPIRED status.`);
    }

    return NextResponse.json({
      success: true,
      message: `Checked expirations. Marked ${expiredCandidates.length} candidates as EXPIRED.`,
      expiredCandidates,
    });
  } catch (error: any) {
    console.error('Error in cron expirations handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
