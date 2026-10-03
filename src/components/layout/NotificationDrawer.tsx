import { Link } from 'react-router-dom';
import { useInvestigations } from '../../hooks/simulation';
import { Modal } from '../ui/modal';
import { QueryState } from '../common/QueryState';

export function NotificationDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const query = useInvestigations();
  const rows = (query.data ?? []).filter(r => r.requires_review && !['Dismissed', 'Resolved'].includes(r.case_status ?? ''));
  return <Modal isOpen={isOpen} onClose={onClose} title="Investigation Alerts" description="Live queue · status is saved in the consumer investigation" size="sm">
    <QueryState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />
    <div className="divide-y divide-slate-100 text-xs">{rows.map(r => <Link key={r.consumer_id} to={'/consumers/' + encodeURIComponent(r.consumer_id)} onClick={onClose} className="block py-3 space-y-1 hover:bg-slate-50">
      <p className="font-mono font-semibold text-[#0F52BA]">{r.consumer_id}{r.simulated ? ' · SIMULATED' : ''}</p><p>{r.probable_cause}</p><p className="text-slate-500">{r.inspection_priority} priority · {r.case_status ?? 'Requires Review'}</p>
    </Link>)}{!rows.length && query.isSuccess && <p className="p-5 text-center text-slate-500">No active review alerts.</p>}</div>
  </Modal>;
}
