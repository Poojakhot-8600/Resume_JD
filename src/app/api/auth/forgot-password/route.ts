import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { createClient } from '@/utils/supabase/server';
import { syncUserToSupabaseAuth } from '@/utils/supabase/syncUser';
import * as z from 'zod';
import { Resend } from 'resend';
import { SignJWT, jwtVerify } from 'jose';

const schema = z.object({
  email: z
    .string({ message: 'Please enter your email address.' })
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = schema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Ensure user exists in both public.User and Supabase auth.users
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    });

    if (user) {
      await syncUserToSupabaseAuth({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
      }).catch((err) => {
        console.warn('Auto-sync to Supabase auth.users notice:', err);
      });
    }

    // 2. Request Supabase to issue password recovery email
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${appUrl}/auth/callback?next=/reset-password`;

    let supabaseError: any = null;
    try {
      const res = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
      supabaseError = res.error;
    } catch (err: any) {
      supabaseError = err;
    }

    const isRateLimited =
      supabaseError?.status === 429 ||
      supabaseError?.code === 'over_email_send_rate_limit';

    // 3. Create a secure direct fallback reset token (valid for 1 hour)
    let devResetUrl = '';
    if (user) {
      const resetToken = await new SignJWT({
        email: normalizedEmail,
        purpose: 'password_recovery',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(JWT_SECRET);

      devResetUrl = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

      // 4. If RESEND_API_KEY is configured in .env, send the email directly via Resend
      if (process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'Assessment Platform <onboarding@resend.dev>',
            to: normalizedEmail,
            subject: 'Reset Your Password - Recruitment Assessment Hub',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; background-color: #ffffff;">
                <h2 style="font-size: 20px; font-weight: 600; color: #171717; margin-top: 0; margin-bottom: 16px;">
                  Reset Your Password
                </h2>
                <p style="font-size: 14px; line-height: 24px; color: #444444; margin-bottom: 24px;">
                  Hello ${user.name || 'there'},<br>
                  We received a request to reset your password. Click the button below to set a new password:
                </p>
                <div style="margin-bottom: 32px;">
                  <a href="${devResetUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 4px; text-align: center;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 12px; line-height: 20px; color: #737373; margin-bottom: 0; padding-top: 24px; border-top: 1px solid #f5f5f5;">
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            `,
          });
          console.log(`[Email Service] Direct password reset email sent via Resend to ${normalizedEmail}`);
        } catch (resendErr) {
          console.error('[Email Service] Failed to send email via Resend:', resendErr);
        }
      }

      // Always log the development reset URL to server console for instant testing
      console.log('\n================================================================');
      console.log(`[PASSWORD RESET REQUEST] for ${normalizedEmail}`);
      if (isRateLimited) {
        console.log(`⚠️ Supabase shared mailer rate limit active (3 emails/hr limit).`);
      }
      console.log(`Direct Reset URL: ${devResetUrl}`);
      console.log('================================================================\n');
    }

    return NextResponse.json({
      success: true,
      message:
        'If an account exists for this email, you will receive a password reset link shortly.',
      isRateLimited,
      devResetUrl: process.env.NODE_ENV === 'development' ? devResetUrl : undefined,
    });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
