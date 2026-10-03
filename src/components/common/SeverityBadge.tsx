import React from 'react';
import { Severity } from '../../types';
import { cn } from '../../utils/classNames';

export interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, className, size = 'md' }: SeverityBadgeProps) {
  const configs: Record<Severity, { label: string; style: string; dot: string }> = {
    critical: {
      label: 'CRITICAL',
      style: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-600',
    },
    high: {
      label: 'HIGH',
      style: 'bg-orange-50 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
    },
    medium: {
      label: 'MEDIUM',
      style: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    low: {
      label: 'LOW',
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
  };

  const current = configs[severity] || configs.low;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-mono font-semibold tracking-wider uppercase',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] gap-1' : 'px-2 py-0.5 text-xs gap-1.5',
        current.style,
        className
      )}
    >
      <span className={cn('rounded-full shrink-0', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', current.dot)} />
      {current.label}
    </span>
  );
}
