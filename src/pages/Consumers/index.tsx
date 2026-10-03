import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConsumers } from '../../hooks';
import { ConsumerTable } from '../../components/tables/ConsumerTable';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Search, Filter, RotateCcw } from 'lucide-react';

export function Consumers() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [cause, setCause] = useState(searchParams.get('cause') || 'all');
  const [riskRange, setRiskRange] = useState('all');

  // Derive min/max risk from selection
  let minRisk: number | undefined = undefined;
  let maxRisk: number | undefined = undefined;
  if (riskRange === 'high') minRisk = 70;
  if (riskRange === 'critical') minRisk = 85;
  if (riskRange === 'medium') {
    minRisk = 40;
    maxRisk = 69;
  }
  if (riskRange === 'low') maxRisk = 39;

  const { data: consumers = [], isLoading, refetch } = useConsumers({
    search,
    severity: severity !== 'all' ? severity : undefined,
    status: status !== 'all' ? status : undefined,
    cause: cause !== 'all' ? cause : undefined,
    minRisk,
    maxRisk,
  });

  const handleResetFilters = () => {
    setSearch('');
    setSeverity('all');
    setStatus('all');
    setCause('all');
    setRiskRange('all');
    setSearchParams({});
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Consumer Telemetry & Risk Directory"
        description="Comprehensive inventory of metered service points with real-time risk scores and anomaly indicators"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Consumers' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Consumer ID, Meter, Name, or Feeder..."
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
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Flagged">Flagged</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Active">Active</option>
            <option value="Cleared">Cleared</option>
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
            value={riskRange}
            onChange={(e) => setRiskRange(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Risk Scores</option>
            <option value="critical">Critical Risk (85-100)</option>
            <option value="high">High Risk (70-84)</option>
            <option value="medium">Medium Risk (40-69)</option>
            <option value="low">Low Risk (0-39)</option>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <ConsumerTable consumers={consumers} isLoading={isLoading} />
    </div>
  );
}
