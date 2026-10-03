import React from 'react';
import { CaseTimelineItem } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import { Clock, CheckCircle2, User, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface TimelineProps {
  items: CaseTimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500">
        No case events recorded yet.
      </div>
    );
  }

  const getIcon = (type: CaseTimelineItem['type']) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'assignment':
        return <User className="w-3.5 h-3.5 text-purple-600" />;
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-slate-600" />;
      case 'system':
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className={cn('relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200', className)}>
      {items.map((item) => (
        <div key={item.id} className="relative group text-xs">
          <div className="absolute -left-5 top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-white border border-slate-300">
            {getIcon(item.type)}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-slate-900">{item.action}</span>
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
            <div className="text-slate-600 mb-1">
              <span className="font-medium text-slate-800">{item.author}</span>
              <span className="text-slate-400"> ({item.role})</span>
            </div>
            {item.note && (
              <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 text-xs mt-1">
                {item.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
