import React from 'react';
import { Database, ShieldCheck, UserCheck, Search, Tag, AlertOctagon, BellRing, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface PipelineFlowProps {
  className?: string;
  activeStage?: number;
}

export function PipelineFlow({ className, activeStage = 4 }: PipelineFlowProps) {
  const steps = [
    {
      id: 1,
      title: 'Meter Data',
      desc: '1.48M raw telemetry readings',
      icon: <Database className="w-4 h-4" />,
      status: 'Ready',
    },
    {
      id: 2,
      title: 'Data Quality',
      desc: '98.6% valid, deduplicated',
      icon: <ShieldCheck className="w-4 h-4" />,
      status: 'Cleaned',
    },
    {
      id: 3,
      title: 'Consumer Profile',
      desc: 'Baselines & peer clusters',
      icon: <UserCheck className="w-4 h-4" />,
      status: 'Profiled',
    },
    {
      id: 4,
      title: 'Anomaly Detection',
      desc: 'Hybrid Isolation Forest & Z-score',
      icon: <Search className="w-4 h-4" />,
      status: 'Detected (342)',
    },
    {
      id: 5,
      title: 'Cause Classification',
      desc: 'Theft / Fault / Comm model',
      icon: <Tag className="w-4 h-4" />,
      status: 'Classified',
    },
    {
      id: 6,
      title: 'Risk Scoring',
      desc: 'Multi-factor severity indexing',
      icon: <AlertOctagon className="w-4 h-4" />,
      status: 'Scored (48 High)',
    },
    {
      id: 7,
      title: 'Alerts & Cases',
      desc: 'Operator dispatch & workflow',
      icon: <BellRing className="w-4 h-4" />,
      status: '14 Critical',
    },
  ];

  return (
    <div className={cn('bg-white border border-slate-200 rounded-md p-4', className)}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Automated Analytics Pipeline Architecture
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Last Batch Sync: 10 mins ago • Next: 5 mins
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {steps.map((step, idx) => {
          const isPassed = step.id <= activeStage;
          const isCurrent = step.id === activeStage;

          return (
            <div
              key={step.id}
              className={cn(
                'relative p-3 rounded border text-xs flex flex-col justify-between transition-colors',
                isCurrent
                  ? 'bg-blue-50/60 border-blue-300 text-slate-900 ring-1 ring-blue-500/20'
                  : isPassed
                  ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                  : 'bg-white border-slate-100 text-slate-400'
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span
                  className={cn(
                    'p-1 rounded',
                    isCurrent
                      ? 'bg-[#0F52BA] text-white'
                      : isPassed
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {step.icon}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-bold">
                  0{step.id}
                </span>
              </div>

              <div>
                <p className="font-semibold text-slate-900 leading-tight mb-0.5">
                  {step.title}
                </p>
                <p className="text-[11px] text-slate-500 leading-snug">{step.desc}</p>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] font-mono font-medium text-slate-600">
                  {step.status}
                </span>
                {idx < steps.length - 1 && (
                  <ArrowRight className="hidden md:block w-3 h-3 text-slate-400 -mr-1" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
