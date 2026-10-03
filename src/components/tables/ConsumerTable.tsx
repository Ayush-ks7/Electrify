import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConsumerSummary } from '../../types/api';
import { probabilityLabel, reviewLabel, scoreFor } from '../../utils/liveData';
import { formatTimestamp } from '../../utils/formatters';
import { ChevronRight, ArrowUpDown, ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface ConsumerTableProps {
  consumers: ConsumerSummary[];
  isLoading?: boolean;
  className?: string;
}

export type ConsumerSortField = 'id' | 'risk' | 'updated';

export function ConsumerTable({
  consumers,
  isLoading,
  className,
}: ConsumerTableProps) {
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
    } else if (sortField === 'risk') {
      comparison =
        (scoreFor(a.risk)?.predicted_probability ?? -1) -
        (scoreFor(b.risk)?.predicted_probability ?? -1);
    } else if (sortField === 'updated') {
      comparison =
        new Date(a.risk?.created_at ?? a.createdAt).getTime() -
        new Date(b.risk?.created_at ?? b.createdAt).getTime();
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedConsumers.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedConsumers = sortedConsumers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-md overflow-hidden',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  Consumer
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Meter</th>
              <th className="py-3 px-4">Usage</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                onClick={() => handleSort('risk')}
              >
                <div className="flex items-center gap-1">
                  Probability
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
                  onClick={() =>
                    navigate(`/consumers/${encodeURIComponent(c.id)}`)
                  }
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  {/* Consumer Name + ID */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 group-hover:text-[#0F52BA] transition-colors">
                      {c.id}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Stored consumer
                    </div>
                  </td>

                  {/* Meter ID + Tariff */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-medium text-slate-900">
                      Unavailable
                    </div>
                    <div className="text-[11px] text-slate-500">
                      No meter metadata
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-500">View history</td>
                  <td className="py-3 px-4 font-mono">
                    {c.riskError
                      ? 'Unavailable'
                      : probabilityLabel(
                          scoreFor(c.risk)?.predicted_probability,
                        )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50">
                      {c.riskError ? 'Risk unavailable' : reviewLabel(c.risk)}
                    </span>
                  </td>

                  {/* Updated */}
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatTimestamp(c.risk?.created_at ?? c.createdAt)}
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
            {paginatedConsumers.length > 0
              ? (currentPage - 1) * pageSize + 1
              : 0}
          </span>{' '}
          to{' '}
          <span className="font-mono font-bold text-slate-900">
            {Math.min(currentPage * pageSize, sortedConsumers.length)}
          </span>{' '}
          of{' '}
          <span className="font-mono font-bold text-slate-900">
            {sortedConsumers.length}
          </span>{' '}
          consumers
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-xs font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
