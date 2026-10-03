import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCases } from '../../hooks';
import { CaseTable } from '../../components/tables/CaseTable';
import { CaseDrawer } from '../../components/layout/CaseDrawer';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { CaseItem } from '../../types';
import { Search, RotateCcw } from 'lucide-react';

export function Cases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCaseId = searchParams.get('id') || undefined;

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [cause, setCause] = useState('all');

  const { cases = [], isLoading, updateStatus, assign, addNote } = useCases({
    search,
    severity: severity !== 'all' ? severity : undefined,
    status: status !== 'all' ? status : undefined,
    cause: cause !== 'all' ? cause : undefined,
  });

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  // Auto-select case if passed in query param
  useEffect(() => {
    if (selectedCaseId && cases.length > 0) {
      const match = cases.find((c) => c.id === selectedCaseId);
      if (match) setSelectedCase(match);
    }
  }, [selectedCaseId, cases]);

  const handleReset = () => {
    setSearch('');
    setSeverity('all');
    setStatus('all');
    setCause('all');
    setSearchParams({});
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cases"
        description="Dispatch investigation cases, track field inspections, and record operational resolution outcomes"
        breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Cases' }]}
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

      {/* Filter Toolbar: Search | Priority | Status | Cause */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Case ID, Consumer, Meter, or Assignee..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority / Severity */}
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs"
          >
            <option value="all">Priority: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>

          {/* Status */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs"
          >
            <option value="all">Status: All</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Confirmed">Confirmed</option>
            <option value="False Positive">False Positive</option>
            <option value="Resolved">Resolved</option>
            <option value="Detected">Detected</option>
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
        </div>
      </div>

      {/* Main Table: Case | Consumer | Priority | Cause | Assignee | Status | Updated */}
      <CaseTable
        cases={cases}
        isLoading={isLoading}
        onSelectCase={(c) => setSelectedCase(c)}
      />

      {/* Case Investigation Drawer */}
      <CaseDrawer
        caseItem={selectedCase}
        isOpen={selectedCase !== null}
        onClose={() => {
          setSelectedCase(null);
          if (selectedCaseId) {
            setSearchParams({});
          }
        }}
        onUpdateStatus={updateStatus}
        onAssign={assign}
        onAddNote={addNote}
      />
    </div>
  );
}
