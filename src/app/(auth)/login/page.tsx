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
import { AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

async function readJsonResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return {};
}

export default function LoginPage() {
  const router = useRouter();
  const [errorAlert, setErrorAlert] = React.useState('');
  const [loading, setLoading] = React.useState(false);

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
      });

      const data = await readJsonResponse(res);

      if (!res.ok) {
        setErrorAlert(data.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setErrorAlert(err instanceof Error ? err.message : 'Check your credentials and try again.');
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
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorAlert}</span>
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

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

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
