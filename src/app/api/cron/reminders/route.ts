import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { sendAssessmentReminderEmail } from '@/services/email';

export async function POST(request: Request) {
  try {
    // Shared secret authorization check
    const cronSecret = process.env.CRON_SECRET || 'super-cron-secret-key';
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron trigger.' }, { status: 401 });
    }

    const now = new Date();
    const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Find all scheduled bookings starting in the next 24 hours that haven't been reminded
    const pendingReminders = await (prisma as any).slotBooking.findMany({
      where: {
        reminderSent: false,
        slot: {
          startTime: {
            gt: now,
            lte: futureLimit,
          },
        },
        candidate: {
          assessmentStatus: 'SCHEDULED',
        },
      },
      include: {
        candidate: {
          include: {
            job: { select: { title: true } },
          },
        },
        slot: true,
      },
    });

    console.log(`[Cron Reminders] Found ${pendingReminders.length} pending candidate reminders.`);

    let sentCount = 0;
    for (const booking of pendingReminders) {
      try {
        await sendAssessmentReminderEmail({
          candidateEmail: booking.candidate.email,
          candidateName: booking.candidate.name,
          jobTitle: booking.candidate.job.title,
          startTime: booking.slot.startTime,
          token: booking.candidate.assessmentToken,
        });

        // Mark as sent
        await (prisma as any).slotBooking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        });

        sentCount++;
      } catch (err) {
        console.error(`[Cron Reminders] Failed to send reminder to candidate ${booking.candidate.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Triggered reminders. Sent: ${sentCount} of ${pendingReminders.length}`,
    });
  } catch (error: any) {
    console.error('Error in cron reminders handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
