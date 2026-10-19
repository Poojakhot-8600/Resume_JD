'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string({ message: 'Please enter your new password.' })
      .min(6, 'Password must be at least 6 characters long.')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z
      .string({ message: 'Please confirm your new password.' })
      .min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = React.useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [errorAlert, setErrorAlert] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Direct token support
  const [tokenParam, setTokenParam] = React.useState<string | null>(null);
  const [emailParam, setEmailParam] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });

  React.useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function checkRecoverySession() {
      const url = new URL(window.location.href);

      // Check for direct token and email parameters
      const token = url.searchParams.get('token');
      const email = url.searchParams.get('email');
      if (token && email) {
        if (isMounted) {
          setTokenParam(token);
          setEmailParam(email);
          setSessionStatus('valid');
        }
        return;
      }

      // 1. Check for error in query string
      const urlError = url.searchParams.get('error') || url.searchParams.get('error_description');
      if (urlError) {
        if (isMounted) {
          setErrorAlert('This password reset link is invalid or has expired. Please request a new one.');
          setSessionStatus('invalid');
        }
        return;
      }

      // 2. Handle direct code in query param if bypassed callback
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (isMounted) {
            setErrorAlert('Invalid or expired reset link. Please request a new password reset.');
            setSessionStatus('invalid');
          }
          return;
        }
      }

      // 3. Listen for auth changes (specifically PASSWORD_RECOVERY event or SIGNED_IN)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
          setSessionStatus('valid');
          setErrorAlert('');
        }
      });

      // 4. Verify existing session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) {
        subscription.unsubscribe();
        return;
      }

      if (session && session.user && !sessionError) {
        setSessionStatus('valid');
      } else {
        // Allow a small grace period for client auth state change listener to catch hash tokens
        setTimeout(async () => {
          if (!isMounted) return;
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession && retrySession.user) {
            setSessionStatus('valid');
          } else {
            setErrorAlert('Invalid or expired reset link. Please request a new password reset.');
            setSessionStatus('invalid');
          }
        }, 1200);
      }

      return () => {
        subscription.unsubscribe();
      };
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (values: ResetPasswordValues) => {
    if (submitting) return;
    setSubmitting(true);
    setErrorAlert('');

    try {
      // Flow A: Direct verified reset token
      if (tokenParam && emailParam) {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: tokenParam,
            email: emailParam,
            password: values.newPassword,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrorAlert(data.error || 'Failed to update password. Please try again.');
          setSubmitting(false);
          return;
        }

        setSuccessMessage('Password changed successfully! You can now log in with your new password.');
        setSessionStatus('success');
        setSubmitting(false);
        return;
      }

      // Flow B: Supabase Auth Recovery Session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorAlert('Missing or expired recovery session. Please request a new reset link.');
        setSessionStatus('invalid');
        setSubmitting(false);
        return;
      }

      // Update password securely in Supabase Authentication
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) {
        setErrorAlert(updateError.message || 'Failed to update password. Please try again.');
        setSubmitting(false);
        return;
      }

      // Synchronize backend User table password hash
      await fetch('/api/auth/sync-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.newPassword }),
      }).catch((err) => {
        console.warn('Backend hash synchronization notice:', err);
      });

      // Sign out recovery session cleanly so user logs in fresh
      await supabase.auth.signOut();

      setSuccessMessage('Password changed successfully! You can now log in with your new password.');
      setSessionStatus('success');
      setSubmitting(false);
    } catch (err: unknown) {
      setErrorAlert(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Card className="border border-neutral-200 shadow-xs">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
          Reset Your Password
        </CardTitle>
        <CardDescription className="text-xs">
          Choose a new secure password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessionStatus === 'loading' && (
          <div className="py-8 text-center space-y-3">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <p className="text-xs text-neutral-500">Verifying your recovery link...</p>
          </div>
        )}

        {sessionStatus === 'invalid' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span className="font-medium">
                {errorAlert || 'Invalid or expired reset link. Please request a new password reset.'}
              </span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => router.push('/forgot-password')}
              >
                Request New Reset Link
              </Button>
              <Link
                href="/login"
                className="text-center text-xs text-neutral-600 font-medium hover:text-neutral-900 hover:underline pt-1"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}

        {sessionStatus === 'success' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="font-medium text-emerald-800">{successMessage}</span>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => router.push('/login')}
              >
                Return to Login
              </Button>
            </div>
          </div>
        )}

        {sessionStatus === 'valid' && (
          <div>
            {errorAlert && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span className="font-medium">{errorAlert}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.newPassword?.message}
                disabled={submitting}
                rightElement={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 focus:outline-none"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('newPassword')}
              />

              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                disabled={submitting}
                rightElement={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('confirmPassword')}
              />

              <p className="text-[11px] text-neutral-500">
                Password must be at least 6 characters and contain letters and numbers.
              </p>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  isLoading={submitting}
                  disabled={submitting}
                >
                  Update Password
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center text-xs">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-neutral-600 font-semibold hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
