import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Consumer } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { AnomalyScoreBadge } from '../common/AnomalyScoreBadge';
import { formatTimestamp, formatKwh } from '../../utils/formatters';
import { ChevronRight, ArrowUpDown, ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface ConsumerTableProps {
  consumers: Consumer[];
  isLoading?: boolean;
  className?: string;
}

export function ConsumerTable({ consumers, isLoading, className }: ConsumerTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<'id' | 'risk' | 'usage' | 'updated'>('risk');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: 'id' | 'risk' | 'usage' | 'updated') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedConsumers = [...consumers].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'id') {
      comparison = a.id.localeCompare(b.id);
    } else if (sortField === 'risk') {
      comparison = a.risk.score - b.risk.score;
    } else if (sortField === 'usage') {
      comparison = a.consumption.current - b.consumption.current;
    } else if (sortField === 'updated') {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedConsumers.length / pageSize) || 1;
  const paginatedConsumers = sortedConsumers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={cn('bg-white border border-slate-200 rounded-md overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  Consumer ID / Meter
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3.5">Tariff & Substation</th>
              <th
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('usage')}
              >
                <div className="flex items-center gap-1">
                  Usage / Baseline
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('risk')}
              >
                <div className="flex items-center gap-1">
                  Risk Score
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3.5">Anomaly Score</th>
              <th className="py-3 px-3.5">Likely Cause</th>
              <th className="py-3 px-3.5">Severity</th>
              <th className="py-3 px-3.5">Status</th>
              <th
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('updated')}
              >
                <div className="flex items-center gap-1">
                  Updated
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    Querying grid records...
                  </div>
                </td>
              </tr>
            ) : paginatedConsumers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No matching consumers found.
                </td>
              </tr>
            ) : (
              paginatedConsumers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/consumers/${c.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900 group-hover:text-[#0F52BA]">
                      {c.id}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{c.meterId}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-medium text-slate-800">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.tariffType} • {c.feeder}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono">
                    <div className="font-bold text-slate-900">
                      {formatKwh(c.consumption.current)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Base: {formatKwh(c.consumption.baseline)} (
                      <span
                        className={
                          c.metrics.baselineDeviationPct < -20
                            ? 'text-red-600 font-bold'
                            : 'text-slate-600'
                        }
                      >
                        {c.metrics.baselineDeviationPct > 0 ? '+' : ''}
                        {c.metrics.baselineDeviationPct}%
                      </span>
                      )
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <RiskIndicator score={c.risk.score} severity={c.risk.severity} size="sm" />
                  </td>
                  <td className="py-3 px-3.5">
                    <AnomalyScoreBadge score={c.anomaly.score} />
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-medium text-slate-800">
                      {c.classification.cause}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.classification.confidence}% conf
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <SeverityBadge severity={c.risk.severity} size="sm" />
                  </td>
                  <td className="py-3 px-3.5">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                    {formatTimestamp(c.updatedAt)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F52BA] transition-transform group-hover:translate-x-0.5 inline" />
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
          <span className="font-mono font-bold text-slate-800">
            {paginatedConsumers.length > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-mono font-bold text-slate-800">
            {Math.min(page * pageSize, sortedConsumers.length)}
          </span>{' '}
          of{' '}
          <span className="font-mono font-bold text-slate-800">
            {sortedConsumers.length}
          </span>{' '}
          consumers
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
