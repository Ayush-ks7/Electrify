import React, { useState, useMemo } from 'react';
import { useAnomalies } from '../../hooks';
import { AnomalyTable } from '../../components/tables/AnomalyTable';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Search, RotateCcw } from 'lucide-react';

export function Anomalies() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [cause, setCause] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const { data: rawAnomalies = [], isLoading } = useAnomalies({
    search,
    severity: severity !== 'all' ? severity : undefined,
    cause: cause !== 'all' ? cause : undefined,
    status: status !== 'all' ? status : undefined,
  });

  const filteredAnomalies = useMemo(() => {
    if (dateRange === 'all') return rawAnomalies;
    const now = new Date().getTime();
    return rawAnomalies.filter((a) => {
      const detected = new Date(a.detectedAt).getTime();
      const diffHours = (now - detected) / (1000 * 60 * 60);
      if (dateRange === '24h') return diffHours <= 24;
      if (dateRange === '7d') return diffHours <= 24 * 7;
      if (dateRange === '30d') return diffHours <= 24 * 30;
      return true;
    });
  }, [rawAnomalies, dateRange]);

  const handleReset = () => {
    setSearch('');
    setSeverity('all');
    setCause('all');
    setStatus('all');
    setDateRange('all');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anomalies"
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

      {/* Filter Bar: Search | Severity | Cause | Status | Date */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Anomaly ID, Consumer, or Meter ID..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>

          {/* Cause */}
          <Select
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            className="text-xs"
          >
            <option value="all">Cause: All</option>
            <option value="Suspected Theft">Suspected Theft</option>
            <option value="Meter Fault">Meter Fault</option>
            <option value="Communication Issue">Communication Issue</option>
            <option value="Legitimate Behaviour">Legitimate Behaviour</option>
          </Select>

          {/* Status */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs"
          >
            <option value="all">Status: All</option>
            <option value="Unresolved">Unresolved</option>
            <option value="Investigating">Investigating</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Dismissed">Dismissed</option>
          </Select>

          {/* Date */}
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs"
          >
            <option value="all">Date: All Time</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
          </Select>
        </div>
      </div>

      {/* Main Table: ID | Consumer | Risk | Cause | Severity | Time | Status */}
      <AnomalyTable anomalies={filteredAnomalies} isLoading={isLoading} />
    </div>
  );
}
