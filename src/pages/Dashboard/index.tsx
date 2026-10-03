import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks';
import { KpiCard } from '../../components/cards/KpiCard';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { AnomalyTrendChart } from '../../components/charts/AnomalyTrendChart';
import { SeverityDistributionChart } from '../../components/charts/SeverityDistributionChart';
import { CauseDistributionChart } from '../../components/charts/CauseDistributionChart';
import { PipelineFlow } from '../../components/common/PipelineFlow';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskIndicator } from '../../components/common/RiskIndicator';
import { AnomalyScoreBadge } from '../../components/common/AnomalyScoreBadge';
import { formatTimestamp, formatKwh } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Users,
  AlertTriangle,
  Flame,
  Activity,
  BellRing,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | '1Y'>('30D');
  const { kpis, trend, highRiskConsumers, recentAlerts, topAnomalies, isLoading } = useDashboard(timeframe);

  return (
    <div className="space-y-6">
      {/* Interactive Pipeline Architecture Banner */}
      <PipelineFlow activeStage={4} />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Consumers"
          value={kpis?.totalConsumers || 14850}
          changePct={kpis?.totalConsumersChangePct || 2.4}
          isPositiveGood={true}
          icon={<Users className="w-4 h-4" />}
          onClick={() => navigate('/consumers')}
        />
        <KpiCard
          title="Total Anomalies"
          value={kpis?.totalAnomalies || 342}
          changePct={kpis?.totalAnomaliesChangePct || -8.1}
          isPositiveGood={false}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          onClick={() => navigate('/anomalies')}
        />
        <KpiCard
          title="High Risk"
          value={kpis?.highRiskConsumers || 48}
          changePct={kpis?.highRiskChangePct || 14.3}
          isPositiveGood={false}
          subtitle="Score > 75"
          icon={<Flame className="w-4 h-4 text-red-600" />}
          onClick={() => navigate('/consumers?severity=critical')}
        />
        <KpiCard
          title="Avg Risk Score"
          value={kpis?.avgRiskScore || 31.8}
          changePct={kpis?.avgRiskScoreChangePct || -1.5}
          unit="/100"
          isPositiveGood={false}
          icon={<Activity className="w-4 h-4 text-blue-600" />}
          onClick={() => navigate('/analytics')}
        />
        <KpiCard
          title="Critical Alerts"
          value={kpis?.criticalAlerts || 14}
          changePct={kpis?.criticalAlertsChangePct || 7.7}
          isPositiveGood={false}
          icon={<BellRing className="w-4 h-4 text-red-600" />}
          onClick={() => navigate('/alerts?severity=critical')}
        />
        <KpiCard
          title="Data Quality"
          value={`${kpis?.dataQualityPct || 98.6}%`}
          changePct={kpis?.dataQualityChangePct || 0.4}
          isPositiveGood={true}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
          onClick={() => navigate('/data-quality')}
        />
      </div>

      {/* Main Consumption Trend Chart */}
      <ConsumptionTrendChart
        data={trend || []}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      {/* Secondary Analytics Row: 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SeverityDistributionChart />
        <CauseDistributionChart />
        <AnomalyTrendChart />
      </div>

      {/* Operational Sections: High-Risk Consumers, Top Anomalies, Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* High Risk Consumers Card */}
        <Card>
          <CardHeader>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <CardTitle>Priority High-Risk Consumers</CardTitle>
              </div>
              <CardDescription>
                Urgent accounts with anomalous diversion signatures requiring intervention
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/consumers?severity=critical')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {(highRiskConsumers || []).slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/consumers/${c.id}`)}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-[#0F52BA]">
                        {c.id}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        ({c.meterId})
                      </span>
                      <SeverityBadge severity={c.risk.severity} size="sm" />
                    </div>
                    <div className="text-slate-800 font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.classification.cause} • {c.substation}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="text-sm font-mono font-bold text-slate-900">
                        {formatKwh(c.consumption.current)}
                      </div>
                      <div className="text-[11px] font-mono text-red-600 font-bold">
                        {c.metrics.baselineDeviationPct}% vs base
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F52BA] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts / Dispatch Queue Card */}
        <Card>
          <CardHeader>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <CardTitle>Recent Case Alerts & Dispatch Queue</CardTitle>
              </div>
              <CardDescription>
                Active investigations assigned to grid operators
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/alerts')}
            >
              Manage Cases
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {(recentAlerts || []).slice(0, 4).map((al) => (
                <div
                  key={al.id}
                  onClick={() => navigate(`/alerts?id=${al.id}`)}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-[#0F52BA]">
                        {al.id}
                      </span>
                      <SeverityBadge severity={al.severity} size="sm" />
                      <StatusBadge status={al.status} size="sm" />
                    </div>
                    <div className="text-slate-800 font-medium truncate">
                      {al.consumerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Cause: {al.cause} • Assignee: {al.assignee}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-500 block">
                      {formatTimestamp(al.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] mt-1"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Anomalies Quick Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Top Flagged Telemetry Anomalies</CardTitle>
            <CardDescription>
              Highest divergence score readings recorded across smart meter network
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/anomalies')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All Anomalies
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-2.5 px-3.5">Anomaly ID</th>
                  <th className="py-2.5 px-3.5">Consumer</th>
                  <th className="py-2.5 px-3.5">Meter ID</th>
                  <th className="py-2.5 px-3.5">Likely Cause</th>
                  <th className="py-2.5 px-3.5">Anomaly Score</th>
                  <th className="py-2.5 px-3.5">Severity</th>
                  <th className="py-2.5 px-3.5">Evidence Summary</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {(topAnomalies || []).slice(0, 4).map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/anomalies/${a.id}`)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                      {a.id}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-800">
                      {a.consumerName}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">{a.meterId}</td>
                    <td className="py-2.5 px-3.5 font-medium">{a.likelyCause}</td>
                    <td className="py-2.5 px-3.5">
                      <AnomalyScoreBadge score={a.anomalyScore} />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <SeverityBadge severity={a.severity} size="sm" />
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-xs">
                      {a.evidenceSummary}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <span className="text-[#0F52BA] font-semibold hover:underline">
                        Details →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
