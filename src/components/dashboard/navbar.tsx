'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.startsWith('/dashboard/jobs')) {
      if (pathname.includes('/new')) return 'Create Job Opening';
      return 'Jobs Management';
    }
    if (pathname.startsWith('/dashboard/candidates')) {
      return 'Candidates Management';
    }
    if (pathname.startsWith('/dashboard/results')) return 'Results & Analytics';
    return 'Dashboard';
  };

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-8 select-none shrink-0">
      {/* Dynamic Page Title */}
      <h1 className="text-sm font-semibold text-neutral-900 tracking-tight">
        {getPageTitle()}
      </h1>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search positions, candidates..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border border-neutral-200 bg-neutral-50/70 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all font-medium"
          />
        </div>

        {/* User Info & Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-neutral-900 leading-tight">{user.name}</div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded inline-block ${
                user.role === 'ADMIN'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {user.role === 'ADMIN' ? 'Super Admin' : 'Recruiter'}
            </span>
          </div>
          <div className="h-8 w-8 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center rounded-md shadow-2xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
