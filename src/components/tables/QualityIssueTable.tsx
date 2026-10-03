import React from 'react';
import { QualityIssueItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatTimestamp } from '../../utils/formatters';
import { cn } from '../../utils/classNames';

export interface QualityIssueTableProps {
  issues: QualityIssueItem[];
  className?: string;
}

export function QualityIssueTable({ issues, className }: QualityIssueTableProps) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-md overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3.5">Meter ID</th>
              <th className="py-3 px-3.5">Substation Feeder</th>
              <th className="py-3 px-3.5">Issue Classification</th>
              <th className="py-3 px-3.5">Fault Count</th>
              <th className="py-3 px-3.5">Last Occurrence</th>
              <th className="py-3 px-3.5">Severity</th>
              <th className="py-3 px-3.5">Resolution Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                  {issue.meterId}
                </td>
                <td className="py-3 px-3.5 text-slate-700">{issue.substation}</td>
                <td className="py-3 px-3.5">
                  <span className="font-semibold text-slate-800">{issue.issue}</span>
                </td>
                <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                  {issue.count}
                </td>
                <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                  {formatTimestamp(issue.lastOccurrence)}
                </td>
                <td className="py-3 px-3.5">
                  <SeverityBadge severity={issue.severity} size="sm" />
                </td>
                <td className="py-3 px-3.5">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded border text-[11px] font-medium font-mono',
                      issue.resolutionStatus === 'Requires Field Visit' &&
                        'bg-red-50 text-red-700 border-red-200',
                      issue.resolutionStatus === 'Auto-Imputed' &&
                        'bg-emerald-50 text-emerald-700 border-emerald-200',
                      issue.resolutionStatus === 'Pending' &&
                        'bg-amber-50 text-amber-700 border-amber-200'
                    )}
                  >
                    {issue.resolutionStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
