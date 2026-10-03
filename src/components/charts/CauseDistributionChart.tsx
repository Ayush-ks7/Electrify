import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { cn } from '../../utils/classNames';

export interface CauseDistributionChartProps {
  className?: string;
  data?: Array<{ name: string; count: number; percentage: number; color: string }>;
}

export function CauseDistributionChart({ className, data }: CauseDistributionChartProps) {
  const defaultData = [
    { name: 'Suspected Theft', count: 142, percentage: 41.5, color: '#dc2626' },
    { name: 'Meter Fault', count: 98, percentage: 28.7, color: '#ea580c' },
    { name: 'Comm Issue', count: 64, percentage: 18.7, color: '#0F52BA' },
    { name: 'Legitimate Behaviour', count: 38, percentage: 11.1, color: '#059669' },
  ];

  const chartData = data || defaultData;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Likely Cause Distribution</CardTitle>
          <CardDescription>
            Multi-class classifier breakdown for active cases
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" fontSize={11} stroke="#64748b" tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                stroke="#64748b"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                        <p className="font-bold text-slate-800 font-sans">{item.name}</p>
                        <p className="text-slate-600">
                          {item.count} cases ({item.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
