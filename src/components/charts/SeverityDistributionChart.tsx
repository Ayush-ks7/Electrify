import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { cn } from '../../utils/classNames';

export interface SeverityDistributionChartProps {
  className?: string;
  data?: Array<{ name: string; value: number; color: string }>;
}

export function SeverityDistributionChart({ className, data }: SeverityDistributionChartProps) {
  const defaultData = [
    { name: 'Critical', value: 48, color: '#dc2626' },
    { name: 'High', value: 92, color: '#ea580c' },
    { name: 'Medium', value: 124, color: '#d97706' },
    { name: 'Low', value: 78, color: '#059669' },
  ];

  const chartData = data || defaultData;
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Severity Distribution</CardTitle>
          <CardDescription>Breakdown across active flagged anomalies ({total} total)</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={1.5}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    const val = data.value as number;
                    const pct = ((val / total) * 100).toFixed(1);
                    return (
                      <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                        <span className="font-bold text-slate-800">{data.name}: </span>
                        <span>{val} ({pct}%)</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
