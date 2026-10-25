import * as React from 'react';
import Link from 'next/link';
import { AppstraxLogo } from '@/components/AppstraxLogo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 antialiased font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white">
      <div className="w-full max-w-sm space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <AppstraxLogo variant="full" size="md" />
          </Link>
          <p className="text-[11px] text-neutral-500 font-medium">
            AI-driven technical assessments for modern hiring.
          </p>
        </div>

        {/* Children Pages */}
        {children}
      </div>
    </div>
  );
}
