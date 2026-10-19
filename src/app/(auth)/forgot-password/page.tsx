'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ArrowLeft, ExternalLink, AlertTriangle, Mail } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z
    .string({ message: 'Please enter your email address.' })
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [errorAlert, setErrorAlert] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [devResetUrl, setDevResetUrl] = React.useState('');
  const [rateLimited, setRateLimited] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    if (loading) return;
    setLoading(true);
    setErrorAlert('');
    setSuccessMessage('');
    setDevResetUrl('');
    setRateLimited(false);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorAlert(data.error || 'Unable to process reset request. Please try again.');
        setLoading(false);
        return;
      }

      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }

      if (data.isRateLimited) {
        setRateLimited(true);
      } else {
        setSuccessMessage(
          data.message || 'If an account exists for this email, you will receive a password reset link shortly.'
        );
      }

      setLoading(false);
    } catch (err: unknown) {
      setErrorAlert(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="border border-neutral-200 shadow-xs">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-xs">
          Enter your registered email address to receive a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorAlert && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span className="font-medium text-red-700">{errorAlert}</span>
          </div>
        )}

        {/* Normal Success Message */}
        {successMessage && !rateLimited && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Rate Limited Notice Banner */}
        {rateLimited && (
          <div className="mb-4 p-3.5 bg-amber-50/90 border border-amber-200 text-amber-900 text-xs rounded-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Supabase Email Rate Limit Reached</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Supabase's default shared mailer has an hourly cap of <strong>3 emails per hour</strong> across the project. New emails are temporarily blocked by Supabase until the cooldown window resets.
                </p>
              </div>
            </div>

            {devResetUrl && (
              <div className="mt-2 pt-2 border-t border-amber-200/60">
                <p className="text-[11px] font-medium text-amber-900 mb-1.5">
                  You can reset your password immediately using this direct link:
                </p>
                <a
                  href={devResetUrl}
                  className="inline-flex items-center gap-1.5 font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Reset Password Page</span>
                </a>
              </div>
            )}
          </div>
        )}

        {!successMessage && !rateLimited ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. recruiter@company.com"
              error={errors.email?.message}
              disabled={loading}
              {...register('email')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full cursor-pointer"
                isLoading={loading}
                disabled={loading}
              >
                Send Reset Link
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pt-1">
            {successMessage && !rateLimited && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-600 space-y-1.5">
                <p className="font-medium text-neutral-800 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Important Delivery Notice</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Please check both your <strong>Inbox</strong> and <strong>Spam / Junk</strong> folder. Automated emails from Supabase's default shared sender (<code>noreply@mail.app.supabase.io</code>) are frequently routed to Spam by Gmail.
                </p>
              </div>
            )}

            {devResetUrl && !rateLimited && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-xs space-y-1.5">
                <p className="font-semibold text-indigo-900 text-[11px]">Direct Reset Link (Local Testing):</p>
                <a
                  href={devResetUrl}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100 break-all font-medium"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span>Click to Reset Password Now</span>
                </a>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  setSuccessMessage('');
                  setRateLimited(false);
                  setDevResetUrl('');
                }}
              >
                Send Another Request
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-neutral-600 font-semibold hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
