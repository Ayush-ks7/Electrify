import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Investigation } from '../../types/simulation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { probabilityLabel } from '../../utils/liveData';
import { formatKwh } from '../../utils/formatters';

export function InvestigationTable({ rows }: { rows: Investigation[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = rows.filter(r => `${r.consumer_id} ${r.source_consumer_id ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'review' ? r.requires_review && !['Dismissed', 'Resolved'].includes(r.case_status ?? '') : r.simulated)))
    .sort((a, b) => Number(b.requires_review) - Number(a.requires_review) || a.consumer_id.localeCompare(b.consumer_id));
  return <Card>
    <CardHeader className="flex flex-wrap items-center justify-between gap-3">
      <div><CardTitle>Consumer Investigations</CardTitle><CardDescription>Live readings, operational evidence and saved ML review signals in one queue</CardDescription></div>
      <div className="flex gap-2"><Input aria-label="Search investigations" placeholder="Search consumer…" value={search} onChange={e => setSearch(e.target.value)} />
        <Select aria-label="Investigation filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All consumers</option><option value="review">Requires review</option><option value="simulated">Simulated</option></Select></div>
    </CardHeader>
    <CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50 text-slate-700 uppercase text-[11px]"><tr>
        {['Consumer', 'Latest / baseline', 'Review probability', 'Probable cause', 'Meter / communication', 'Priority', 'Case status'].map(label => <th key={label} className="py-2.5 px-3.5">{label}</th>)}
      </tr></thead><tbody className="divide-y divide-slate-100">
        {visible.map(r => <tr key={r.consumer_id} className="hover:bg-slate-50">
          <td className="p-3.5"><Link className="text-[#0F52BA] font-mono hover:underline" to={'/consumers/' + encodeURIComponent(r.consumer_id)}>{r.consumer_id}</Link>
            {r.simulated && <div className="text-[10px] text-slate-500 mt-1">SIMULATED · {r.source_consumer_id} · {r.stream_state}</div>}</td>
          <td className="p-3.5 whitespace-nowrap"><div>{r.latest_reading ? (r.latest_reading.power_kw === null ? 'Missing payload' : `${r.latest_reading.power_kw.toFixed(2)} kW`) : 'No telemetry'}</div>
            <div className="text-slate-500 mt-1">{formatKwh(r.latest_daily_kwh)} / {formatKwh(r.baseline_kwh)}</div>
            {r.deviation_pct !== null && <div className="text-slate-500">{r.deviation_pct > 0 ? '+' : ''}{r.deviation_pct}% daily change</div>}</td>
          <td className="p-3.5"><span className="font-mono">{probabilityLabel(r.review_probability)}</span><div className="text-slate-500 mt-1">{r.risk_level}</div></td>
          <td className="p-3.5 max-w-60">{r.probable_cause}<div className="text-slate-500 text-[10px] mt-1">{r.cause_evidence_confidence}</div></td>
          <td className="p-3.5">{r.latest_reading?.meter_status ?? 'Unavailable'} / {r.latest_reading?.communication_status ?? 'Unavailable'}</td>
          <td className="p-3.5"><span className={r.inspection_priority === 'High' ? 'text-amber-800 font-semibold' : 'text-slate-600'}>{r.inspection_priority}</span></td>
          <td className="p-3.5 whitespace-nowrap">{r.case_status ?? (r.requires_review ? 'Requires Review' : 'Monitoring')}</td>
        </tr>)}
        {!visible.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No matching consumers. Open Simulation Mode to run the demo group.</td></tr>}
      </tbody></table>
    </CardContent>
  </Card>;
}
