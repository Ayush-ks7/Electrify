import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { ConsumptionDataPoint } from '../../types';
import { cn } from '../../utils/classNames';

export interface ActualBaselinePeerChartProps {
  data: ConsumptionDataPoint[];
  unit?: string;
  timeframe: '24H' | '7D' | '30D';
  onTimeframeChange?: (tf: '24H' | '7D' | '30D') => void;
  className?: string;
  height?: number;
}

export function ActualBaselinePeerChart({
  data,
  unit = 'kWh',
  timeframe,
  onTimeframeChange,
  className,
  height = 320,
}: ActualBaselinePeerChartProps) {
  const anomalyPoints = data.filter((d) => d.isAnomaly);

  return (
    <div className={cn('bg-white border border-slate-200 rounded-md p-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Comparative Consumption Profile
            </h3>
            {anomalyPoints.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                {anomalyPoints.length} Anomalous Points Flagged
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Actual load vs Historical harmonic baseline vs Normalized feeder peer group
          </p>
        </div>

        {onTimeframeChange && (
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
            {(['24H', '7D', '30D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={cn(
                  'px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors',
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const isAnom = payload[0]?.payload?.isAnomaly;
                  return (
                    <div className="bg-white border border-slate-300 rounded p-3 shadow-md text-xs font-mono">
                      <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-slate-100 font-sans">
                        <span className="font-bold text-slate-900">{label}</span>
                        {isAnom && (
                          <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            Anomaly Flag
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#0F52BA] font-medium">Actual Meter:</span>
                          <span className="font-bold text-slate-900">
                            {payload.find((p) => p.dataKey === 'actual')?.value} {unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500 font-medium">Harmonic Baseline:</span>
                          <span className="text-slate-700">
                            {payload.find((p) => p.dataKey === 'baseline')?.value} {unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-emerald-700 font-medium">Feeder Peer Avg:</span>
                          <span className="text-slate-700">
                            {payload.find((p) => p.dataKey === 'peerAverage')?.value} {unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              iconType="plainline"
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Consumption"
              stroke="#0F52BA"
              strokeWidth={2.2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isAnomaly) {
                  return (
                    <circle
                      key={`dot-${payload.timestamp}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                }
                return (
                  <circle
                    key={`dot-${payload.timestamp}`}
                    cx={cx}
                    cy={cy}
                    r={2.5}
                    fill="#0F52BA"
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#0F52BA' }}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Baseline Model"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="peerAverage"
              name="Peer Average"
              stroke="#059669"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
