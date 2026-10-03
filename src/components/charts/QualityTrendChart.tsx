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

export interface QualityTrendChartProps {
  data: Array<{
    date: string;
    qualityScore: number;
    missingCount: number;
    duplicateCount: number;
  }>;
  className?: string;
}

export function QualityTrendChart({ data, className }: QualityTrendChartProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Data Quality % vs Data Ingestion Gaps</CardTitle>
          <CardDescription>
            7-day rolling quality score index and volume of missing intervals
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                yAxisId="left"
                domain={[95, 100]}
                stroke="#0F52BA"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ea580c"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-slate-300 rounded p-2.5 shadow-md text-xs font-mono">
                        <p className="font-bold text-slate-800 font-sans mb-1">{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <div key={`entry-${index}`} className="flex items-center justify-between gap-3 py-0.5">
                            <span style={{ color: entry.color }} className="font-medium">
                              {entry.name}:
                            </span>
                            <span className="font-bold text-slate-800">
                              {entry.dataKey === 'qualityScore' ? `${entry.value}%` : entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar
                yAxisId="right"
                dataKey="missingCount"
                name="Missing Readings"
                fill="#fdba74"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="qualityScore"
                name="Quality Score %"
                stroke="#0F52BA"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0F52BA' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
