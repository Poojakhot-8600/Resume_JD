import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';

export async function POST(request: Request) {
  try {
    // Shared secret authorization check
    const cronSecret = process.env.CRON_SECRET || 'super-cron-secret-key';
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron trigger.' }, { status: 401 });
    }

    const now = new Date();

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
