import React from 'react';
import { ModelSignal } from '../../types';
import { Cpu, Activity, Clock, Layers } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface ModelSignalCardProps {
  signal: ModelSignal;
  className?: string;
}

export function ModelSignalCard({ signal, className }: ModelSignalCardProps) {
  const getSignalIcon = (type: ModelSignal['signalType']) => {
    switch (type) {
      case 'statistical':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'isolation_forest':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'temporal':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'classification':
        return <Cpu className="w-4 h-4 text-red-600" />;
    }
  };

  const statusStyles = {
    critical: 'border-l-4 border-l-red-600 bg-red-50/30',
    warning: 'border-l-4 border-l-amber-500 bg-amber-50/30',
    normal: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
  }[signal.status];

  const badgeStyles = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[signal.status];

  return (
    <div
      className={cn(
        'p-3.5 bg-white border border-slate-200 rounded-md transition-colors',
        statusStyles,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {getSignalIcon(signal.signalType)}
          <span className="text-xs font-semibold text-slate-900">{signal.name}</span>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded border text-[10px] font-mono uppercase font-bold',
            badgeStyles
          )}
        >
          {signal.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono mb-2">
        <div>
          <span className="text-slate-500">Value: </span>
          <span className="font-bold text-slate-900">{signal.score}</span>
        </div>
        <div>
          <span className="text-slate-500">Threshold: </span>
          <span className="text-slate-700">{signal.threshold}</span>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-snug">{signal.description}</p>
    </div>
  );
}
