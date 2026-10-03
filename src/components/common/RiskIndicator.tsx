import React from 'react';
import { Severity } from '../../types';
import { cn } from '../../utils/classNames';

export interface RiskIndicatorProps {
  score: number;
  severity?: Severity;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskIndicator({
  score,
  severity,
  showLabel = true,
  className,
  size = 'md',
}: RiskIndicatorProps) {
  const getSeverity = (s: number): Severity => {
    if (s >= 85) return 'critical';
    if (s >= 70) return 'high';
    if (s >= 40) return 'medium';
    return 'low';
  };

  const calculatedSeverity = severity || getSeverity(score);

  const colors = {
    critical: {
      text: 'text-red-700',
      bg: 'bg-red-50',
      bar: 'bg-red-600',
      border: 'border-red-200',
    },
    high: {
      text: 'text-orange-700',
      bg: 'bg-orange-50',
      bar: 'bg-orange-500',
      border: 'border-orange-200',
    },
    medium: {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      bar: 'bg-amber-500',
      border: 'border-amber-200',
    },
    low: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      bar: 'bg-emerald-500',
      border: 'border-emerald-200',
    },
  }[calculatedSeverity];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center font-mono font-bold rounded border',
          colors.bg,
          colors.text,
          colors.border,
          size === 'sm' && 'h-6 px-1.5 text-xs',
          size === 'md' && 'h-7 px-2 text-sm',
          size === 'lg' && 'h-8 px-2.5 text-base'
        )}
      >
        {score}
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={cn('h-full transition-all duration-300', colors.bar)}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
