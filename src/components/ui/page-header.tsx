import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200/80 shadow-2xs ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">{title}</h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-neutral-500 font-medium max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2.5 shrink-0">{children}</div>}
    </div>
  );
}
