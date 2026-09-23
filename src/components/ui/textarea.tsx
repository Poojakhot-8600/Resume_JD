import * as React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`flex w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 focus-visible:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-red-500 focus-visible:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
