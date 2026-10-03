import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { simulationApi } from '../services/simulation';
import type { CaseStatus } from '../types/simulation';
import { liveQueryDefaults } from './live';

const polling = { ...liveQueryDefaults, staleTime: 0, refetchInterval: 2000 };
const useControlsIdle = () => useIsMutating({ mutationKey: ['simulation-control'] }) === 0;
export const useSimulation = () => useQuery({ queryKey: ['simulation'], queryFn: ({ signal }) => simulationApi.status(signal), enabled: useControlsIdle(), ...polling });
export const useInvestigations = () => useQuery({ queryKey: ['investigations'], queryFn: ({ signal }) => simulationApi.investigations(signal), enabled: useControlsIdle(), ...polling });
export const useInvestigation = (id: string) => {
  const idle = useControlsIdle();
  return useQuery({ queryKey: ['investigation', id], queryFn: ({ signal }) => simulationApi.investigation(id, signal), enabled: Boolean(id) && idle, ...polling });
};
export const useTelemetry = (id: string, enabled: boolean) => {
  const idle = useControlsIdle();
  return useQuery({ queryKey: ['telemetry', id], queryFn: ({ signal }) => simulationApi.telemetry(id, signal), enabled: Boolean(id) && enabled && idle, ...polling });
};
export function useCaseStatus(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (status: CaseStatus) => simulationApi.setStatus(id, status),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['investigations'] }), client.invalidateQueries({ queryKey: ['investigation', id] })]); } });
}
