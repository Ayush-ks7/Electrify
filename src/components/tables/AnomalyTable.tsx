import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnomalyItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { AnomalyScoreBadge } from '../common/AnomalyScoreBadge';
import { formatTimestamp } from '../../utils/formatters';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface AnomalyTableProps {
  anomalies: AnomalyItem[];
  isLoading?: boolean;
  className?: string;
}

export function AnomalyTable({ anomalies, isLoading, className }: AnomalyTableProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('bg-white border border-slate-200 rounded-md overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3.5">Anomaly ID</th>
              <th className="py-3 px-3.5">Consumer & Location</th>
              <th className="py-3 px-3.5">Meter ID</th>
              <th className="py-3 px-3.5">Risk Score</th>
              <th className="py-3 px-3.5">Likely Cause</th>
              <th className="py-3 px-3.5">Anomaly Score</th>
              <th className="py-3 px-3.5">Model Confidence</th>
              <th className="py-3 px-3.5">Severity</th>
              <th className="py-3 px-3.5">Detected Time</th>
              <th className="py-3 px-3.5">Case Status</th>
              <th className="py-3 px-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    Querying anomaly records...
                  </div>
                </td>
              </tr>
            ) : anomalies.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No matching anomalies found.
                </td>
              </tr>
            ) : (
              anomalies.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/anomalies/${a.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3.5">
                    <span className="font-mono font-bold text-slate-900 group-hover:text-[#0F52BA]">
                      {a.id}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-medium text-slate-900">{a.consumerName}</div>
                    <div className="text-[11px] text-slate-500">
                      {a.consumerId} • {a.substation}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-700">{a.meterId}</td>
                  <td className="py-3 px-3.5">
                    <RiskIndicator score={a.riskScore} severity={a.severity} size="sm" />
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="font-medium text-slate-800">{a.likelyCause}</span>
                  </td>
                  <td className="py-3 px-3.5">
                    <AnomalyScoreBadge score={a.anomalyScore} />
                  </td>
                  <td className="py-3 px-3.5 font-mono font-medium text-slate-700">
                    {a.confidence}%
                  </td>
                  <td className="py-3 px-3.5">
                    <SeverityBadge severity={a.severity} size="sm" />
                  </td>
                  <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                    {formatTimestamp(a.detectedAt)}
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-medium border',
                        a.status === 'Investigating' && 'bg-blue-50 text-blue-700 border-blue-200',
                        a.status === 'Unresolved' && 'bg-red-50 text-red-700 border-red-200',
                        a.status === 'Confirmed' && 'bg-purple-50 text-purple-700 border-purple-200',
                        a.status === 'Dismissed' && 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                    >
                      {a.status}
                    </span>
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
    </div>
  );
}
