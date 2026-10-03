import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnomaly, useConsumer, useCases } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { RiskIndicator } from '../../components/common/RiskIndicator';
import { AnomalyScoreBadge } from '../../components/common/AnomalyScoreBadge';
import { ActualBaselinePeerChart } from '../../components/charts/ActualBaselinePeerChart';
import { ModelSignalCard } from '../../components/cards/ModelSignalCard';
import { EvidenceCard } from '../../components/cards/EvidenceCard';
import { CaseDrawer } from '../../components/layout/CaseDrawer';
import { Tabs } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/common/EmptyState';
import { CaseItem } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import {
  BellRing,
  ExternalLink,
  AlertTriangle,
  Clock,
  Layers,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

export function AnomalyDetail() {
  const { id = 'ANOM-1049' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'consumption' | 'case'>('overview');
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('30D');

  const { data: anomaly, isLoading: anomalyLoading } = useAnomaly(id);
  const { consumer, history } = useConsumer(anomaly?.consumerId || '', timeframe);
  const { cases = [], updateStatus, assign, addNote } = useCases();

  // Find linked case
  const linkedCase = cases.find(
    (c) => c.id === anomaly?.relatedAlertId || c.consumerId === anomaly?.consumerId
  );
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  if (anomalyLoading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <span className="w-4 h-4 rounded-full bg-[#0F52BA] animate-ping mb-3" />
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

  const tabsConfig = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence & Signals', count: consumer?.evidence?.length || 0 },
    { id: 'consumption', label: 'Consumption Profile' },
    { id: 'case', label: 'Investigation Case', count: linkedCase ? 1 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Anomaly ${anomaly.id}`}
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
              View Consumer
            </Button>
            {linkedCase && (
              <Button
                variant="primary"
                size="sm"
                icon={<BellRing className="w-3.5 h-3.5" />}
                onClick={() => setSelectedCase(linkedCase)}
              >
                Open Case ({linkedCase.id})
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-white border border-slate-200 rounded text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Likely Cause
              </span>
              <span className="font-bold text-slate-900 text-sm block truncate">
                {anomaly.likelyCause}
              </span>
              <span className="text-slate-500 font-mono text-[11px] block mt-1">
                Confidence: {anomaly.confidence}%
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Risk Score
              </span>
              <div className="flex items-center gap-2">
                <RiskIndicator score={anomaly.riskScore} severity={anomaly.severity} size="sm" />
              </div>
              <span className="text-slate-500 text-[11px] block mt-1 font-mono">
                Severity: {anomaly.severity.toUpperCase()}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Anomaly Score
              </span>
              <div className="flex items-center gap-2">
                <AnomalyScoreBadge score={anomaly.anomalyScore} showPercent={true} />
              </div>
              <span className="text-slate-500 text-[11px] block mt-1">
                Outlier Persistence: {anomaly.durationDays} days
              </span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Load Deviation
              </span>
              <span className="font-mono font-bold text-red-600 text-sm block">
                {anomaly.actualVsBaselinePct}%
              </span>
              <span className="text-slate-500 text-[11px] block mt-1">
                Detected: {formatTimestamp(anomaly.detectedAt)}
              </span>
            </div>
          </div>

          {/* Rationale Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Anomaly Detection Rationale
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Anomaly <strong className="text-slate-900">{anomaly.id}</strong> on meter{' '}
              <strong className="text-slate-900">{anomaly.meterId}</strong> represents a sustained{' '}
              <strong className="text-red-600">{anomaly.actualVsBaselinePct}% load deviation</strong> lasting{' '}
              {anomaly.durationDays} consecutive days. Multi-model fusion attributes this anomaly to{' '}
              <strong className="text-slate-900">{anomaly.likelyCause}</strong> with {anomaly.confidence}% algorithmic confidence.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE & SIGNALS */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Signals */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Algorithm Detection Signals</CardTitle>
                  <CardDescription>
                    Individual model evaluations contributing to the hybrid anomaly score
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {consumer?.signals && consumer.signals.length > 0 ? (
                  consumer.signals.map((sig) => <ModelSignalCard key={sig.id} signal={sig} />)
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No active model signals cached.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Evidence Summary */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Auditable Verification Evidence</CardTitle>
                  <CardDescription>
                    Empirical data points and meter inspection criteria
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {consumer?.evidence && consumer.evidence.length > 0 ? (
                  consumer.evidence.map((ev) => <EvidenceCard key={ev.id} item={ev} />)
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No empirical evidence items cached.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: CONSUMPTION */}
      {activeTab === 'consumption' && (
        <div className="space-y-4">
          <ActualBaselinePeerChart
            data={history || []}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </div>
      )}

      {/* TAB 4: CASE */}
      {activeTab === 'case' && (
        <div className="space-y-6">
          {linkedCase ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Case #{linkedCase.id}</CardTitle>
                    <CardDescription>
                      Associated operational case assigned for field or remote resolution
                    </CardDescription>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedCase(linkedCase)}
                  >
                    Open Investigation Drawer &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Priority
                    </span>
                    <SeverityBadge severity={linkedCase.severity} size="sm" />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Status
                    </span>
                    <span className="font-mono font-medium text-slate-900">
                      {linkedCase.status}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Assignee
                    </span>
                    <span className="font-medium text-slate-900">
                      {linkedCase.assignee}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Created
                    </span>
                    <span className="font-mono text-slate-600">
                      {formatTimestamp(linkedCase.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded text-xs text-blue-900">
                  <p className="font-semibold mb-0.5">Notes &amp; Resolution Actions:</p>
                  <p className="text-blue-800">
                    Use the investigation drawer to update case status (Confirmed, False Positive, Resolved), assign operators, or record audit notes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded">
              <p className="mb-3">No active case is linked to this anomaly yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/cases')}
              >
                Go to Cases
              </Button>
            </div>
          )}
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
