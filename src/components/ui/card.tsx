import * as React from 'react';

export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`rounded-sm border border-neutral-200 bg-white text-neutral-900 shadow-xs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 border-b border-neutral-100 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={`text-base font-semibold leading-none tracking-tight text-neutral-900 ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p className={`text-sm text-neutral-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`flex items-center p-6 pt-0 border-t border-neutral-100 ${className}`} {...props}>
      {children}
    </div>
  );
};
