import React from 'react';
import { AlertStatus, ConsumerStatus } from '../../types';
import { cn } from '../../utils/classNames';

export interface StatusBadgeProps {
  status: AlertStatus | ConsumerStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const getStyle = (s: string) => {
    switch (s) {
      case 'Detected':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Open':
        return 'bg-blue-50 text-[#0F52BA] border-blue-200';
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'False Positive':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Confirmed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Flagged':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Under Investigation':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cleared':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-medium font-sans',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        getStyle(status),
        className
      )}
    >
      {status}
    </span>
  );
}
