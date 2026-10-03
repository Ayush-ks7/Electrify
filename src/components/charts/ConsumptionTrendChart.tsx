import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ConsumptionDataPoint } from '../../types';
import { Button } from '../ui/button';
import { cn } from '../../utils/classNames';

export interface ConsumptionTrendChartProps {
  data: ConsumptionDataPoint[];
  timeframe: '24H' | '7D' | '30D' | '1Y';
  onTimeframeChange: (tf: '24H' | '7D' | '30D' | '1Y') => void;
  className?: string;
  showBaselineToggle?: boolean;
}

export function ConsumptionTrendChart({
  data,
  timeframe,
  onTimeframeChange,
  className,
  showBaselineToggle = true,
}: ConsumptionTrendChartProps) {
  const [showBaseline, setShowBaseline] = useState(true);

  return (
    <div className={cn('bg-white border border-slate-200 rounded-md p-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            System Aggregate Consumption Trend
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active metered load vs calculated baseline model
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showBaselineToggle && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 mr-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBaseline}
                onChange={(e) => setShowBaseline(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              Show Baseline
            </label>
          )}

          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
            {(['24H', '7D', '30D', '1Y'] as const).map((tf) => (
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
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  return (
                    <div className="bg-white border border-slate-300 rounded p-2.5 shadow-md text-xs font-mono">
                      <p className="font-bold text-slate-900 mb-1 font-sans">{label}</p>
                      {payload.map((entry: any, index: number) => (
                        <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                          <span style={{ color: entry.color }} className="font-medium">
                            {entry.name}:
                          </span>
                          <span className="font-bold text-slate-800">
                            {entry.value} kWh
                          </span>
                        </div>
                      ))}
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
              strokeWidth={2}
              dot={timeframe === '24H' || timeframe === '7D'}
              activeDot={{ r: 5, fill: '#0F52BA' }}
            />
            {showBaseline && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline Model"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
