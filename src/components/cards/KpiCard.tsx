import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../utils/classNames';

export interface KpiCardProps {
  title: string;
  value: string | number;
  changePct?: number;
  changeLabel?: string;
  isPositiveGood?: boolean;
  unit?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  changePct,
  changeLabel = 'vs last cycle',
  isPositiveGood = false,
  unit,
  icon,
  subtitle,
  className,
  onClick,
}: KpiCardProps) {
  const isUp = changePct !== undefined && changePct > 0;
  const isDown = changePct !== undefined && changePct < 0;

  // For anomalies or critical alerts, an increase is usually "bad" (red), decrease is "good" (green)
  let trendColor = 'text-slate-500';
  if (changePct !== undefined && changePct !== 0) {
    if (isPositiveGood) {
      trendColor = isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50';
    } else {
      trendColor = isUp ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50';
    }
  }

  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        onClick && 'cursor-pointer hover:border-slate-300',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <span className="p-1.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        {changePct !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium',
              trendColor
            )}
          >
            {isUp ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : isDown ? (
              <ArrowDownRight className="w-3 h-3" />
            ) : null}
            {changePct > 0 ? `+${changePct}%` : `${changePct}%`}
            <span className="text-slate-400 font-sans ml-1 text-[10px]">{changeLabel}</span>
          </span>
        )}

        {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
      </div>
    </Card>
  );
}
