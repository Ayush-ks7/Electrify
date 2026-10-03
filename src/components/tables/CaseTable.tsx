import React, { useState } from 'react';
import { CaseItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { formatTimestamp } from '../../utils/formatters';
import { ChevronRight, ArrowUpDown, ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface CaseTableProps {
  cases: CaseItem[];
  isLoading?: boolean;
  onSelectCase: (caseItem: CaseItem) => void;
  className?: string;
}

export type CaseSortField = 'id' | 'consumer' | 'priority' | 'cause' | 'assignee' | 'status' | 'updated';

export function CaseTable({ cases, isLoading, onSelectCase, className }: CaseTableProps) {
  const [sortField, setSortField] = useState<CaseSortField>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: CaseSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCases = [...cases].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'id') {
      comparison = a.id.localeCompare(b.id);
    } else if (sortField === 'consumer') {
      comparison = a.consumerName.localeCompare(b.consumerName);
    } else if (sortField === 'priority') {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      comparison = (priorityOrder[a.severity] || 0) - (priorityOrder[b.severity] || 0);
    } else if (sortField === 'cause') {
      comparison = a.cause.localeCompare(b.cause);
    } else if (sortField === 'assignee') {
      comparison = a.assignee.localeCompare(b.assignee);
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortField === 'updated') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedCases.length / pageSize) || 1;
  const paginatedCases = sortedCases.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={cn('bg-white border border-slate-200 rounded-md overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  Case
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('consumer')}
              >
                <div className="flex items-center gap-1">
                  Consumer
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">
                  Priority
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('cause')}
              >
                <div className="flex items-center gap-1">
                  Cause
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('assignee')}
              >
                <div className="flex items-center gap-1">
                  Assignee
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('updated')}
              >
                <div className="flex items-center gap-1">
                  Updated
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#0F52BA] animate-ping" />
                    Loading cases...
                  </div>
                </td>
              </tr>
            ) : paginatedCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  No matching cases found.
                </td>
              </tr>
            ) : (
              paginatedCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 group-hover:text-[#0F52BA] transition-colors">
                      {c.id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{c.consumerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.consumerId} • {c.meterId}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={c.severity} size="sm" />
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{c.cause}</td>
                  <td className="py-3 px-4 text-slate-700">{c.assignee}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatTimestamp(c.createdAt)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F52BA] group-hover:translate-x-0.5 transition-all inline" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing{' '}
          <span className="font-mono font-bold text-slate-900">
            {paginatedCases.length > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-mono font-bold text-slate-900">
            {Math.min(page * pageSize, sortedCases.length)}
          </span>{' '}
          of{' '}
          <span className="font-mono font-bold text-slate-900">
            {sortedCases.length}
          </span>{' '}
          cases
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-xs font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
