import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard, useCases } from '../../hooks';
import { KpiCard } from '../../components/cards/KpiCard';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { AnomalyTrendChart } from '../../components/charts/AnomalyTrendChart';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CaseDrawer } from '../../components/layout/CaseDrawer';
import { CaseItem } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Users,
  AlertTriangle,
  Flame,
  BellRing,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | '1Y'>('30D');
  const { kpis, trend, recentAlerts, isLoading } = useDashboard(timeframe);
  const { cases, updateStatus, assign, addNote } = useCases();

  // Selected case for the slide-over investigation drawer
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  // Priority Cases: Cases that are critical/high priority or actively open/under investigation
  const priorityCases = (cases || [])
    .filter(
      (c) =>
        c.severity === 'critical' ||
        c.severity === 'high' ||
        c.status === 'Open' ||
        c.status === 'Under Review'
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Compact System Health Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-md shadow-xs">
        <div className="flex items-center gap-2.5 text-xs text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-semibold text-slate-900">System Status: Operational</span>
          <span className="text-slate-300">|</span>
          <span>Pipeline: Data Quality &rarr; Anomaly Detection &rarr; Cause Classification active</span>
          <span className="hidden md:inline text-slate-300">|</span>
          <span className="hidden md:inline text-slate-500 font-mono">Uptime: 99.94%</span>
        </div>
        <button
          onClick={() => navigate('/system')}
          className="text-xs font-semibold text-[#0F52BA] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          View System Diagnostics &rarr;
        </button>
      </div>

      {/* Primary KPI Row: What needs attention */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Consumers"
          value={kpis?.totalConsumers || 14850}
          changePct={kpis?.totalConsumersChangePct || 2.4}
          isPositiveGood={true}
          subtitle="Monitored active meters"
          icon={<Users className="w-4 h-4 text-slate-600" />}
          onClick={() => navigate('/consumers')}
        />
        <KpiCard
          title="Active Anomalies"
          value={kpis?.totalAnomalies || 342}
          changePct={kpis?.totalAnomaliesChangePct || -8.1}
          isPositiveGood={false}
          subtitle="Flagged divergence events"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          onClick={() => navigate('/anomalies')}
        />
        <KpiCard
          title="High-Risk Cases"
          value={kpis?.highRiskConsumers || 48}
          changePct={kpis?.highRiskChangePct || 14.3}
          isPositiveGood={false}
          subtitle="Risk score &gt; 75"
          icon={<Flame className="w-4 h-4 text-red-600" />}
          onClick={() => navigate('/cases?severity=critical')}
        />
        <KpiCard
          title="Critical Alerts"
          value={kpis?.criticalAlerts || 14}
          changePct={kpis?.criticalAlertsChangePct || 7.7}
          isPositiveGood={false}
          subtitle="Requires immediate review"
          icon={<BellRing className="w-4 h-4 text-red-600" />}
          onClick={() => navigate('/cases?severity=critical')}
        />
      </div>

      {/* Main Trends: Consumption Trend + Anomaly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConsumptionTrendChart
          data={trend || []}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
        <AnomalyTrendChart />
      </div>

      {/* Operations Row: Priority Cases Table + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Cases Table (Takes 2 columns on lg) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Priority Cases
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Open investigations and high-risk anomalies requiring operator action
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/cases')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                All Cases
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5">Case</th>
                    <th className="py-2.5 px-3.5">Consumer</th>
                    <th className="py-2.5 px-3.5">Priority</th>
                    <th className="py-2.5 px-3.5">Cause</th>
                    <th className="py-2.5 px-3.5">Assignee</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {priorityCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">
                        {c.id}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-medium text-slate-900 block truncate max-w-[140px]">
                          {c.consumerName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {c.consumerId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <SeverityBadge severity={c.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700">{c.cause}</td>
                      <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-[100px]">
                        {c.assignee}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className="text-[#0F52BA] font-semibold text-xs hover:underline">
                          Investigate
                        </span>
                      </td>
                    </tr>
                  ))}
                  {priorityCases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No active priority cases pending review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts Feed */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Recent Alerts
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Latest telemetry triggers &amp; anomaly warnings
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/cases')}
                className="text-xs text-[#0F52BA]"
              >
                View Feed
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-slate-100 text-xs">
                {(recentAlerts || []).slice(0, 5).map((al) => (
                  <div
                    key={al.id}
                    onClick={() => setSelectedCase(al)}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start justify-between gap-2.5 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-slate-900 group-hover:text-[#0F52BA]">
                          {al.id}
                        </span>
                        <SeverityBadge severity={al.severity} size="sm" />
                      </div>
                      <div className="text-slate-800 font-medium truncate">
                        {al.consumerName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {al.cause} &bull; {formatTimestamp(al.createdAt)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F52BA] group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
                  </div>
                ))}
                {(!recentAlerts || recentAlerts.length === 0) && (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No recent alerts recorded.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Case Investigation Drawer */}
      <CaseDrawer
        caseItem={selectedCase}
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        onUpdateStatus={updateStatus}
        onAssign={assign}
        onAddNote={addNote}
      />
    </div>
  );
}
