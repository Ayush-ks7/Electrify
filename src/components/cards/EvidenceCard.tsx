import React from 'react';
import { EvidenceItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { ArrowDown, TrendingUp, Users, Calendar, AlertOctagon, Wrench } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface EvidenceCardProps {
  item: EvidenceItem;
  className?: string;
}

export function EvidenceCard({ item, className }: EvidenceCardProps) {
  const getIcon = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'drop':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'night_surge':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'peer_divergence':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'persistence':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'model_outlier':
        return <AlertOctagon className="w-4 h-4 text-red-600" />;
      case 'tamper':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertOctagon className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div
      className={cn(
        'p-3.5 bg-white border border-slate-200 rounded-md transition-colors hover:border-slate-300',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-slate-100 shrink-0">{getIcon(item.type)}</span>
          <span className="text-xs font-semibold text-slate-900 leading-snug">{item.label}</span>
        </div>
        <SeverityBadge severity={item.severity} size="sm" />
      </div>

      <div className="flex items-baseline gap-1.5 mb-1.5 pl-7">
        <span className="text-lg font-bold font-mono text-slate-900">{item.value}</span>
        {item.unit && <span className="text-xs font-mono text-slate-500">{item.unit}</span>}
      </div>

      <p className="text-xs text-slate-600 pl-7 leading-relaxed">{item.explanation}</p>
    </div>
  );
}
