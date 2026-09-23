'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, Users, BarChart3, LogOut, UserCheck, Calendar, Settings } from 'lucide-react';

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
    { name: 'Candidates', href: '/dashboard/candidates', icon: Users },
    { name: 'Results', href: '/dashboard/results', icon: BarChart3 },
    { name: 'Scheduler', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (user.role === 'ADMIN') {
    menuItems.push({ name: 'HR Team', href: '/dashboard/team', icon: UserCheck });
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="w-64 border-r border-neutral-200 bg-white flex flex-col h-full text-neutral-900 select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-neutral-200 flex items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-neutral-900">
          <div className="h-6 w-6 bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-semibold rounded-sm">
            R
          </div>
          <span className="text-sm font-semibold tracking-wide uppercase text-indigo-900">Assess AI</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-sm ${isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-600 pl-2.5'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-neutral-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Recruiter Workspace Profile info */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50/50">
        <div className="flex items-center justify-between mb-3 overflow-hidden">
          <div className="min-w-0 pr-2">
            <p className="text-sm font-medium text-neutral-900 truncate">{user.name}</p>
            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
          </div>
          {user.role === 'ADMIN' && (
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-neutral-950 text-white leading-none uppercase tracking-wider">
              Admin
            </span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors rounded-sm cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
