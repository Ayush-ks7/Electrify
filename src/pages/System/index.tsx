import React from 'react';
import { useSystemMetrics } from '../../hooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RotateCw, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/classNames';

export function System() {
  const { modules = [], metrics, isLoading, refetch } = useSystemMetrics();

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
        title="System & Model Diagnostics"
        description="Module execution status and core machine learning performance evaluation metrics"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'System' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={() => refetch()}
          >
            Refresh Status
          </Button>
        }
      />

      {/* Supported ML Performance Metrics: Precision, Recall, F1, ROC-AUC, False Positive Rate */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded text-xs shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Precision
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {metrics?.precision || 92.4}%
          </div>
          <span className="text-[11px] text-emerald-600 block mt-1 font-medium">
            True positive density
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded text-xs shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Recall
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {metrics?.recall || 89.1}%
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Unmetered load capture
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded text-xs shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            F1-Score
          </span>
          <div className="text-2xl font-bold font-mono text-[#0F52BA]">
            {metrics?.f1Score || 90.7}%
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Harmonic balance
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded text-xs shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            ROC-AUC
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {metrics?.rocAuc || 0.954}
          </div>
          <span className="text-[11px] text-emerald-600 block mt-1 font-medium">
            Discriminative power
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded text-xs shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            False Positive Rate
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {metrics?.falsePositiveRate || 3.8}%
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Under 5.0% threshold
          </span>
        </div>
      </div>

      {/* Module Status Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Pipeline Module Status</CardTitle>
            <CardDescription>
              Service health, processing latency, and execution state across pipeline stages
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Modules Nominal
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="py-2.5 px-3.5">Module Name</th>
                  <th className="py-2.5 px-3.5">Code</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Latency</th>
                  <th className="py-2.5 px-3.5">Throughput</th>
                  <th className="py-2.5 px-3.5">Last Sync</th>
                  <th className="py-2.5 px-3.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {modules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      {mod.name}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">{mod.code}</td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded border text-[11px] font-mono font-medium',
                          getStatusBadge(mod.status)
                        )}
                      >
                        {mod.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-800">
                      {mod.latencyMs} ms
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-700">
                      {mod.throughputRate}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">
                      {mod.lastRun}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-sm">
                      {mod.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Model Metadata Box */}
      <div className="p-4 bg-white border border-slate-200 rounded-md text-xs space-y-2 text-slate-600">
        <h4 className="font-semibold text-slate-900">Model Validation Metadata</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Last Training Run
            </span>
            <span className="font-mono text-slate-800 font-medium">
              {metrics?.lastTrained || '2026-09-18 02:00 UTC'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Validation Dataset Size
            </span>
            <span className="font-mono text-slate-800 font-medium">
              {metrics?.validationDatasetSize?.toLocaleString() || '120,000'} Meter Readings
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Data Adapter
            </span>
            <span className="font-mono text-emerald-700 font-medium">
              Historical Mock Adapter (API-ready)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
