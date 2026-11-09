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
    .trim()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
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
      console.log("auth login ...", res);

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
        } catch { }
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
        {/* Quick Test Credentials Box */}
        {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' && (
          <div className="mb-4 p-3 bg-neutral-50/90 border border-neutral-200/80 rounded-lg text-xs text-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900 text-[11px] tracking-wide uppercase">
                Quick Test Accounts
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setValue('email', process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || 'admin@gmail.com');
                  setValue('password', process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || 'admin123');
                }}
                className="p-2 rounded-md border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-indigo-950">Super Admin</span>
                  <span className="text-[9px] px-1 py-0.2 bg-indigo-200/80 text-indigo-800 rounded font-semibold">ADMIN</span>
                </div>
                <div className="text-[10px] text-indigo-700 font-mono mt-0.5 truncate">{process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || 'admin@gmail.com'}</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue('email', 'recruiter@gmail.com');
                  setValue('password', 'recruiter123');
                }}
                className="p-2 rounded-md border border-violet-200 bg-violet-50/70 hover:bg-violet-100/90 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-violet-950">Recruiter</span>
                  <span className="text-[9px] px-1 py-0.2 bg-violet-200/80 text-violet-800 rounded font-semibold">RECRUITER</span>
                </div>
                <div className="text-[10px] text-violet-700 font-mono mt-0.5 truncate">recruiter@gmail.com</div>
              </button>
            </div>
          </div>
        )}

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
