import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTelemetry } from '../../hooks/simulation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { QueryState } from '../common/QueryState';

export function LiveMeterChart({ id }: { id: string }) {
  const query = useTelemetry(id, true);
  const readings = query.data?.readings ?? [];
  return <Card><CardHeader><div><CardTitle>Live Meter Readings</CardTitle><CardDescription>Latest 96 intervals · simulated UTC clock · power in kW · missing payloads remain gaps</CardDescription></div></CardHeader><CardContent>
    <QueryState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />
    <div className="h-48 min-w-0">{readings.some(r => r.power_kw !== null) ? <ResponsiveContainer width="100%" height="100%"><LineChart data={readings} margin={{ left: -15, right: 10 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="timestamp" tickFormatter={s => String(s).slice(11, 16)} fontSize={10} /><YAxis fontSize={10} /><Tooltip labelFormatter={s => `${String(s).slice(0, 16).replace('T', ' ')} UTC`} />
      <Line dataKey="power_kw" name="Power (kW)" stroke="#0F52BA" dot={false} connectNulls={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-xs text-slate-500">{readings.length ? 'Communication interrupted — payloads missing.' : 'Waiting for telemetry…'}</div>}</div>
    <p className="text-xs text-slate-500 mt-2">{readings.length} intervals loaded · {readings.filter(r => r.power_kw === null).length} missing · Last arrival: {readings.at(-1)?.received_at.slice(0, 19).replace('T', ' ') ?? 'Waiting'} UTC</p>
  </CardContent></Card>;
}
