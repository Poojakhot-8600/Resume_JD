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
            placeholder="Quick search..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-sm border border-neutral-200 bg-neutral-50/50 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all"
          />
        </div>

        {/* User Initials Badge */}
        <div className="h-8 w-8 bg-linear-to-tr from-indigo-500 to-violet-500 text-white font-semibold text-xs flex items-center justify-center rounded-sm">
          {user.name.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
