'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  title: z.string().min(2, 'Job title must be at least 2 characters'),
  department: z.string().min(2, 'Department is required'),
  location: z.string().min(2, 'Location is required'),
  experience: z.string().min(1, 'Experience is required'),
  jdText: z.string().min(50, 'Job description text must be at least 50 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewJobPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [uploadFileName, setUploadFileName] = React.useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      department: '',
      location: '',
      experience: '',
      jdText: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setValue('jdText', text);
    };
    reader.readAsText(file);
  };

  const onSubmit = async (data: FormValues) => {
    setStatus('processing');
    setErrorMessage('');

    try {
      const res = await fetch('/api/jobs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to process job description');
      }

      setStatus('success');
      // Redirect after a brief window to allow the user to see the success state
      setTimeout(() => {
        router.push('/dashboard/jobs');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error('Job upload error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred during analysis.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      <Card className="shadow-xs border border-neutral-200">
        <CardHeader>
          <CardTitle>Post a New Position</CardTitle>
          <CardDescription>
            Specify opening details and input the JD. Our AI pipeline will parse required skills to tailor candidate assessments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'processing' && (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 text-neutral-900 animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900">JD Processing...</h3>
                <p className="text-xs text-neutral-400 max-w-xs">
                  n8n agents are extracting skills, seniority models, and topic weights.
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-pulse" />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900">AI Analysis Completed</h3>
                <p className="text-xs text-neutral-400">
                  Job saved and structured topics successfully created. Redirecting...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-sm text-xs space-y-2 mb-6">
              <p className="font-semibold">Analysis Failed</p>
              <p>{errorMessage}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 cursor-pointer"
                onClick={() => setStatus('idle')}
              >
                Go Back and Try Again
              </Button>
            </div>
          )}

          {status === 'idle' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Job Title"
                  placeholder="e.g. Senior Fullstack Developer"
                  error={errors.title?.message}
                  {...register('title')}
                />
                <Input
                  label="Department"
                  placeholder="e.g. Engineering"
                  error={errors.department?.message}
                  {...register('department')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Experience Level"
                  placeholder="e.g. 5+ years"
                  error={errors.experience?.message}
                  {...register('experience')}
                />
                <Input
                  label="Location"
                  placeholder="e.g. Remote, USA"
                  error={errors.location?.message}
                  {...register('location')}
                />
              </div>

              {/* JD File Reader dropzone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Upload Job Description File
                </label>
                <div className="relative border border-dashed border-neutral-200 hover:border-neutral-400 transition-colors p-4 rounded-sm flex items-center justify-center bg-neutral-50/50">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center space-y-1">
                    <Upload className="h-5 w-5 text-neutral-400" />
                    <span className="text-[11px] text-neutral-600 font-medium">
                      {uploadFileName || 'Drag and drop or click to upload (.txt files)'}
                    </span>
                  </div>
                </div>
              </div>

              <Textarea
                label="Job Description Raw Text"
                placeholder="Paste the complete job description text here (minimum 50 characters)..."
                rows={8}
                error={errors.jdText?.message}
                {...register('jdText')}
              />

              <div className="pt-2 border-t border-neutral-100 flex justify-end">
                <Button type="submit" className="cursor-pointer" size="md">
                  Submit & Analyze JD
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
