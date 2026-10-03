import React from 'react';
import { useDataQuality } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { KpiCard } from '../../components/cards/KpiCard';
import { QualityTrendChart } from '../../components/charts/QualityTrendChart';
import { QualityIssueTable } from '../../components/tables/QualityIssueTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  Clock,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';

export function DataQuality() {
  const { data: dq, isLoading } = useDataQuality();

  const issueTypeData = [
    { name: 'Missing Values', count: 1840, color: '#f59e0b' },
    { name: 'Time Gaps', count: 920, color: '#f97316' },
    { name: 'Invalid Measurements', count: 480, color: '#ef4444' },
    { name: 'Duplicates', count: 340, color: '#64748b' },
    { name: 'Outliers', count: 210, color: '#8b5cf6' },
  ];

  const topMetersMissing = [
    { meterId: 'MTR-33981', gaps: 144, location: 'Rural 11kV' },
    { meterId: 'MTR-81903', gaps: 96, location: 'Central 11kV' },
    { meterId: 'MTR-10294', gaps: 48, location: 'North 33kV' },
    { meterId: 'MTR-40911', gaps: 36, location: 'East 33kV' },
    { meterId: 'MTR-55410', gaps: 24, location: 'HighTech 66kV' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Cleaning & Ingestion Quality"
        description="Telemetry sanitization metrics, time-series gap filling, and hardware communication integrity"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Data Quality' }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Records Ingested"
          value={dq?.recordsProcessed ? `${(dq.recordsProcessed / 1000000).toFixed(2)}M` : '1.48M'}
          changePct={1.8}
          isPositiveGood={true}
          changeLabel="24h throughput"
          icon={<Layers className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Overall Quality"
          value={`${dq?.qualityScore || 98.6}%`}
          changePct={0.4}
          isPositiveGood={true}
          changeLabel="clean score"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Valid Telemetry"
          value={`${dq?.validPct || 98.62}%`}
          changePct={0.2}
          isPositiveGood={true}
          icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Missing Values"
          value={`${dq?.missingPct || 0.84}%`}
          changePct={-0.12}
          isPositiveGood={false}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Invalid Read"
          value={`${dq?.invalidPct || 0.31}%`}
          changePct={-0.05}
          isPositiveGood={false}
          icon={<Cpu className="w-4 h-4 text-red-600" />}
        />
        <KpiCard
          title="Duplicates"
          value={`${dq?.duplicatesPct || 0.23}%`}
          changePct={-0.08}
          isPositiveGood={false}
          icon={<Copy className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {/* Main Trend Chart */}
      <QualityTrendChart data={dq?.trend || []} />

      {/* Secondary Charts: Top Meters with Missing Data & Issue Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Meters with Missing Readings */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top Meters with Missing / Gapped Intervals</CardTitle>
              <CardDescription>
                Smart meters with the highest frequency of dropped telemetry packets
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMetersMissing}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={11} stroke="#64748b" tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="meterId"
                    fontSize={11}
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                            <p className="font-bold text-slate-800">{d.meterId}</p>
                            <p className="text-slate-600">Location: {d.location}</p>
                            <p className="text-red-600 font-bold">{d.gaps} missing intervals</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="gaps" fill="#ea580c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Issue Type Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Data Quality Issue Breakdown</CardTitle>
              <CardDescription>
                Categorization of raw telemetry cleansing exceptions
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={issueTypeData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {issueTypeData.map((entry, index) => (
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

      {/* Active Data Cleaning & Hardware Exceptions Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Active Hardware & Telemetry Exception Queue
        </h3>
        <QualityIssueTable issues={dq?.issues || []} />
      </div>
    </div>
  );
}
