import React from 'react';

export type StatusType =
  | 'INVITED'
  | 'SHORTLISTED'
  | 'SCHEDULED'
  | 'STARTED'
  | 'COMPLETED'
  | 'EVALUATED'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'PROCESSING'
  | 'FAILED'
  | 'INACTIVE'
  | 'CLOSED'
  | string;

interface StatusBadgeProps {
  status: StatusType | null | undefined;
  className?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  INVITED: { label: 'Invited', bg: 'bg-neutral-100', text: 'text-neutral-700 border-neutral-200', dot: 'bg-neutral-400' },
  SHORTLISTED: { label: 'Shortlisted', bg: 'bg-purple-50', text: 'text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  STARTED: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-indigo-50', text: 'text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  EVALUATED: { label: 'Evaluated', bg: 'bg-emerald-50', text: 'text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  EXPIRED: { label: 'Expired', bg: 'bg-rose-50', text: 'text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  PROCESSING: { label: 'Processing', bg: 'bg-blue-50', text: 'text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  FAILED: { label: 'Failed', bg: 'bg-red-50', text: 'text-red-700 border-red-200', dot: 'bg-red-500' },
  INACTIVE: { label: 'Inactive', bg: 'bg-neutral-100', text: 'text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' },
  CLOSED: { label: 'Closed', bg: 'bg-neutral-100', text: 'text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const norm = (status || 'UNKNOWN').toUpperCase();
  const cfg = statusConfig[norm] || {
    label: status || 'Unknown',
    bg: 'bg-neutral-100',
    text: 'text-neutral-700 border-neutral-200',
    dot: 'bg-neutral-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}
