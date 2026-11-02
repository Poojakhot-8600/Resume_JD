import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  onActionClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`py-12 px-4 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
      {Icon && (
        <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-1">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-neutral-800">{title}</h4>
        <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
      </div>
      {(actionHref || onActionClick) && actionLabel && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm" className="cursor-pointer text-xs font-medium">
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onActionClick} className="cursor-pointer text-xs font-medium">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
