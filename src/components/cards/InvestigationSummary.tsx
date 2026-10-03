import type { CaseStatus, Investigation } from '../../types/simulation';
import { caseStatuses } from '../../types/simulation';
import { useCaseStatus } from '../../hooks/simulation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select } from '../ui/select';
import { QueryState } from '../common/QueryState';
import { probabilityLabel } from '../../utils/liveData';
import { formatKwh } from '../../utils/formatters';

export function InvestigationSummary({ record: r, detailed = false }: { record: Investigation; detailed?: boolean }) {
  const status = useCaseStatus(r.consumer_id);
  const score = r.prediction?.score.results.find(s => s.CONS_NO === r.consumer_id);
  const reading = r.latest_reading;
  return <Card>
    <CardHeader><div><CardTitle>Investigation · {r.source_consumer_id ?? r.consumer_id}</CardTitle><CardDescription>{r.simulated ? `Simulated · ${r.stream_state} · ${r.provenance}` : 'Stored consumer history'}</CardDescription></div></CardHeader>
    <CardContent className="text-xs space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Current power', reading?.power_kw == null ? 'Missing / unavailable' : `${reading.power_kw.toFixed(3)} kW`],
          ['Last completed day / baseline', `${formatKwh(r.latest_daily_kwh)} / ${formatKwh(r.baseline_kwh)}`],
          ['ML review probability', probabilityLabel(r.review_probability)], ['Risk level', r.risk_level],
          ['Meter / communication', `${reading?.meter_status ?? 'Unavailable'} / ${reading?.communication_status ?? 'Unavailable'}`],
          ['Inspection priority (rules)', r.inspection_priority],
        ].map(([label, value]) => <div key={label}><div className="text-slate-500 text-[10px] uppercase mb-1">{label}</div><div className="font-medium">{value}</div></div>)}
      </div>
      <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2"><p className="font-semibold">{r.probable_cause}</p><p className="text-slate-500">Cause confidence: {r.cause_evidence_confidence}</p><p>{r.recommended_action}</p></div>
      <label className="block space-y-1.5">Case status<Select aria-label="Case status" value={r.case_status ?? ''} disabled={status.isPending} onChange={e => status.mutate(e.target.value as CaseStatus)}>
        <option value="" disabled>{r.requires_review ? 'Requires Review (new)' : 'Monitoring — no case opened'}</option>{caseStatuses.map(s => <option key={s}>{s}</option>)}
      </Select></label>
      <QueryState error={status.error} />
      {r.last_error && <p role="alert" className="text-amber-800">{r.last_error}</p>}
      <p className="text-slate-500">{r.score_state ?? 'Full-history scoring only'}{r.prediction && ` · Scored period: ${r.prediction.period_start ?? 'Feature input'} to ${r.prediction.period_end ?? '—'}`}</p>
      {detailed && <>
        <div className="border-t border-slate-200 pt-3 space-y-2"><h3 className="font-semibold">Supporting evidence</h3><ul className="list-disc pl-4 space-y-1">{r.evidence.map(e => <li key={e}>{e}</li>)}</ul>
          <p className="text-slate-500">Detection window (simulation clock): {r.detection_start?.slice(0, 16).replace('T', ' ') ?? 'Unavailable'} → {r.detection_end?.slice(0, 16).replace('T', ' ') ?? 'Unavailable'} UTC</p>
          <p className="text-slate-500">{r.priority_basis}. Anomaly score and calibrated cause confidence are unavailable.</p>
        </div>
        {reading && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-200 pt-3">
          <p>Voltage: {reading.voltage_v ?? 'Missing'} V</p><p>Current: {reading.current_a ?? 'Missing'} A</p><p>Energy: {reading.energy_kwh ?? 'Missing'} kWh / {reading.interval_minutes} min</p><p>Virtual time: {reading.timestamp.slice(0, 16).replace('T', ' ')} UTC</p>
        </div>}
        <div className="border-t border-slate-200 pt-3 space-y-3"><h3 className="font-semibold">Full-history model explanation</h3>
          <p className="text-slate-500">Screening threshold: {probabilityLabel(score?.screening_threshold)} · Observed days: {score?.data_quality.observed_days ?? 'Unavailable'} · Missing days: {score?.data_quality.missing_days ?? 'Unavailable'}</p>
          {score?.explanation?.top_signals.map(signal => <div key={signal.feature} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1"><p className="font-mono font-semibold">{signal.feature}</p><p>{signal.description}</p><p className="text-slate-500">Value: {signal.value ?? 'Missing'} · Reference: {signal.reference_value} · {signal.direction} · Probability sensitivity: {signal.probability_sensitivity.toFixed(6)}</p></div>)}
          <p className="text-slate-500">{score?.explanation?.note ?? 'No model explanation saved yet.'}</p>
          {r.prediction?.score.history_warnings.map(w => <p key={w} className="text-amber-800">{w}</p>)}
        </div>
      </>}
      <p className="text-slate-500">Model probability prioritizes review; it is not proof of theft. Operational hypotheses require verification.</p>
    </CardContent>
  </Card>;
}
