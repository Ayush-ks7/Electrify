import React from 'react';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { cn } from '../../utils/classNames';

export interface HourlyHeatmapChartProps {
  data: Array<{ hour: string; avgKwh: number; anomalyRatePct: number }>;
  className?: string;
}

export function HourlyHeatmapChart({ data, className }: HourlyHeatmapChartProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Diurnal Load & Hourly Anomaly Vulnerability</CardTitle>
          <CardDescription>
            System average hourly load vs anomalous divergence probability
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#0F52BA"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${v}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#dc2626"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-slate-300 rounded p-2.5 shadow-md text-xs font-mono">
                        <p className="font-bold text-slate-800 font-sans mb-1">{label}</p>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-[#0F52BA] font-medium">Avg Load:</span>
                          <span className="font-bold text-slate-800">
                            {payload[0]?.value} kWh
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-red-600 font-medium">Anomaly Rate:</span>
                          <span className="font-bold text-slate-800">
                            {payload[1]?.value}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar
                yAxisId="left"
                dataKey="avgKwh"
                name="Avg Grid Load (kWh)"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="anomalyRatePct"
                name="Anomaly Rate %"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 3, fill: '#dc2626' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
