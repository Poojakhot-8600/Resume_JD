import * as React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 antialiased font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white">
      <div className="w-full max-w-sm space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-8 w-8 bg-neutral-900 flex items-center justify-center text-white text-sm font-semibold rounded-sm shadow-xs select-none">
            R
          </div>
          <h1 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
            Recruitment Assessment Hub
          </h1>
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
