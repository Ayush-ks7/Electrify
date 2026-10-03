import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ConsumptionDataPoint } from '../../types';
import { cn } from '../../utils/classNames';

export interface ConsumptionTrendChartProps {
  data: ConsumptionDataPoint[];
  timeframe: '24H' | '7D' | '30D' | '1Y';
  onTimeframeChange: (tf: '24H' | '7D' | '30D' | '1Y') => void;
  className?: string;
  showBaselineToggle?: boolean;
  live?: boolean;
}

export function ConsumptionTrendChart({
  data,
  timeframe,
  onTimeframeChange,
  className,
  showBaselineToggle = true,
  live = false,
}: ConsumptionTrendChartProps) {
  const [showBaseline, setShowBaseline] = useState(true);

  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-md p-4',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {live
              ? 'Consumer Daily Consumption'
              : 'System Aggregate Consumption Trend'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {live
              ? 'Stored daily readings; window ends at latest reading. Gaps remain missing.'
              : 'Active metered load vs calculated baseline model'}
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
                disabled={live && tf === '24H'}
                title={
                  live && tf === '24H'
                    ? 'Hourly readings are unavailable'
                    : undefined
                }
                onClick={() => onTimeframeChange(tf)}
                className={cn(
                  'px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900',
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-72 w-full min-w-0">
        {live && !data.some((point) => point.actual !== null) ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No observed daily consumption in this window.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
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
                        <p className="font-bold text-slate-900 mb-1 font-sans">
                          {label}
                        </p>
                        {payload.map((entry: any, index: number) => (
                          <div
                            key={`item-${index}`}
                            className="flex items-center justify-between gap-4 py-0.5"
                          >
                            <span
                              style={{ color: entry.color }}
                              className="font-medium"
                            >
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
                isAnimationActive={!live}
                name="Actual Consumption"
                stroke="#0F52BA"
                strokeWidth={2}
                dot={live ? { r: 2 } : timeframe === '24H' || timeframe === '7D'}
                activeDot={{ r: 5, fill: '#0F52BA' }}
              />
              {showBaselineToggle && showBaseline && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name={live ? 'Pre-simulation baseline' : 'Baseline Model'}
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
