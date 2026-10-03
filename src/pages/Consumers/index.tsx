import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConsumers } from '../../hooks';
import { ConsumerTable, ConsumerSortField } from '../../components/tables/ConsumerTable';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Search, RotateCcw } from 'lucide-react';

export function Consumers() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [cause, setCause] = useState(searchParams.get('cause') || 'all');
  const [dateRange, setDateRange] = useState('all');

  // Derive min/max risk from severity selection
  let minRisk: number | undefined = undefined;
  let maxRisk: number | undefined = undefined;
  if (severity === 'critical') minRisk = 85;
  else if (severity === 'high') minRisk = 70;
  else if (severity === 'medium') {
    minRisk = 40;
    maxRisk = 69;
  } else if (severity === 'low') {
    maxRisk = 39;
  }

  const { data: rawConsumers = [], isLoading } = useConsumers({
    search,
    severity: severity !== 'all' ? severity : undefined,
    status: status !== 'all' ? status : undefined,
    cause: cause !== 'all' ? cause : undefined,
    minRisk,
    maxRisk,
  });

  // Client-side date filter if specified
  const filteredConsumers = useMemo(() => {
    if (dateRange === 'all') return rawConsumers;
    const now = new Date().getTime();
    return rawConsumers.filter((c) => {
      const updated = new Date(c.updatedAt).getTime();
      const diffHours = (now - updated) / (1000 * 60 * 60);
      if (dateRange === '24h') return diffHours <= 24;
      if (dateRange === '7d') return diffHours <= 24 * 7;
      if (dateRange === '30d') return diffHours <= 24 * 30;
      return true;
    });
  }, [rawConsumers, dateRange]);

  const handleResetFilters = () => {
    setSearch('');
    setSeverity('all');
    setStatus('all');
    setCause('all');
    setDateRange('all');
    setSearchParams({});
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Consumers"
        description="Comprehensive directory of monitored metered consumers, risk profiles, and telemetry updates"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Consumers' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetFilters}
          >
            Reset Filters
          </Button>
        }
      />

      {/* Filter Bar: Search | Risk | Status | Cause | Date */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Consumer ID, Meter, Name, or Feeder..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Filter */}
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs"
          >
            <option value="all">Risk: All</option>
            <option value="critical">Critical (&gt;85)</option>
            <option value="high">High (70-84)</option>
            <option value="medium">Medium (40-69)</option>
            <option value="low">Low (&lt;40)</option>
          </Select>

          {/* Status Filter */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs"
          >
            <option value="all">Status: All</option>
            <option value="Flagged">Flagged</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Active">Active</option>
            <option value="Cleared">Cleared</option>
          </Select>

          {/* Cause Filter */}
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

          {/* Date Filter */}
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

      {/* Main Table: Consumer | Meter | Usage | Risk | Status | Updated */}
      <ConsumerTable consumers={filteredConsumers} isLoading={isLoading} />
    </div>
  );
}
