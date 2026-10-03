import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConsumer, useCases } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskIndicator } from '../../components/common/RiskIndicator';
import { AnomalyScoreBadge } from '../../components/common/AnomalyScoreBadge';
import { ActualBaselinePeerChart } from '../../components/charts/ActualBaselinePeerChart';
import { EvidenceCard } from '../../components/cards/EvidenceCard';
import { ModelSignalCard } from '../../components/cards/ModelSignalCard';
import { CauseProbabilityList } from '../../components/common/CauseProbabilityList';
import { Timeline } from '../../components/common/Timeline';
import { CaseDrawer } from '../../components/layout/CaseDrawer';
import { Tabs } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/common/EmptyState';
import { CaseItem } from '../../types';
import { formatTimestamp, formatKwh, formatPct } from '../../utils/formatters';
import {
  BellRing,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  FileCheck,
  ChevronRight,
  User,
} from 'lucide-react';

export function ConsumerDetail() {
  const { id = 'CONS-7821' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'detection' | 'evidence' | 'cases'>('overview');
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('30D');

  const { consumer, history, isLoading } = useConsumer(id, timeframe);
  const { cases = [], updateStatus, assign, addNote } = useCases();

  // Find related cases for this consumer
  const relatedCases = cases.filter(
    (c) => c.consumerId === id || c.id === consumer?.relatedAlertId
  );

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <span className="w-4 h-4 rounded-full bg-[#0F52BA] animate-ping mb-3" />
        <p className="text-xs font-mono">Retrieving consumer profile records...</p>
      </div>
    );
  }

  if (!consumer) {
    return (
      <EmptyState
        title="Consumer Not Found"
        description={`No service connection matched identifier "${id}".`}
        actionText="Back to Directory"
        onAction={() => navigate('/consumers')}
      />
    );
  }

  const tabsConfig = [
    { id: 'overview', label: 'Overview' },
    { id: 'usage', label: 'Usage & Profiling' },
    { id: 'detection', label: 'Detection & ML Signals' },
    { id: 'evidence', label: 'Evidence & Timeline', count: consumer.evidence?.length || 0 },
    { id: 'cases', label: 'Cases & Alerts', count: relatedCases.length },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={consumer.name}
        description={`Consumer ID: ${consumer.id} • Meter: ${consumer.meterId} • Feeder: ${consumer.feeder} (${consumer.substation})`}
        breadcrumbs={[
          { label: 'Overview', href: '/dashboard' },
          { label: 'Consumers', href: '/consumers' },
          { label: consumer.id },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={consumer.risk.severity} />
            <StatusBadge status={consumer.status} />
          </div>
        }
        actions={
          relatedCases.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              icon={<BellRing className="w-3.5 h-3.5" />}
              onClick={() => {
                setSelectedCase(relatedCases[0]);
              }}
            >
              Investigate Case ({relatedCases[0].id})
            </Button>
          ) : undefined
        }
      />

      {/* Tabs Navigation */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded p-3.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Risk Assessment
              </span>
              <div className="flex items-center gap-2">
                <RiskIndicator
                  score={consumer.risk.score}
                  severity={consumer.risk.severity}
                  size="sm"
                />
              </div>
              <span className="text-slate-500 block text-[11px] mt-1 font-mono">
                Status: {consumer.status}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Usage Summary
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm block">
                {formatKwh(consumer.consumption.current)}
              </span>
              <span className="text-red-600 font-mono text-[11px] font-medium block mt-1">
                {consumer.metrics.baselineDeviationPct}% vs baseline ({formatKwh(consumer.consumption.baseline)})
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Likely Cause
              </span>
              <span className="font-semibold text-slate-900 block truncate text-sm">
                {consumer.classification.cause}
              </span>
              <span className="text-slate-500 font-mono text-[11px] block mt-1">
                {consumer.classification.confidence}% ML confidence
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Tariff &amp; Service Point
              </span>
              <span className="font-medium text-slate-900 block truncate text-sm">
                {consumer.tariffType}
              </span>
              <span className="text-slate-500 block text-[11px] mt-1 truncate">
                {consumer.address}
              </span>
            </div>
          </div>

          {/* Short Explanation Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="font-semibold text-slate-900">
                  Anomaly Summary &amp; Classification Rationale
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Consumer exhibits an anomaly score of{' '}
                  <strong className="text-slate-900">{consumer.anomaly.score.toFixed(2)}</strong> with a persistent{' '}
                  <strong className="text-red-600">{consumer.metrics.baselineDeviationPct}% drop</strong> against historical baseline over the last {consumer.anomaly.durationDays} consecutive days. Multi-model clustering and isolation forest classify this behavior as{' '}
                  <strong className="text-slate-900">{consumer.classification.cause}</strong> with {consumer.classification.confidence}% algorithmic confidence.
                </p>
              </div>
            </div>
          </div>

          {/* Main Consumption Chart */}
          <ActualBaselinePeerChart
            data={history || []}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </div>
      )}

      {/* TAB 2: USAGE & PROFILING */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <ActualBaselinePeerChart
            data={history || []}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />

          {/* Profiling Metrics Grid */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Consumer Profiling &amp; Peer Comparison Metrics</CardTitle>
                <CardDescription>
                  Detailed behavioral dimensions benchmarked against cluster peers on feeder {consumer.feeder}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Avg Daily
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {consumer.metrics.avgDaily} kWh
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Peak Load
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {consumer.metrics.peakUsage} kWh
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Night Ratio
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {consumer.metrics.nightUsage} kWh
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Weekend Usage
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {consumer.metrics.weekendUsage} kWh
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Typical Hours
                  </span>
                  <span className="font-medium text-slate-800 text-xs block truncate">
                    {consumer.metrics.typicalHours}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Baseline Dev
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      consumer.metrics.baselineDeviationPct < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {formatPct(consumer.metrics.baselineDeviationPct, true)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Peer Dev
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      consumer.metrics.peerDeviationPct < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {formatPct(consumer.metrics.peerDeviationPct, true)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Peer Rank
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {consumer.metrics.peerPercentile}th %ile
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: DETECTION & ML SIGNALS */}
      {activeTab === 'detection' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded text-xs">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block mb-1">
                Anomaly Score
              </span>
              <div className="flex items-center gap-2">
                <AnomalyScoreBadge score={consumer.anomaly.score} showPercent={true} />
              </div>
              <span className="text-slate-500 block text-[11px] mt-1">
                Persistence: {consumer.anomaly.durationDays} consecutive days
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded text-xs">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block mb-1">
                Model Classification Confidence
              </span>
              <div className="text-lg font-mono font-bold text-[#0F52BA]">
                {consumer.classification.confidence}%
              </div>
              <span className="text-slate-500 block text-[11px] mt-1">
                Primary Attribution: {consumer.classification.cause}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded text-xs">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block mb-1">
                Signal Aggregation
              </span>
              <div className="text-lg font-mono font-bold text-slate-900">
                {consumer.signals.length} Sub-Model Vectors
              </div>
              <span className="text-slate-500 block text-[11px] mt-1">
                Ensemble fusion verified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cause Probabilities */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div>
                  <CardTitle>Cause Probabilities</CardTitle>
                  <CardDescription>
                    Multi-class machine learning attribution breakdown
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <CauseProbabilityList
                  primaryCause={consumer.classification.cause}
                  primaryConfidence={consumer.classification.confidence}
                  alternativeProbabilities={consumer.classification.alternativeProbabilities}
                />
              </CardContent>
            </Card>

            {/* Model Signals */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Model Signal Vectors</CardTitle>
                  <CardDescription>
                    Statistical baseline, isolation forest, temporal patterns &amp; classifier telemetry
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {consumer.signals.map((sig) => (
                    <ModelSignalCard key={sig.id} signal={sig} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: EVIDENCE & TIMELINE */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {/* Auditable Evidence Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#0F52BA]" />
              Auditable Evidence Cards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {consumer.evidence && consumer.evidence.length > 0 ? (
                consumer.evidence.map((ev) => <EvidenceCard key={ev.id} item={ev} />)
              ) : (
                <div className="col-span-3 p-8 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded">
                  No explicit evidence cards recorded for this consumer.
                </div>
              )}
            </div>
          </div>

          {/* Timeline of Events */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Auditable Timeline &amp; Event Sequence</CardTitle>
                <CardDescription>
                  Historical detection triggers, telemetry alerts, and operator interventions
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {relatedCases.length > 0 && relatedCases[0].timeline ? (
                <Timeline items={relatedCases[0].timeline} />
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Telemetry Anomaly Flagged
                      </span>
                      <span className="text-slate-500">
                        Consumption dropped {consumer.metrics.baselineDeviationPct}% below expected baseline
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {formatTimestamp(consumer.updatedAt)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Cause Classifier Triggered
                      </span>
                      <span className="text-slate-500">
                        Classified as {consumer.classification.cause} ({consumer.classification.confidence}% conf)
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {formatTimestamp(consumer.updatedAt)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: CASES & ALERTS */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Related Operational Cases</CardTitle>
                <CardDescription>
                  Active and resolved investigations linked to this consumer account
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5">Case ID</th>
                    <th className="py-2.5 px-3.5">Priority</th>
                    <th className="py-2.5 px-3.5">Suspected Cause</th>
                    <th className="py-2.5 px-3.5">Assignee</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Created</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {relatedCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">
                        {c.id}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <SeverityBadge severity={c.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-800 font-medium">{c.cause}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{c.assignee}</td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">
                        {formatTimestamp(c.createdAt)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className="text-[#0F52BA] font-semibold hover:underline">
                          Investigate &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                  {relatedCases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No active cases linked to this consumer account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

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
