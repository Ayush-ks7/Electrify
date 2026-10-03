import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { cn } from '../../utils/classNames';

export interface AnomalyTrendChartProps {
  className?: string;
  data?: Array<{ date: string; theft: number; fault: number; comm: number }>;
}

export function AnomalyTrendChart({ className, data }: AnomalyTrendChartProps) {
  const defaultData = [
    { date: 'Sep 05', theft: 12, fault: 9, comm: 7 },
    { date: 'Sep 10', theft: 15, fault: 10, comm: 9 },
    { date: 'Sep 15', theft: 14, fault: 9, comm: 8 },
    { date: 'Sep 20', theft: 20, fault: 12, comm: 10 },
    { date: 'Sep 25', theft: 26, fault: 18, comm: 14 },
    { date: 'Sep 30', theft: 22, fault: 16, comm: 11 },
    { date: 'Oct 03', theft: 18, fault: 13, comm: 8 },
  ];

  const chartData = data || defaultData;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Anomaly Detection Trend</CardTitle>
          <CardDescription>
            Flagged events grouped by cause classification over past 30 days
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
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
                            <span className="font-bold text-slate-800">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="rect" />
              <Area
                type="monotone"
                dataKey="theft"
                name="Suspected Theft"
                stackId="1"
                stroke="#dc2626"
                fill="#fca5a5"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="fault"
                name="Meter Fault"
                stackId="1"
                stroke="#ea580c"
                fill="#fdba74"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="comm"
                name="Comm Issue"
                stackId="1"
                stroke="#0F52BA"
                fill="#93c5fd"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
