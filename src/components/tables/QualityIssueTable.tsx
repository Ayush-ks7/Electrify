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
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3.5">Meter</th>
              <th className="py-2.5 px-3.5">Issue</th>
              <th className="py-2.5 px-3.5">Count</th>
              <th className="py-2.5 px-3.5">Severity</th>
              <th className="py-2.5 px-3.5">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">
                  {issue.meterId}
                </td>
                <td className="py-2.5 px-3.5">
                  <span className="font-medium text-slate-800">{issue.issue}</span>
                </td>
                <td className="py-2.5 px-3.5 font-mono text-slate-700">
                  {issue.count}
                </td>
                <td className="py-2.5 px-3.5">
                  <SeverityBadge severity={issue.severity} size="sm" />
                </td>
                <td className="py-2.5 px-3.5 font-mono text-xs text-slate-500">
                  {formatTimestamp(issue.lastOccurrence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
