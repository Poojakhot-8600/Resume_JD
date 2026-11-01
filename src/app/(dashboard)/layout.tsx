import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/utils/auth';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Navbar } from '@/components/dashboard/navbar';
import { SessionTimeoutManager } from '@/components/SessionTimeoutManager';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentUser();
  console.log("db user..", dbUser);

  if (!dbUser) {
    redirect('/login?reason=expired');
  }

  return (
    <div className="flex h-screen bg-neutral-50 font-sans antialiased text-neutral-900 overflow-hidden">
      {/* 20-minute Idle Timeout and Warning Modal */}
      <SessionTimeoutManager />

      {/* Recruiter Sidebar */}
      <Sidebar user={dbUser} />

      {/* Main Workspace Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Navbar user={dbUser} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
