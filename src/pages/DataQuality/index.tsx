import React from 'react';
import { useDataQuality } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { KpiCard } from '../../components/cards/KpiCard';
import { QualityTrendChart } from '../../components/charts/QualityTrendChart';
import { QualityIssueTable } from '../../components/tables/QualityIssueTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { ShieldCheck, AlertTriangle, Cpu, Copy } from 'lucide-react';

export function DataQuality() {
  const { data: dq, isLoading } = useDataQuality();

  const issueTypes = dq?.issueTypeDistribution || [
    { name: 'Missing Values', count: 1840, color: '#f59e0b' },
    { name: 'Time Gaps', count: 920, color: '#ea580c' },
    { name: 'Invalid Measurements', count: 480, color: '#dc2626' },
    { name: 'Duplicates', count: 340, color: '#64748b' },
    { name: 'Outliers', count: 210, color: '#0F52BA' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        description="Telemetry sanitization health, time-series gap imputation, and smart meter hardware communication integrity"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Data Quality' }]}
      />

      {/* Top 4 Required KPIs: Quality Score, Missing %, Invalid %, Duplicate % */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Quality Score"
          value={`${dq?.qualityScore || 98.6}%`}
          changePct={0.4}
          isPositiveGood={true}
          changeLabel="clean score"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Missing %"
          value={`${dq?.missingPct || 0.84}%`}
          changePct={-0.12}
          isPositiveGood={false}
          changeLabel="dropped packets"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Invalid %"
          value={`${dq?.invalidPct || 0.31}%`}
          changePct={-0.05}
          isPositiveGood={false}
          changeLabel="parity/overflow errors"
          icon={<Cpu className="w-4 h-4 text-red-600" />}
        />
        <KpiCard
          title="Duplicate %"
          value={`${dq?.duplicatesPct || 0.23}%`}
          changePct={-0.08}
          isPositiveGood={false}
          changeLabel="deduped records"
          icon={<Copy className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {/* Middle Row: Quality Trend Chart + Issue Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QualityTrendChart data={dq?.trend || []} />
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <div>
                <CardTitle>Issue Distribution</CardTitle>
                <CardDescription>
                  Categorization of raw telemetry cleansing exceptions
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={issueTypes}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {issueTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0];
                          return (
                            <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                              <span className="font-bold text-slate-800">{d.name}: </span>
                              <span>{d.value} incidents</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Problem Meters Table: Meter | Issue | Count | Severity | Last Seen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Problem Meters Exception Queue
            </h3>
            <p className="text-xs text-slate-500">
              Hardware communication and invalid measurement telemetry incidents flagged for resolution
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {dq?.issues?.length || 0} Flagged Meters
          </span>
        </div>

        <QualityIssueTable issues={dq?.issues || []} />
      </div>
    </div>
  );
}
