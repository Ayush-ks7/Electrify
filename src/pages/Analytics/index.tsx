import React, { useState } from 'react';
import { useAnalytics } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityDistributionChart } from '../../components/charts/SeverityDistributionChart';
import { CauseDistributionChart } from '../../components/charts/CauseDistributionChart';
import { AnomalyTrendChart } from '../../components/charts/AnomalyTrendChart';
import { HourlyHeatmapChart } from '../../components/charts/HourlyHeatmapChart';
import { KpiCard } from '../../components/cards/KpiCard';
import { Tabs } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import {
  CheckCircle,
  TrendingDown,
  DollarSign,
  Clock,
  RotateCcw,
  ShieldAlert,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';

export function Analytics() {
  const [activeTab, setActiveTab] = useState<'risk' | 'anomalies' | 'consumption' | 'operations'>('risk');
  const [dateRange, setDateRange] = useState('30D');
  const [severity, setSeverity] = useState('all');
  const [cause, setCause] = useState('all');

  const { data: analytics, isLoading } = useAnalytics({
    dateRange,
    severity,
    cause,
  });

  const handleReset = () => {
    setDateRange('30D');
    setSeverity('all');
    setCause('all');
  };

  const tabsConfig = [
    { id: 'risk', label: 'Risk Analysis' },
    { id: 'anomalies', label: 'Anomalies & Causes' },
    { id: 'consumption', label: 'Consumption Patterns' },
    { id: 'operations', label: 'Operations & Resolution' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Comprehensive intelligence aggregation across risk distribution, anomaly signatures, and operational performance"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Analytics' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleReset}
          >
            Reset Filters
          </Button>
        }
      />

      {/* Top Filter Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs"
          >
            <option value="7D">Past 7 Days</option>
            <option value="30D">Past 30 Days</option>
            <option value="90D">Past 90 Days</option>
            <option value="1Y">Past 12 Months</option>
          </Select>

          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </Select>

          <Select
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Causes</option>
            <option value="Suspected Theft">Suspected Theft</option>
            <option value="Meter Fault">Meter Fault</option>
            <option value="Communication Issue">Communication Issue</option>
            <option value="Legitimate Behaviour">Legitimate Behaviour</option>
          </Select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Dataset: {analytics?.resolutionStats?.totalCases || 142} Total Analyzed Cases
        </span>
      </div>

      {/* Primary Section Tabs */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: RISK (Risk distribution + trend) */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Consumer Risk Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of consumer accounts across severity tiers
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics?.riskDistribution || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                                <span className="font-bold text-slate-800">{label}: </span>
                                <span>{payload[0].value} consumers</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {(analytics?.riskDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk Trend */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Average Risk Score Trend</CardTitle>
                  <CardDescription>
                    Fleet-wide risk rating tracking over consecutive periods
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics?.riskScoreTrend || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                                <p className="font-bold text-slate-800">{label}</p>
                                <p className="text-[#0F52BA]">
                                  Avg Risk Score: {payload[0]?.value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgScore"
                        name="Avg Risk Score"
                        stroke="#0F52BA"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0F52BA' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ANOMALIES (Trend + cause + severity) */}
      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          <AnomalyTrendChart data={analytics?.anomaliesOverTime} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CauseDistributionChart />
            <SeverityDistributionChart />
          </div>
        </div>
      )}

      {/* TAB 3: CONSUMPTION (Hourly + daily/weekly patterns) */}
      {activeTab === 'consumption' && (
        <div className="space-y-6">
          {/* Diurnal Hourly Heatmap */}
          <HourlyHeatmapChart data={analytics?.hourlyHeatmap || []} />

          {/* Daily / Weekly Pattern */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Daily Actual vs. Baseline Consumption</CardTitle>
                <CardDescription>
                  Aggregate system load compared against expected seasonal baselines
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics?.dailyPatterns || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                              <p className="font-bold text-slate-800 font-sans mb-1">{label}</p>
                              <p className="text-[#0F52BA]">Actual: {payload[0]?.value} kWh</p>
                              <p className="text-slate-500">Baseline: {payload[1]?.value} kWh</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="actual" name="Actual Consumption (kWh)" fill="#0F52BA" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="baseline" name="Expected Baseline (kWh)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: OPERATIONS (Case resolution + detection trends) */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {/* Operational KPI Resolution Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Case Confirmation Rate"
              value={`${analytics?.resolutionStats?.confirmedRate || 64.2}%`}
              changePct={4.1}
              isPositiveGood={true}
              changeLabel="improvement"
              icon={<CheckCircle className="w-4 h-4 text-purple-600" />}
            />
            <KpiCard
              title="False Positive Rate"
              value={`${analytics?.resolutionStats?.falsePositiveRate || 14.5}%`}
              changePct={-2.3}
              isPositiveGood={false}
              changeLabel="target < 15%"
              icon={<TrendingDown className="w-4 h-4 text-emerald-600" />}
            />
            <KpiCard
              title="Avg Case Resolution"
              value={`${analytics?.resolutionStats?.avgResolutionTimeHours || 32.4}h`}
              changePct={-6.8}
              isPositiveGood={false}
              changeLabel="faster field turnaround"
              icon={<Clock className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              title="Est. Revenue Protected"
              value={analytics?.resolutionStats?.revenueRecoveredEstimate || '$148,200'}
              changePct={18.4}
              isPositiveGood={true}
              changeLabel="recovered load"
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            />
          </div>

          {/* Operational Detection & Resolution Trend Chart */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Case Detection &amp; Resolution Throughput</CardTitle>
                <CardDescription>
                  Tracking incoming anomaly flags versus completed field inspections and confirmed cases
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics?.anomaliesOverTime || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                              <p className="font-bold text-slate-800 font-sans mb-1">{label}</p>
                              {payload.map((entry: any, index: number) => (
                                <p key={index} style={{ color: entry.color }}>
                                  {entry.name}: {entry.value}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="theft"
                      name="Suspected Theft"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="fault"
                      name="Meter Fault"
                      stroke="#ea580c"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="comm"
                      name="Communication"
                      stroke="#0F52BA"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
