'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, EyeOff, Info, CheckCircle2 } from 'lucide-react';
import { LAST_ACTIVITY_KEY, AUTH_TIME_KEY } from '@/utils/session';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email address.')
    .email('Invalid email or password. Please try again.'),
  password: z
    .string()
    .min(1, 'Please enter your password.'),
});

type LoginValues = z.infer<typeof loginSchema>;

async function readJsonResponse(res: Response) {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // ignore parse error
  }
  return {};
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [errorAlert, setErrorAlert] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Status message based on redirect reason
  const getReasonMessage = () => {
    if (reason === 'timeout') {
      return {
        type: 'warning',
        text: 'You were logged out because of inactivity.',
      };
    }
    if (reason === 'expired') {
      return {
        type: 'warning',
        text: 'Your session has expired. Please sign in again.',
      };
    }
    if (reason === 'logout') {
      return {
        type: 'info',
        text: 'You have been signed out successfully.',
      };
    }
    return null;
  };

  const statusMsg = getReasonMessage();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    setErrorAlert('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include',
      });

      const data = await readJsonResponse(res);

      if (!res.ok) {
        if (data.error) {
          setErrorAlert(data.error);
        } else if (res.status === 400 || res.status === 401) {
          setErrorAlert('Invalid email or password. Please try again.');
        } else {
          setErrorAlert(`Server error (${res.status}). Please try again shortly.`);
        }
        setLoading(false);
        return;
      }

      // Store session data in localStorage & initialize activity tracker
      if (data?.token) {
        const now = Date.now();
        try {
          localStorage.setItem('auth_token', data.token);
          if (data.user) {
            localStorage.setItem('auth_user', JSON.stringify(data.user));
          }
          localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
          localStorage.setItem(
            AUTH_TIME_KEY,
            data.auth_time ? (data.auth_time * 1000).toString() : now.toString()
          );
          sessionStorage.clear();
        } catch {}
      }

      // Hard redirect guarantees browser loads new session cookie and bypasses stale RSC client cache
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setErrorAlert(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="border border-neutral-200 shadow-xs">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
          Account Login
        </CardTitle>
        <CardDescription className="text-xs">
          Sign in to manage job openings and candidate assessments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Session Status Banner (Timeout / Expired) */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2.5 leading-relaxed border ${
              statusMsg.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        )}

        {/* Demo Credentials Box */}
        <div className="mb-4 p-3 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold text-indigo-950 flex items-center gap-1.5">
              <span>Admin Account</span>
            </p>
            <div className="text-[11px] text-indigo-800 space-y-0.5">
              <p>Email: <span className="font-mono font-medium text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-indigo-100">admin@gmail.com</span></p>
              <p>Password: <span className="font-mono font-medium text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-indigo-100">admin123</span></p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue('email', 'admin@gmail.com');
              setValue('password', 'admin123');
            }}
            className="text-xs shrink-0 bg-white hover:bg-indigo-100 text-indigo-700 border-indigo-200 cursor-pointer font-medium"
          >
            Auto-fill
          </Button>
        </div>

        {errorAlert && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span className="font-medium text-red-700">{errorAlert}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. recruiter@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register('password')}
            />
            <div className="flex justify-end pt-1">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full cursor-pointer" isLoading={loading}>
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-xs text-neutral-500 font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-neutral-900 font-semibold underline hover:text-black">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-neutral-400">Loading...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
