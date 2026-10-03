import React from 'react';
import { cn } from '../../utils/classNames';

export interface ConfidenceBarProps {
  confidence: number; // 0-100
  className?: string;
  showText?: boolean;
}

export function ConfidenceBar({
  confidence,
  className,
  showText = true,
}: ConfidenceBarProps) {
  const bounded = Math.min(100, Math.max(0, confidence));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className="h-full bg-[#0F52BA] transition-all duration-300"
          style={{ width: `${bounded}%` }}
        />
      </div>
      {showText && (
        <span className="font-mono text-xs font-semibold text-slate-700 w-10 text-right">
          {bounded}%
        </span>
      )}
    </div>
  );
}
