import React, { useState } from 'react';
import { useAnomalies } from '../../hooks';
import { AnomalyTable } from '../../components/tables/AnomalyTable';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Search, RotateCcw, AlertTriangle, ShieldAlert, Cpu, Radio } from 'lucide-react';

export function Anomalies() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [cause, setCause] = useState('all');
  const [status, setStatus] = useState('all');

  const { data: anomalies = [], isLoading } = useAnomalies({
    search,
    severity: severity !== 'all' ? severity : undefined,
    cause: cause !== 'all' ? cause : undefined,
    status: status !== 'all' ? status : undefined,
  });

  const counts = {
    total: anomalies.length,
    critical: anomalies.filter((a) => a.severity === 'critical').length,
    high: anomalies.filter((a) => a.severity === 'high').length,
    theft: anomalies.filter((a) => a.likelyCause === 'Suspected Theft').length,
    meterFault: anomalies.filter((a) => a.likelyCause === 'Meter Fault').length,
  };

  const handleReset = () => {
    setSearch('');
    setSeverity('all');
    setCause('all');
    setStatus('all');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anomaly Telemetry Registry"
        description="Catalog of mathematically verified load outliers, bypass signatures, and meter dropouts"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Anomalies' }]}
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

      {/* Summary Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => {
            setSeverity('all');
            setCause('all');
          }}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Anomalies
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {counts.total}
          </div>
        </div>

        <div
          onClick={() => setSeverity('critical')}
          className="p-3 bg-red-50/50 border border-red-200 rounded cursor-pointer hover:border-red-300"
        >
          <span className="text-[11px] font-semibold text-red-700 uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Critical Severity
          </span>
          <div className="font-mono font-bold text-xl text-red-700 mt-0.5">
            {counts.critical}
          </div>
        </div>

        <div
          onClick={() => setSeverity('high')}
          className="p-3 bg-orange-50/50 border border-orange-200 rounded cursor-pointer hover:border-orange-300"
        >
          <span className="text-[11px] font-semibold text-orange-700 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            High Severity
          </span>
          <div className="font-mono font-bold text-xl text-orange-700 mt-0.5">
            {counts.high}
          </div>
        </div>

        <div
          onClick={() => setCause('Suspected Theft')}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300"
        >
          <span className="text-[11px] font-semibold text-slate-600 uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            Suspected Theft
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {counts.theft}
          </div>
        </div>

        <div
          onClick={() => setCause('Meter Fault')}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300"
        >
          <span className="text-[11px] font-semibold text-slate-600 uppercase flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-orange-600" />
            Meter Faults
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {counts.meterFault}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Anomaly ID, Consumer, or Meter ID..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
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

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Unresolved">Unresolved</option>
            <option value="Investigating">Investigating</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Dismissed">Dismissed</option>
          </Select>
        </div>
      </div>

      {/* Anomaly Table */}
      <AnomalyTable anomalies={anomalies} isLoading={isLoading} />
    </div>
  );
}
