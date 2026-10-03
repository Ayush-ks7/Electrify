import React from 'react';
import { LikelyCause } from '../../types';
import { Info, AlertTriangle, Cpu, Radio, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface CauseProbabilityListProps {
  primaryCause: LikelyCause;
  primaryConfidence: number;
  alternativeProbabilities?: Array<{ cause: LikelyCause; probability: number }>;
  className?: string;
}

export function CauseProbabilityList({
  primaryCause,
  primaryConfidence,
  alternativeProbabilities = [],
  className,
}: CauseProbabilityListProps) {
  const getCauseIcon = (cause: LikelyCause) => {
    switch (cause) {
      case 'Suspected Theft':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'Meter Fault':
        return <Cpu className="w-4 h-4 text-orange-600" />;
      case 'Communication Issue':
        return <Radio className="w-4 h-4 text-blue-600" />;
      case 'Legitimate Behaviour':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCauseBadge = (cause: LikelyCause) => {
    switch (cause) {
      case 'Suspected Theft':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Meter Fault':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Communication Issue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Legitimate Behaviour':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary classification card */}
      <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {getCauseIcon(primaryCause)}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Likely Cause
            </span>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 rounded border text-xs font-semibold',
              getCauseBadge(primaryCause)
            )}
          >
            {primaryCause}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
          <span>Model Classification Confidence</span>
          <span className="font-mono font-bold text-slate-900">{primaryConfidence}%</span>
        </div>

        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0F52BA] transition-all duration-300"
            style={{ width: `${primaryConfidence}%` }}
          />
        </div>

        {primaryCause === 'Suspected Theft' && (
          <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Operational Note:</strong> Machine learning flags load discrepancies as{' '}
              <em>Suspected Theft</em>. Never treat as verified fact until a certified field meter inspection is conducted.
            </p>
          </div>
        )}
      </div>

      {/* Alternative probabilities */}
      {alternativeProbabilities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Alternative Probabilities
          </h4>
          <div className="space-y-2">
            {alternativeProbabilities
              .filter((p) => p.cause !== primaryCause)
              .map((item) => (
                <div key={item.cause} className="flex items-center gap-3 text-xs">
                  <span className="w-36 text-slate-700 truncate font-medium flex items-center gap-1.5">
                    {getCauseIcon(item.cause)}
                    {item.cause}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-slate-400 transition-all duration-300"
                      style={{ width: `${item.probability}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono font-medium text-slate-600">
                    {item.probability}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
