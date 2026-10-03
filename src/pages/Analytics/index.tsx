import React, { useState } from 'react';
import { useAnalytics } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityDistributionChart } from '../../components/charts/SeverityDistributionChart';
import { CauseDistributionChart } from '../../components/charts/CauseDistributionChart';
import { AnomalyTrendChart } from '../../components/charts/AnomalyTrendChart';
import { HourlyHeatmapChart } from '../../components/charts/HourlyHeatmapChart';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { KpiCard } from '../../components/cards/KpiCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  CheckCircle,
  TrendingDown,
  DollarSign,
  Clock,
  RotateCcw,
  BarChart2,
  PieChart,
} from 'lucide-react';

export function Analytics() {
  const [dateRange, setDateRange] = useState('30D');
  const [severity, setSeverity] = useState('all');
  const [cause, setCause] = useState('all');
  const [segment, setSegment] = useState('all');

  const { data: analytics, isLoading } = useAnalytics({
    dateRange,
    severity,
    cause,
    segment,
  });

  const handleReset = () => {
    setDateRange('30D');
    setSeverity('all');
    setCause('all');
    setSegment('all');
  };

  const confidenceData = [
    { range: '50-59%', count: 32 },
    { range: '60-69%', count: 58 },
    { range: '70-79%', count: 96 },
    { range: '80-89%', count: 184 },
    { range: '90-100%', count: 72 },
  ];

  const segmentLossData = [
    { segment: 'Industrial', losses: 68.4, verifiedTheft: 42 },
    { segment: 'Commercial', losses: 48.2, verifiedTheft: 28 },
    { segment: 'Residential', losses: 21.6, verifiedTheft: 14 },
    { segment: 'Agricultural', losses: 10.0, verifiedTheft: 6 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grid Intelligence & Pattern Analytics"
        description="Comprehensive statistical aggregation across detection algorithms, root cause probabilities, and recovery yields"
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

      {/* Filter Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Filter Telemetry:
        </span>

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
          <option value="all">All Likely Causes</option>
          <option value="Suspected Theft">Suspected Theft</option>
          <option value="Meter Fault">Meter Fault</option>
          <option value="Communication Issue">Communication Issue</option>
          <option value="Legitimate Behaviour">Legitimate Behaviour</option>
        </Select>

        <Select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="text-xs"
        >
          <option value="all">All Consumer Segments</option>
          <option value="Industrial">Industrial</option>
          <option value="Commercial">Commercial</option>
          <option value="Residential">Residential</option>
          <option value="Agricultural">Agricultural</option>
        </Select>
      </div>

      {/* KPI Resolution Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          changeLabel="vs target < 15%"
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

      {/* Row 1: Severity Distribution + Cause Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SeverityDistributionChart />
        <CauseDistributionChart />
      </div>

      {/* Row 2: Anomalies Over Time + Hourly Load/Anomaly Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnomalyTrendChart data={analytics?.anomaliesOverTime} />
        <HourlyHeatmapChart data={analytics?.hourlyHeatmap || []} />
      </div>

      {/* Row 3: Model Confidence Distribution + Tariff Segment Losses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model Confidence Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Algorithm Confidence Score Distribution</CardTitle>
              <CardDescription>
                Distribution of prediction confidence across flagged anomaly detections
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                            <span className="font-bold text-slate-800">{label}: </span>
                            <span>{payload[0].value} detections</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#0F52BA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Losses by Consumer Segment */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Unmetered Energy Impact by Consumer Segment</CardTitle>
              <CardDescription>
                Estimated unmetered MWh losses & verified theft counts
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentLossData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="segment" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-slate-300 rounded p-2 text-xs font-mono shadow-md">
                            <p className="font-bold text-slate-800 font-sans">{label}</p>
                            <p className="text-red-600 font-medium">
                              Estimated Loss: {payload[0]?.value} MWh
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="losses" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
