import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnomaly, useConsumer } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { RiskIndicator } from '../../components/common/RiskIndicator';
import { AnomalyScoreBadge } from '../../components/common/AnomalyScoreBadge';
import { ActualBaselinePeerChart } from '../../components/charts/ActualBaselinePeerChart';
import { ModelSignalCard } from '../../components/cards/ModelSignalCard';
import { EvidenceCard } from '../../components/cards/EvidenceCard';
import { Timeline } from '../../components/common/Timeline';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimestamp } from '../../utils/formatters';
import { BellRing, ExternalLink, ArrowRight, ShieldAlert, Cpu, Calendar } from 'lucide-react';

export function AnomalyDetail() {
  const { id = 'ANOM-1049' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('30D');

  const { data: anomaly, isLoading: anomalyLoading } = useAnomaly(id);
  const { consumer, history } = useConsumer(anomaly?.consumerId || '', timeframe);

  if (anomalyLoading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <span className="w-4 h-4 rounded-full bg-blue-600 animate-ping mb-3" />
        <p className="text-xs font-mono">Loading anomaly telemetry vectors...</p>
      </div>
    );
  }

  if (!anomaly) {
    return (
      <EmptyState
        title="Anomaly Record Not Found"
        description={`No anomaly record found for identifier "${id}".`}
        actionText="Back to Registry"
        onAction={() => navigate('/anomalies')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Anomaly Investigation: ${anomaly.id}`}
        description={`Associated Account: ${anomaly.consumerName} (${anomaly.consumerId}) • Meter: ${anomaly.meterId}`}
        breadcrumbs={[
          { label: 'Overview', href: '/dashboard' },
          { label: 'Anomalies', href: '/anomalies' },
          { label: anomaly.id },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={anomaly.severity} />
            <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {anomaly.status}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/consumers/${anomaly.consumerId}`)}
            >
              Consumer Dossier
            </Button>
            {anomaly.relatedAlertId && (
              <Button
                variant="primary"
                size="sm"
                icon={<BellRing className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/alerts?id=${anomaly.relatedAlertId}`)}
              >
                Review Linked Case ({anomaly.relatedAlertId})
              </Button>
            )}
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Likely Cause
          </span>
          <span className="font-bold text-slate-900 text-sm block truncate">
            {anomaly.likelyCause}
          </span>
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Confidence: {anomaly.confidence}%
          </span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Risk Index
          </span>
          <RiskIndicator score={anomaly.riskScore} severity={anomaly.severity} size="sm" />
          <span className="text-slate-400 block text-[10px] mt-0.5">
            High Priority Dispatch
          </span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Anomaly Score
          </span>
          <AnomalyScoreBadge score={anomaly.anomalyScore} showPercent={true} />
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Extreme statistical outlier
          </span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Load Deviation
          </span>
          <span className="font-mono font-bold text-red-600 text-sm block">
            {anomaly.actualVsBaselinePct}%
          </span>
          <span className="text-slate-400 block text-[10px] mt-0.5">vs harmonic base</span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Duration
          </span>
          <span className="font-mono font-bold text-slate-900 text-sm block">
            {anomaly.durationDays} Days
          </span>
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Sustained signature
          </span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Detected At
          </span>
          <span className="font-mono text-slate-800 text-[11px] block">
            {formatTimestamp(anomaly.detectedAt)}
          </span>
          <span className="text-slate-400 block text-[10px] mt-0.5">
            Hybrid Detection Pipeline
          </span>
        </div>
      </div>

      {/* Consumption Timeline Chart */}
      <ActualBaselinePeerChart
        data={history || []}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      {/* Multi-Model Signals & Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model Signals */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Algorithm Detection Signals</CardTitle>
              <CardDescription>
                Telemetry evaluation from individual ML models in ensemble
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {consumer?.signals ? (
              consumer.signals.map((sig) => <ModelSignalCard key={sig.id} signal={sig} />)
            ) : (
              <p className="text-xs text-slate-500">No raw signals cached.</p>
            )}
          </CardContent>
        </Card>

        {/* Evidence Summary */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Auditable Verification Evidence</CardTitle>
              <CardDescription>
                Empirical signals confirming divergence pattern
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {consumer?.evidence ? (
              consumer.evidence.map((ev) => <EvidenceCard key={ev.id} item={ev} />)
            ) : (
              <p className="text-xs text-slate-500">No empirical evidence items cached.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
