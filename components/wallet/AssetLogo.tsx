import React, { useState } from 'react';

interface AssetLogoProps {
  logoUrl?: string;
  name?: string;
  symbol: string;
  color?: string;
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
  className?: string;
  textSize?: string;
}

const SIZE_MAP: Record<string, { sizeClass: string; textClass: string }> = {
  xs: { sizeClass: 'w-5 h-5', textClass: 'text-[10px]' },
  sm: { sizeClass: 'w-6 h-6', textClass: 'text-xs' },
  md: { sizeClass: 'w-8 h-8', textClass: 'text-sm' },
  lg: { sizeClass: 'w-12 h-12', textClass: 'text-lg' },
  xl: { sizeClass: 'w-14 h-14', textClass: 'text-2xl' },
};

/**
 * Universal Asset Logo component with automatic fallback to sleek colored icon pill
 * Prevents broken image icons when deployed to production or offline.
 */
export default function AssetLogo({
  logoUrl,
  name,
  symbol,
  color = 'bg-purple-600',
  icon,
  size = 'w-12 h-12',
  className = '',
  textSize
}: AssetLogoProps) {
  const [hasError, setHasError] = useState(false);

  const displayChar = icon || (symbol ? symbol.charAt(0) : '?');

  const resolved = SIZE_MAP[size];
  const sizeClass = resolved ? resolved.sizeClass : size;
  const resolvedTextSize = textSize || (resolved ? resolved.textClass : 'text-xl');

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={name || symbol}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full ${color} flex items-center justify-center text-white ${resolvedTextSize} font-bold shrink-0 ${className}`}
      title={name || symbol}
    >
      {displayChar}
    </div>
  );
}
