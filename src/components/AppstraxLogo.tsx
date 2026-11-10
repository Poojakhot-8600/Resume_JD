import React from 'react';

interface AppstraxLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export function AppstraxLogo({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = true,
}: AppstraxLogoProps) {
  // Size mapping for the emblem
  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    xs: { main: 'text-xs', sub: 'text-[7px] tracking-[0.2em]' },
    sm: { main: 'text-sm', sub: 'text-[8px] tracking-[0.22em]' },
    md: { main: 'text-base', sub: 'text-[9px] tracking-[0.24em]' },
    lg: { main: 'text-lg', sub: 'text-[10px] tracking-[0.26em]' },
    xl: { main: 'text-2xl', sub: 'text-xs tracking-[0.28em]' },
  };

  const GlobeIcon = (
    <svg
      viewBox="0 0 120 120"
      className={`${iconSizes[size]} shrink-0`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="appstraxGlobeGrad" x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#1e3a5b" />
          <stop offset="55%" stopColor="#1a5a6b" />
          <stop offset="100%" stopColor="#02a297" />
        </linearGradient>
        <clipPath id="appstraxGlobeClip">
          <circle cx="60" cy="60" r="54" />
        </clipPath>
      </defs>

      {/* Globe Base */}
      <circle cx="60" cy="60" r="54" fill="url(#appstraxGlobeGrad)" />

      {/* Globe Lat/Long grid */}
      <g clipPath="url(#appstraxGlobeClip)" stroke="#ffffff" strokeWidth="1.3" opacity="0.32">
        <ellipse cx="60" cy="60" rx="54" ry="15" />
        <ellipse cx="60" cy="60" rx="54" ry="34" />
        <line x1="6" y1="60" x2="114" y2="60" />
        <ellipse cx="60" cy="60" rx="19" ry="54" />
        <ellipse cx="60" cy="60" rx="38" ry="54" />
        <line x1="60" y1="6" x2="60" y2="114" />
      </g>

      {/* Stylized White Letter "A" */}
      <path
        d="M 60 17 L 36 90 L 48.5 90 L 54 72 L 66 72 L 71.5 90 L 84 90 Z M 60 38 L 64.5 61 L 55.5 61 Z"
        fill="#ffffff"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{GlobeIcon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {GlobeIcon}
      <div className="flex flex-col leading-tight select-none">
        <div className={`font-bold tracking-tight ${textSizes[size].main} flex items-center`}>
          <span className="text-[#1e2d4a]">Appstrax</span>
          <span className="text-[#00a896]">Global</span>
        </div>
        {showTagline && variant === 'full' && (
          <span className={`font-medium uppercase text-[#60728c] ${textSizes[size].sub}`}>
            Apps Without Borders
          </span>
        )}
      </div>
    </div>
  );
}
