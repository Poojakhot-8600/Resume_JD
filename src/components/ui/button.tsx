import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyle =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-600 shadow-sm focus-visible:ring-indigo-500',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 border border-neutral-100',
      outline: 'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900',
      ghost: 'hover:bg-neutral-100 hover:text-neutral-900 text-neutral-600',
      danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600 shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-sm',
      md: 'h-10 px-4 py-2 text-sm rounded-sm',
      lg: 'h-11 px-8 text-base rounded-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
