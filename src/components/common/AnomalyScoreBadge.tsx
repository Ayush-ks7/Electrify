import React from 'react';
import { cn } from '../../utils/classNames';

export interface AnomalyScoreBadgeProps {
  score: number; // 0.0 to 1.0 or 0 to 100
  className?: string;
  showPercent?: boolean;
}

export function AnomalyScoreBadge({
  score,
  className,
  showPercent = false,
}: AnomalyScoreBadgeProps) {
  // Normalize to 0-1
  const normalized = score > 1 ? score / 100 : score;
  const pct = Math.round(normalized * 100);

  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized >= 0.85) {
    badgeColor = 'bg-red-50 text-red-700 border-red-200';
  } else if (normalized >= 0.7) {
    badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (normalized >= 0.4) {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border font-mono text-xs font-semibold tracking-wide',
        badgeColor,
        className
      )}
    >
      {showPercent ? `${pct}%` : normalized.toFixed(2)}
    </span>
  );
}
