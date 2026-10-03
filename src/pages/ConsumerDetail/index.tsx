import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConsumer } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskIndicator } from '../../components/common/RiskIndicator';
import { AnomalyScoreBadge } from '../../components/common/AnomalyScoreBadge';
import { ActualBaselinePeerChart } from '../../components/charts/ActualBaselinePeerChart';
import { EvidenceCard } from '../../components/cards/EvidenceCard';
import { ModelSignalCard } from '../../components/cards/ModelSignalCard';
import { CauseProbabilityList } from '../../components/common/CauseProbabilityList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimestamp, formatKwh, formatPct } from '../../utils/formatters';
import {
  BellRing,
  ExternalLink,
  MapPin,
  Cpu,
  Calendar,
  Layers,
  Clock,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';

export function ConsumerDetail() {
  const { id = 'CONS-7821' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('30D');

  const { consumer, history, isLoading } = useConsumer(id, timeframe);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <span className="w-4 h-4 rounded-full bg-blue-600 animate-ping mb-3" />
        <p className="text-xs font-mono">Retrieving consumer intelligence records...</p>
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

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <PageHeader
        title={consumer.name}
        description={`Consumer ID: ${consumer.id} • Meter ID: ${consumer.meterId} • Feeder: ${consumer.feeder} (${consumer.substation})`}
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
          <div className="flex items-center gap-2">
            {consumer.relatedAlertId && (
              <Button
                variant="primary"
                size="sm"
                icon={<BellRing className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/alerts?id=${consumer.relatedAlertId}`)}
              >
                Review Related Case ({consumer.relatedAlertId})
              </Button>
            )}
          </div>
        }
      />

      {/* Top Metadata Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Tariff Category
          </span>
          <span className="font-bold text-slate-900 text-sm">{consumer.tariffType}</span>
          <span className="text-slate-400 block text-[10px] mt-0.5">{consumer.address}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Risk Index
          </span>
          <div className="flex items-center gap-2">
            <RiskIndicator
              score={consumer.risk.score}
              severity={consumer.risk.severity}
              size="sm"
            />
          </div>
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Severity: {consumer.risk.severity.toUpperCase()}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Anomaly Score
          </span>
          <AnomalyScoreBadge score={consumer.anomaly.score} showPercent={true} />
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Duration: {consumer.anomaly.durationDays} consecutive days
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Current Daily Load
          </span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {formatKwh(consumer.consumption.current)}
          </span>
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Baseline: {formatKwh(consumer.consumption.baseline)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Likely Cause
          </span>
          <span className="font-semibold text-slate-900 block truncate">
            {consumer.classification.cause}
          </span>
          <span className="text-slate-500 font-mono text-[10px]">
            {consumer.classification.confidence}% ML confidence
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Last Synced
          </span>
          <span className="font-mono text-slate-800 text-[11px] block">
            {formatTimestamp(consumer.updatedAt)}
          </span>
          <span className="text-emerald-600 font-medium text-[10px] flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            AMI Telemetry Active
          </span>
        </div>
      </div>

      {/* Main Consumption Chart: Actual vs Baseline vs Peer Average */}
      <ActualBaselinePeerChart
        data={history || []}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      {/* Key Profiling Operational Metrics Grid */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Consumer Profiling & Benchmark Metrics</CardTitle>
            <CardDescription>
              Behavioral characteristics compared against cluster peers on Feeder {consumer.feeder}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Avg Daily
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {consumer.metrics.avgDaily} kWh
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Peak Load
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {consumer.metrics.peakUsage} kWh
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Night Ratio
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {consumer.metrics.nightUsage} kWh
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Weekend Usage
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {consumer.metrics.weekendUsage} kWh
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Typical Hours
              </span>
              <span className="font-sans font-bold text-slate-800 text-[11px] block truncate">
                {consumer.metrics.typicalHours}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
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

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
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

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Peer Percentile
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {consumer.metrics.peerPercentile}th %ile
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CORE SECTION: Why was this consumer flagged? */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Why was this consumer flagged?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive explanation derived from mathematical anomaly detectors and multi-variate features
            </p>
          </div>
        </div>

        {/* Anomaly Explanation Factors Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 bg-red-50/50 border border-red-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Anomaly Score
            </span>
            <span className="font-mono font-bold text-red-700 text-base">
              {consumer.anomaly.score.toFixed(2)}
            </span>
            <span className="text-[10px] text-red-600/80 block mt-0.5">High deviation</span>
          </div>

          <div className="p-3 bg-red-50/50 border border-red-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Baseline Dev
            </span>
            <span className="font-mono font-bold text-red-700 text-base">
              {formatPct(consumer.metrics.baselineDeviationPct)}
            </span>
            <span className="text-[10px] text-red-600/80 block mt-0.5">Sudden plunge</span>
          </div>

          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Peer Deviation
            </span>
            <span className="font-mono font-bold text-amber-700 text-base">
              {formatPct(consumer.metrics.peerDeviationPct)}
            </span>
            <span className="text-[10px] text-amber-700/80 block mt-0.5">Cluster divergence</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Night Activity
            </span>
            <span className="font-mono font-bold text-slate-900 text-base">+3.2× ratio</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Midnight shift</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Usage Change
            </span>
            <span className="font-mono font-bold text-slate-900 text-base">-128 kWh/day</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Unexplained drop</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Persistence
            </span>
            <span className="font-mono font-bold text-slate-900 text-base">
              {consumer.anomaly.durationDays} Days
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Consecutive</span>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              Model Conf.
            </span>
            <span className="font-mono font-bold text-[#0F52BA] text-base">
              {consumer.classification.confidence}%
            </span>
            <span className="text-[10px] text-blue-700 block mt-0.5">Ensemble output</span>
          </div>
        </div>

        {/* Cause Classification & Signals Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cause Classification Box */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div>
                <CardTitle>Cause Classification</CardTitle>
                <CardDescription>
                  Multi-class algorithm attribution probabilities
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

          {/* Detection Signals */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Detection Signal Vectors</CardTitle>
                <CardDescription>
                  Sub-model telemetry: Statistical Baseline, Isolation Forest, Temporal Analysis, Cause Classifier
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

        {/* Evidence Cards */}
        {consumer.evidence && consumer.evidence.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
              Auditable Evidence Cards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {consumer.evidence.map((ev) => (
                <EvidenceCard key={ev.id} item={ev} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Case Investigation Link Section */}
      {consumer.relatedAlertId && (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-600 text-white shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Active Case Case #{consumer.relatedAlertId}
              </h4>
              <p className="text-xs text-slate-600">
                This consumer has an open investigation case queued for operator review.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/alerts?id=${consumer.relatedAlertId}`)}
          >
            Review & Resolve Case
          </Button>
        </div>
      )}
    </div>
  );
}
