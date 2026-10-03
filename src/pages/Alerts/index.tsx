import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAlerts } from '../../hooks';
import { AlertTable } from '../../components/tables/AlertTable';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Search, RotateCcw, BellRing, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAlertId = searchParams.get('id') || undefined;

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [cause, setCause] = useState('all');

  const { alerts = [], isLoading, updateStatus, assign, addNote } = useAlerts({
    search,
    severity: severity !== 'all' ? severity : undefined,
    status: status !== 'all' ? status : undefined,
    cause: cause !== 'all' ? cause : undefined,
  });

  const handleReset = () => {
    setSearch('');
    setSeverity('all');
    setStatus('all');
    setCause('all');
    setSearchParams({});
  };

  const statusCounts = {
    detected: alerts.filter((a) => a.status === 'Detected').length,
    open: alerts.filter((a) => a.status === 'Open').length,
    underReview: alerts.filter((a) => a.status === 'Under Review').length,
    confirmed: alerts.filter((a) => a.status === 'Confirmed').length,
    resolved: alerts.filter((a) => a.status === 'Resolved').length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts & Case Management Queue"
        description="Dispatch investigation cases, track field inspections, and record operational resolution outcomes"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Alerts & Cases' }]}
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

      {/* Case Status Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatus('Detected')}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-purple-700 uppercase">
            Detected (New)
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {statusCounts.detected}
          </div>
        </div>

        <div
          onClick={() => setStatus('Open')}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-blue-700 uppercase">
            Open Queue
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {statusCounts.open}
          </div>
        </div>

        <div
          onClick={() => setStatus('Under Review')}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-amber-700 uppercase">
            Under Review
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {statusCounts.underReview}
          </div>
        </div>

        <div
          onClick={() => setStatus('Confirmed')}
          className="p-3 bg-red-50/50 border border-red-200 rounded cursor-pointer hover:border-red-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-red-700 uppercase">
            Confirmed Thefts/Faults
          </span>
          <div className="font-mono font-bold text-xl text-red-700 mt-0.5">
            {statusCounts.confirmed}
          </div>
        </div>

        <div
          onClick={() => setStatus('Resolved')}
          className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-300 transition-colors"
        >
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">
            Resolved
          </span>
          <div className="font-mono font-bold text-xl text-slate-900 mt-0.5">
            {statusCounts.resolved}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Case ID, Consumer, Meter, or Assignee..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Case Statuses</option>
            <option value="Detected">Detected</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Confirmed">Confirmed</option>
            <option value="False Positive">False Positive</option>
            <option value="Resolved">Resolved</option>
          </Select>

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
        </div>
      </div>

      {/* Interactive Alert Table */}
      <AlertTable
        alerts={alerts}
        isLoading={isLoading}
        onUpdateStatus={updateStatus}
        onAssign={assign}
        onAddNote={addNote}
        initialSelectedId={selectedAlertId}
      />
    </div>
  );
}
