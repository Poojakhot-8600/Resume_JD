import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Briefcase, ShieldCheck, Mail, Cpu, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans antialiased text-neutral-900 selection:bg-neutral-950 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-6 md:px-16 select-none shrink-0">
        <div className="flex items-center gap-2 font-bold tracking-tight text-neutral-900">
          <div className="h-6 w-6 bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-semibold rounded-sm">
            R
          </div>
          <span className="text-sm font-semibold tracking-wide uppercase text-indigo-900">Assess AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="cursor-pointer text-xs">
              Recruiter Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="cursor-pointer text-xs">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6 max-w-5xl mx-auto text-center space-y-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-linear-to-r from-indigo-600 to-violet-600 text-white uppercase tracking-wider select-none">
            Enterprise Grade SaaS
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 leading-tight max-w-3xl">
            Evaluate Technical Candidates with Precision AI Assessments
          </h1>
          <p className="text-sm md:text-base text-neutral-500 max-w-xl mx-auto leading-relaxed font-medium">
            Upload Job Descriptions, generate tailored technical exam sheets dynamically, invite candidates securely, and let autonomous workflows score responses.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="w-48 cursor-pointer flex items-center gap-2">
              <span>Create Recruiter Space</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-48 cursor-pointer">
              Recruiter Dashboard
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 text-left">
          {/* Card 1 */}
          <div className="p-6 bg-white border border-neutral-200 rounded-sm space-y-3">
            <div className="h-8 w-8 bg-linear-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center rounded-sm">
              <Briefcase className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              1. Job Profile Analysis
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Upload raw job descriptions. Next.js communicates with n8n to analyze skill requirements and generate structured test topics.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-white border border-neutral-200 rounded-sm space-y-3">
            <div className="h-8 w-8 bg-linear-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center rounded-sm">
              <Mail className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              2. Candidate Invitations
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Invite candidates via Resend. Candidates receive unique links to access their custom assessment portal without creating passwords.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-white border border-neutral-200 rounded-sm space-y-3">
            <div className="h-8 w-8 bg-linear-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center rounded-sm">
              <Cpu className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              3. AI Grading Pipeline
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Grade responses using n8n AI agent critiques. Recruits see total scores, subject benchmarks, and detailed critique reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 font-semibold select-none bg-white">
        &copy; {new Date().getFullYear()} Assess AI Recruitment Platform. Built for Enterprise.
      </footer>
    </div>
  );
}
