import { request } from './api';
import type { CaseStatus, Investigation, MeterReading, Scenario, SimulationState, Speed } from '../types/simulation';

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const simulationApi = {
  status: (signal?: AbortSignal) => request<SimulationState>('/api/v1/simulation', { signal }),
  start: (targets: { consumer_id: string; scenario: Scenario }[], speed: Speed) =>
    post<SimulationState>('/api/v1/simulation/start', { targets, speed }),
  control: (action: 'pause' | 'stop' | 'reset', consumer_ids: string[] = []) =>
    post<SimulationState>(`/api/v1/simulation/${action}`, { consumer_ids }),
  async investigations(signal?: AbortSignal) {
    const rows: Investigation[] = [];
    let offset = 0;
    while (true) {
      const page = await request<{ investigations: Investigation[]; total: number }>(`/api/v1/investigations?limit=1000&offset=${offset}`, { signal });
      rows.push(...page.investigations);
      offset += page.investigations.length;
      if (offset >= page.total) return rows;
      if (!page.investigations.length) throw new Error('Consumer list changed. Please retry.');
    }
  },
  investigation: (id: string, signal?: AbortSignal) => request<Investigation>(`/api/v1/investigations/${encodeURIComponent(id)}`, { signal }),
  telemetry: (id: string, signal?: AbortSignal) => request<{ readings: MeterReading[] }>(`/api/v1/consumers/${encodeURIComponent(id)}/telemetry`, { signal }),
  setStatus: (id: string, status: CaseStatus) => post<Investigation>(`/api/v1/investigations/${encodeURIComponent(id)}/status`, { status }),
};
