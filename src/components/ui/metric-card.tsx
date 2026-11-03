import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  subtext,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-50/80 border-indigo-100',
  className = '',
}: MetricCardProps) {
  return (
    <Card className={`border border-neutral-200/80 shadow-2xs hover:shadow-xs transition-shadow duration-200 ${className}`}>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
            {label}
          </span>
          <p className="text-2xl font-bold tracking-tight text-neutral-900 leading-none">
            {value}
          </p>
          {subtext && (
            <span className="text-[11px] text-neutral-400 font-medium block">
              {subtext}
            </span>
          )}
        </div>
        <div className={`p-2.5 border rounded-lg ${iconBg} shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}
