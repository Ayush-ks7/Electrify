import React from 'react';
import { cn } from '../../utils/classNames';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'critical' | 'high' | 'medium' | 'low' | 'blue';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center font-medium rounded border tracking-wide uppercase font-mono select-none';

  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    secondary: 'bg-slate-50 text-slate-600 border-slate-200',
    outline: 'bg-transparent text-slate-600 border-slate-300',
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-[#0F52BA] border-blue-200',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1 leading-none',
    md: 'px-2 py-0.5 text-xs gap-1.5 leading-none',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
