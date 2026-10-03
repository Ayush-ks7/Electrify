import { useInvestigations } from '../../hooks/simulation';
import { InvestigationTable } from '../../components/tables/InvestigationTable';
import { PageHeader } from '../../components/common/PageHeader';
import { QueryState } from '../../components/common/QueryState';

export function Consumers() {
  const query = useInvestigations();
  return <div className="space-y-6 pb-14">
    <PageHeader title="Consumers & Investigations" description="One record for consumption, operational evidence, review signals and case status." />
    <QueryState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />
    <InvestigationTable rows={query.data ?? []} />
  </div>;
}
