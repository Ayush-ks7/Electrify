import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useHistory, useRescore } from '../../hooks/live';
import { useInvestigation } from '../../hooks/simulation';
import { PageHeader } from '../../components/common/PageHeader';
import { QueryState } from '../../components/common/QueryState';
import { Button } from '../../components/ui/button';
import { ConsumptionTrendChart } from '../../components/charts/ConsumptionTrendChart';
import { LiveMeterChart } from '../../components/charts/LiveMeterChart';
import { InvestigationSummary } from '../../components/cards/InvestigationSummary';
import { historyPoints } from '../../utils/liveData';

export function ConsumerDetail() {
  const { id = '' } = useParams<{ id: string }>();
  return <Detail key={id} id={id} />;
}

function Detail({ id }: { id: string }) {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | '1Y'>('30D');
  const query = useInvestigation(id);
  const history = useHistory(id, Boolean(query.data));
  const rescore = useRescore(id);
  const client = useQueryClient();
  const record = query.data;
  if (!record) return <QueryState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;
  const points = historyPoints(history.data ?? [], timeframe).map(p => ({ ...p, baseline: record.baseline_kwh }));
  return <div className="space-y-6 pb-14">
    <PageHeader title={id} description={record.simulated ? `Simulated copy of ${record.source_consumer_id} · ${record.stream_state}` : 'Consumer investigation and full-history review signals'}
      breadcrumbs={[{ label: 'Overview', href: '/dashboard' }, { label: 'Consumers', href: '/consumers' }, { label: id }]}
      actions={<Button size="sm" disabled={rescore.isPending || history.isError || history.isFetching || (record.simulated ? (history.data?.filter(r => r.consumption !== null).length ?? 0) < 30 : (history.data?.length ?? 0) < 2)} onClick={() => rescore.mutate(undefined, { onSuccess: () => { void client.invalidateQueries({ queryKey: ['investigation', id] }); } })}>{rescore.isPending ? 'Scoring…' : 'Score Stored History'}</Button>} />
    <QueryState error={query.error ?? rescore.error} onRetry={() => query.refetch()} />
    {rescore.isSuccess && <QueryState empty="Stored history scored and saved successfully." />}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4 min-w-0">
        {record.simulated && <LiveMeterChart id={id} />}
        <QueryState loading={history.isLoading} error={history.error} onRetry={() => history.refetch()} />
        <ConsumptionTrendChart data={points} timeframe={timeframe} onTimeframeChange={setTimeframe} showBaselineToggle={record.baseline_kwh !== null} live />
        <p className="text-xs text-slate-500">Daily history includes only completed simulated days. A day containing an outage remains missing. Baseline is the fixed pre-simulation average, not an ML forecast.</p>
        <details className="bg-white border border-slate-200 rounded p-4 text-xs"><summary className="cursor-pointer font-semibold">Stored daily readings ({points.length} in selected window)</summary><div className="max-h-64 overflow-auto mt-3"><table className="w-full text-left"><thead><tr><th className="p-2">Date</th><th className="p-2">kWh</th></tr></thead><tbody>{points.map(p => <tr key={p.timestamp} className="border-t border-slate-100"><td className="p-2 font-mono">{p.timestamp}</td><td className="p-2">{p.actual ?? 'Missing'}</td></tr>)}</tbody></table></div></details>
      </div>
      <InvestigationSummary record={record} detailed />
    </div>
  </div>;
}
