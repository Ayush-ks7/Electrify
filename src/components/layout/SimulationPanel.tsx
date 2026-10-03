import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { useDirectory } from '../../hooks/live';
import { useSimulation } from '../../hooks/simulation';
import { simulationApi } from '../../services/simulation';
import { scenarios } from '../../types/simulation';
import type { Scenario, SimulationState, Speed } from '../../types/simulation';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { QueryState } from '../common/QueryState';

export function SimulationPanel() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [speed, setSpeed] = useState<Speed>('fast');
  const [selected, setSelected] = useState<string[]>(['demo:1']);
  const state = useSimulation();
  const directory = useDirectory(open);
  const client = useQueryClient();
  const button = useRef<HTMLButtonElement>(null);
  const streams = state.data?.streams ?? [];
  const running = streams.filter(s => s.state === 'running').length;
  const revision = streams.map(s => `${s.consumer_id}:${s.cursor}:${s.state}:${s.score_state}`).join('|');
  // Invalidations follow durable server progress. No browser timer generates readings.
  useEffect(() => {
    void client.invalidateQueries({ predicate: query => query.queryKey[0] === 'live' && !['health', 'model'].includes(String(query.queryKey[1])) });
  }, [revision, client]);
  const mutation = useMutation({
    mutationKey: ['simulation-control'],
    onMutate: async () => {
      await client.cancelQueries({ predicate: query => ['simulation', 'investigations', 'investigation', 'telemetry', 'live'].includes(String(query.queryKey[0])) });
    },
    mutationFn: async (task: () => Promise<SimulationState>) => task(),
    onSuccess: async result => {
      client.setQueryData(['simulation'], result);
      // Refresh membership before re-enabling history polling, so reset cannot
      // fetch a deleted demo consumer from a stale dashboard selection.
      await client.fetchQuery({ queryKey: ['investigations'], queryFn: ({ signal }) => simulationApi.investigations(signal), staleTime: 0 });
      await client.invalidateQueries({ queryKey: ['live'] });
    },
  });
  const close = () => { setOpen(false); button.current?.focus(); };
  const demoIds = state.data?.demo_consumers ?? ['demo:1', 'demo:2', 'demo:3', 'demo:4', 'demo:5'];
  const originals = (directory.data ?? []).filter(c => !streams.some(s => s.consumer_id === c.id));
  const start = () => mutation.mutate(() => simulationApi.start(selected.map(consumer_id => ({ consumer_id, scenario })), speed));
  const reset = () => mutation.mutate(async () => {
    const result = await simulationApi.control('reset');
    if (streams.some(s => location.pathname === '/consumers/' + encodeURIComponent(s.consumer_id))) navigate('/dashboard');
    return result;
  });

  return <>
    <Button ref={button} variant="primary" className="fixed bottom-5 right-5 z-40 shadow-lg" icon={<Radio className="w-4 h-4" />} onClick={() => setOpen(true)}>
      Simulation Mode{running > 0 ? ` · ${running} live` : ''}
    </Button>
    <Modal isOpen={open} onClose={close} title="Simulation Mode" description="Virtual smart meters · data is simulated" size="md">
      <div className="space-y-4 text-xs">
        <p className="text-slate-500">Selected consumers use demo copies. Original history stays intact. Start also resumes a paused stream.</p>
        <QueryState error={state.error ?? directory.error ?? mutation.error} onRetry={() => { void state.refetch(); void directory.refetch(); }} />
        <label className="block space-y-1.5 font-medium">Scenario
          <Select aria-label="Scenario" value={scenario} onChange={e => setScenario(e.target.value as Scenario)}>{scenarios.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
        </label>
        <fieldset className="space-y-2"><legend className="font-medium mb-2">Consumers</legend>
          <div className="flex gap-3"><button className="text-[#0F52BA]" onClick={() => setSelected(demoIds)}>Select demo group</button><button className="text-slate-500" onClick={() => setSelected([])}>Clear</button></div>
          <div className="max-h-36 overflow-auto border border-slate-200 rounded p-2 space-y-2">
            {[...demoIds.map((id, i) => ({ id, label: `Demo consumer ${i + 1}` })), ...originals.map(c => ({ id: c.id, label: c.id }))].map(c => <label key={c.id} className="flex items-center gap-2 break-all">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.label}
            </label>)}
          </div>
        </fieldset>
        <label className="block space-y-1.5 font-medium">Stream speed
          <Select aria-label="Stream speed" value={speed} onChange={e => setSpeed(e.target.value as Speed)}>
            <option value="realistic">Realistic · 1 minute per minute</option><option value="fast">Fast demo · 6 hours every 2 seconds</option><option value="very_fast">Very fast · 1 day every second</option>
          </Select>
        </label>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" disabled={!selected.length || selected.length > 20 || mutation.isPending || state.isError} onClick={start}>{mutation.isPending ? 'Applying…' : 'Start / Resume'}</Button>
          <Button size="sm" variant="outline" disabled={mutation.isPending || !streams.length} onClick={() => mutation.mutate(() => simulationApi.control('pause'))}>Pause all</Button>
          <Button size="sm" variant="outline" disabled={mutation.isPending || !streams.length} onClick={() => mutation.mutate(() => simulationApi.control('stop'))}>Stop all</Button>
          <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(() => simulationApi.start(demoIds.map((consumer_id, i) => ({ consumer_id, scenario: scenarios[i].value })), speed))}>Run mixed demo</Button>
        </div>
        <p className="text-slate-500">Mixed demo assigns all five scenarios. ML scores completed daily history after the first day, then every 7 simulated days (minimum 30 observed days). Demo clocks may advance into future dates.</p>
        <div aria-live="polite" className="space-y-2 max-h-48 overflow-auto">
          {!streams.length && <p className="text-slate-500">No simulations yet.</p>}
          {streams.map(s => <div key={s.consumer_id} className="border border-slate-200 bg-slate-50 rounded p-2.5 space-y-1">
            <div className="font-medium">{s.source_consumer_id} · {s.state} · {scenarios.find(x => x.value === s.scenario)?.label}</div>
            <p className="font-mono text-slate-500">{s.generated_readings} readings · {s.completed_days} days · {s.cursor.slice(0, 16).replace('T', ' ')} UTC</p>
            <p>{s.score_state}</p>{s.last_error && <p role="alert" className="text-red-700">{s.last_error}</p>}
            <div className="flex gap-3 text-[#0F52BA]">
              <button disabled={mutation.isPending} onClick={() => mutation.mutate(() => simulationApi.start([{ consumer_id: s.consumer_id, scenario: s.scenario }], s.speed))}>Resume</button>
              <button disabled={mutation.isPending} onClick={() => mutation.mutate(() => simulationApi.control('pause', [s.consumer_id]))}>Pause</button>
              <button disabled={mutation.isPending} onClick={() => mutation.mutate(() => simulationApi.control('stop', [s.consumer_id]))}>Stop</button>
            </div>
          </div>)}
        </div>
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <p className="text-slate-500">Reset removes all demo copies, their readings, scores and investigation statuses.</p>
          <Button size="sm" variant="outline" disabled={mutation.isPending || !streams.length} onClick={reset}>Reset Simulation</Button>
        </div>
      </div>
    </Modal>
  </>;
}
