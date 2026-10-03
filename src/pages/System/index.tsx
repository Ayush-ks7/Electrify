import React from 'react';
import { useSystemMetrics } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { PipelineFlow } from '../../components/common/PipelineFlow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
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
} from 'recharts';
import {
  Cpu,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Clock,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';
import { cn } from '../../utils/classNames';

export function System() {
  const { modules = [], metrics, isLoading, refetch } = useSystemMetrics();

  const featureImportance = [
    { feature: 'Day/Night Consumption Ratio', importance: 0.32 },
    { feature: 'Harmonic Baseline Deviation (Z-score)', importance: 0.26 },
    { feature: 'Feeder Peer Divergence', importance: 0.18 },
    { feature: 'Anomaly Persistence (Days)', importance: 0.14 },
    { feature: 'Phase Current Imbalance', importance: 0.10 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Training':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inactive':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Architecture & Model Diagnostics"
        description="Health metrics, inference latencies, and machine learning validation statistics for core detection services"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'System & ML' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={() => refetch()}
          >
            Check Pipeline Health
          </Button>
        }
      />

      {/* Visual Pipeline Flow */}
      <PipelineFlow activeStage={5} />

      {/* Model Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Precision
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {metrics?.precision || 92.4}%
          </div>
          <span className="text-[10px] text-emerald-600 block mt-1">
            High true-positive density
          </span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            Recall
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {metrics?.recall || 89.1}%
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Unmetered load capture
          </span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            F1-Score
          </span>
          <div className="text-2xl font-bold font-mono text-[#0F52BA]">
            {metrics?.f1Score || 90.7}%
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Harmonic balance
          </span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            ROC - AUC
          </span>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {metrics?.rocAuc || 0.954}
          </div>
          <span className="text-[10px] text-emerald-600 block mt-1">
            Excellent discriminative power
          </span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
            False Positive Rate
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {metrics?.falsePositiveRate || 3.8}%
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Well below 5% target
          </span>
        </div>
      </div>

      {/* Pipeline Modules Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Core Detection Modules & Engines</CardTitle>
            <CardDescription>
              Real-time execution status, micro-batch processing rates, and pipeline latency
            </CardDescription>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            4/4 Engines Nominal
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-3.5">Module Name</th>
                  <th className="py-3 px-3.5">Version & Build</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Latency</th>
                  <th className="py-3 px-3.5">Throughput</th>
                  <th className="py-3 px-3.5">Last Sync</th>
                  <th className="py-3 px-3.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {modules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {mod.name}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">{mod.code}</td>
                    <td className="py-3 px-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded border text-[11px] font-mono font-medium',
                          getStatusBadge(mod.status)
                        )}
                      >
                        {mod.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-800">
                      {mod.latencyMs} ms
                    </td>
                    <td className="py-3 px-3.5 font-mono font-medium text-slate-700">
                      {mod.throughputRate}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-500 text-[11px]">
                      {mod.lastRun}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 max-w-sm">
                      {mod.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance & Model Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feature Importance */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>XGBoost Model Feature Importance Weights</CardTitle>
              <CardDescription>
                Normalized Gini gain per feature in Cause Classification ensemble
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={featureImportance}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    domain={[0, 0.4]}
                    fontSize={11}
                    stroke="#64748b"
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
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
                            <p className="font-bold text-slate-800 font-sans">{d.feature}</p>
                            <p className="text-blue-600 font-bold">
                              Weight: {(d.importance * 100).toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="importance" fill="#0F52BA" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Training & Calibration Metadata */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Offline Training & Calibration Specs</CardTitle>
              <CardDescription>
                Supervised & unsupervised baseline hyper-parameter configuration
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    Training Dataset Window
                  </span>
                  <span className="text-slate-500">
                    420,000 smart meter reading intervals across 14 Feeder networks
                  </span>
                </div>
                <span className="font-mono text-slate-700 font-bold">90 Days</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    Isolation Forest Contamination Prior
                  </span>
                  <span className="text-slate-500">
                    Expected anomalous fraction parameter (alpha)
                  </span>
                </div>
                <span className="font-mono text-slate-700 font-bold">0.035</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    Last Retraining Checkpoint
                  </span>
                  <span className="text-slate-500">
                    Automated weekly model re-estimation
                  </span>
                </div>
                <span className="font-mono text-slate-700 font-bold">
                  {metrics?.lastTrained || '2026-09-18 02:00 UTC'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    API & Pipeline Adapter
                  </span>
                  <span className="text-slate-500">
                    Current source: In-memory typed historical mock; ready for REST/GraphQL socket
                  </span>
                </div>
                <span className="font-mono text-emerald-700 font-bold">Mock Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
