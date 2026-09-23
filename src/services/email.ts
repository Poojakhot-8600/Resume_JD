import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendAssessmentInviteEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  token,
}: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  token: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/assessment/${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; background-color: #ffffff;">
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.025em;">
        Technical Assessment Invitation
      </h2>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 12px;">
        Hello ${candidateName},
      </p>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        You have been invited to complete a technical recruitment assessment for the position of <strong>${jobTitle}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        The assessment will test your domain knowledge and problem solving skills. You will see a series of technical questions to answer in text format. 
      </p>
      <div style="margin-bottom: 32px;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 18px; border-radius: 4px; text-align: center;">
          Start Assessment
        </a>
      </div>
      <p style="font-size: 12px; line-height: 20px; color: #737373; margin-bottom: 0; padding-top: 24px; border-top: 1px solid #f5f5f5;">
        This invitation was sent to ${candidateEmail}. If you did not expect this invitation, please ignore this email.
      </p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Assessment Platform <onboarding@resend.dev>',
        to: candidateEmail,
        subject: `Technical Assessment Invitation: ${jobTitle}`,
        html,
      });
      console.log(`[Email Service] Invite email sent via Resend to ${candidateEmail}`);
      return { success: true };
    } catch (error) {
      console.error('[Email Service] Failed to send email via Resend:', error);
    }
  }

  // Local development console log simulation
  console.log('\n====================================================');
  console.log(`[EMAIL SEND SIMULATION] (RESEND_API_KEY not configured)`);
  console.log(`To: ${candidateEmail}`);
  console.log(`Subject: Technical Assessment Invitation: ${jobTitle}`);
  console.log(`Invite URL: ${inviteUrl}`);
  console.log('====================================================\n');
  return { success: true, simulated: true };
}

export async function sendShortlistInviteEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  token,
}: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  token: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const bookUrl = `${appUrl}/candidate/book-slot/${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; background-color: #ffffff;">
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.025em;">
        Congratulations! You have been shortlisted.
      </h2>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 12px;">
        Hello ${candidateName},
      </p>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        We have reviewed your application and would love to invite you to schedule your technical assessment slot for the <strong>${jobTitle}</strong> position.
      </p>
      <div style="margin-bottom: 32px;">
        <a href="${bookUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 20px; border-radius: 4px; text-align: center;">
          Book Assessment Slot
        </a>
      </div>
      <p style="font-size: 12px; line-height: 20px; color: #737373; margin-bottom: 0; padding-top: 24px; border-top: 1px solid #f5f5f5;">
        This email was sent to ${candidateEmail}. Please complete your booking at your earliest convenience.
      </p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Assessment Platform <onboarding@resend.dev>',
        to: candidateEmail,
        subject: `Congratulations! Shortlisted for ${jobTitle}`,
        html,
      });
      console.log(`[Email Service] Shortlist email sent via Resend to ${candidateEmail}`);
      return { success: true };
    } catch (error) {
      console.error('[Email Service] Failed to send shortlist email via Resend:', error);
    }
  }

  console.log('\n====================================================');
  console.log(`[EMAIL SEND SIMULATION] Shortlist Invitation`);
  console.log(`To: ${candidateEmail}`);
  console.log(`Subject: Congratulations! Shortlisted for ${jobTitle}`);
  console.log(`Booking URL: ${bookUrl}`);
  console.log('====================================================\n');
  return { success: true, simulated: true };
}

export async function sendBookingConfirmationEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  startTime,
  endTime,
  token,
}: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  startTime: Date;
  endTime: Date;
  token: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const assessmentUrl = `${appUrl}/assessment/${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; background-color: #ffffff;">
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.025em;">
        Assessment Slot Confirmed
      </h2>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 12px;">
        Hello ${candidateName},
      </p>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        Your assessment slot for the position of <strong>${jobTitle}</strong> has been successfully booked:
      </p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;"><strong>Start Time:</strong> ${startTime.toLocaleString()}</p>
        <p style="font-size: 14px; color: #374151; margin: 0;"><strong>End Time:</strong> ${endTime.toLocaleString()}</p>
      </div>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        Please log in during this scheduled window to complete your online assessment. You will not be able to access the questions outside of this timeframe.
      </p>
      <div style="margin-bottom: 32px;">
        <a href="${assessmentUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 20px; border-radius: 4px; text-align: center;">
          Go to Assessment Portal
        </a>
      </div>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Assessment Platform <onboarding@resend.dev>',
        to: candidateEmail,
        subject: `Confirmed: Assessment Slot for ${jobTitle}`,
        html,
      });
      console.log(`[Email Service] Confirmation email sent via Resend to ${candidateEmail}`);
      return { success: true };
    } catch (error) {
      console.error('[Email Service] Failed to send confirmation email via Resend:', error);
    }
  }

  console.log('\n====================================================');
  console.log(`[EMAIL SEND SIMULATION] Booking Confirmation`);
  console.log(`To: ${candidateEmail}`);
  console.log(`Subject: Confirmed: Assessment Slot for ${jobTitle}`);
  console.log(`Start Time: ${startTime.toLocaleString()}`);
  console.log(`End Time: ${endTime.toLocaleString()}`);
  console.log(`Assessment Portal: ${assessmentUrl}`);
  console.log('====================================================\n');
  return { success: true, simulated: true };
}

export async function sendAssessmentReminderEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  startTime,
  token,
}: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  startTime: Date;
  token: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const assessmentUrl = `${appUrl}/assessment/${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; background-color: #ffffff;">
      <h2 style="font-size: 20px; font-weight: 600; color: #dc2626; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.025em;">
        Reminder: Your Assessment is Live Soon
      </h2>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 12px;">
        Hello ${candidateName},
      </p>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        This is a friendly reminder that your technical assessment for the position of <strong>${jobTitle}</strong> starts soon at <strong>${startTime.toLocaleString()}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
        Please ensure you are ready to start during your scheduled slot.
      </p>
      <div style="margin-bottom: 32px;">
        <a href="${assessmentUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 20px; border-radius: 4px; text-align: center;">
          Access Assessment Portal
        </a>
      </div>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: 'Assessment Platform <onboarding@resend.dev>',
        to: candidateEmail,
        subject: `Reminder: Assessment for ${jobTitle} starts soon`,
        html,
      });
      return { success: true };
    } catch (error) {
      console.error('[Email Service] Failed to send reminder email:', error);
    }
  }

  console.log('\n====================================================');
  console.log(`[EMAIL SEND SIMULATION] Assessment Reminder`);
  console.log(`To: ${candidateEmail}`);
  console.log(`Subject: Reminder: Assessment for ${jobTitle} starts soon`);
  console.log(`Access Portal: ${assessmentUrl}`);
  console.log('====================================================\n');
  return { success: true, simulated: true };
}
