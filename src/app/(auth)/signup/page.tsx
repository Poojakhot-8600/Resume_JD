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
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupValues = z.infer<typeof signupSchema>;

async function readJsonResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return {};
}

export default function SignupPage() {
  const router = useRouter();
  const [errorAlert, setErrorAlert] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignupValues) => {
    setLoading(true);
    setErrorAlert('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await readJsonResponse(res);

      if (!res.ok) {
        setErrorAlert(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setErrorAlert(err instanceof Error ? err.message : 'An error occurred during registration.');
      setLoading(false);
    }
  };

  return (
    <Card className="border border-neutral-200 shadow-xs">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
          Create Account
        </CardTitle>
        <CardDescription className="text-xs">
          Register to begin posting jobs and grading candidates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorAlert && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorAlert}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-sm flex items-start gap-2 leading-relaxed">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Sarah Jenkins"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. sarah@company.com"
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
                Register Account
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 text-center text-xs text-neutral-500 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-neutral-900 font-semibold underline hover:text-black">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
