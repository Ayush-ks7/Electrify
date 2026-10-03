import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Consumer } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { formatTimestamp, formatKwh } from '../../utils/formatters';
import { ChevronRight, ArrowUpDown, ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface ConsumerTableProps {
  consumers: Consumer[];
  isLoading?: boolean;
  className?: string;
}

export type ConsumerSortField = 'id' | 'name' | 'meter' | 'usage' | 'risk' | 'anomaly' | 'updated';

export function ConsumerTable({ consumers, isLoading, className }: ConsumerTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<ConsumerSortField>('risk');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: ConsumerSortField) => {
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
    } else if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'meter') {
      comparison = a.meterId.localeCompare(b.meterId);
    } else if (sortField === 'usage') {
      comparison = a.consumption.current - b.consumption.current;
    } else if (sortField === 'risk') {
      comparison = a.risk.score - b.risk.score;
    } else if (sortField === 'anomaly') {
      comparison = a.anomaly.score - b.anomaly.score;
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
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Consumer
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('meter')}
              >
                <div className="flex items-center gap-1">
                  Meter
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('usage')}
              >
                <div className="flex items-center gap-1">
                  Usage
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('risk')}
              >
                <div className="flex items-center gap-1">
                  Risk
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Status</th>
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
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#0F52BA] animate-ping" />
                    Loading consumers...
                  </div>
                </td>
              </tr>
            ) : paginatedConsumers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No matching consumers found.
                </td>
              </tr>
            ) : (
              paginatedConsumers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/consumers/${c.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  {/* Consumer Name + ID */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 group-hover:text-[#0F52BA] transition-colors">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.id} • {c.substation}
                    </div>
                  </td>

                  {/* Meter ID + Tariff */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-medium text-slate-900">{c.meterId}</div>
                    <div className="text-[11px] text-slate-500">{c.tariffType}</div>
                  </td>

                  {/* Usage */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">
                      {formatKwh(c.consumption.current)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.metrics.baselineDeviationPct < 0 ? (
                        <span className="text-red-600 font-medium">
                          {c.metrics.baselineDeviationPct}% vs base
                        </span>
                      ) : (
                        <span>+{c.metrics.baselineDeviationPct}% vs base</span>
                      )}
                    </div>
                  </td>

                  {/* Risk + Anomaly Score */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <RiskIndicator score={c.risk.score} severity={c.risk.severity} size="sm" />
                      <span className="text-[11px] font-mono text-slate-500">
                        ({(c.anomaly.score * 100).toFixed(0)}% anom)
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} size="sm" />
                  </td>

                  {/* Updated */}
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatTimestamp(c.updatedAt)}
                  </td>

                  {/* Action arrow */}
                  <td className="py-3 px-3 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F52BA] group-hover:translate-x-0.5 transition-all inline" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing{' '}
          <span className="font-mono font-bold text-slate-900">
            {paginatedConsumers.length > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-mono font-bold text-slate-900">
            {Math.min(page * pageSize, sortedConsumers.length)}
          </span>{' '}
          of{' '}
          <span className="font-mono font-bold text-slate-900">
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
