import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../services/api';
import type { ConsumerSummary } from '../types/api';

export const liveQueryDefaults = {
  staleTime: 60_000,
  retry: (attempt: number, error: Error) =>
    attempt < 1 &&
    (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
};
const directoryOptions = {
  queryKey: ['live', 'consumers'],
  queryFn: ({ signal }: { signal: AbortSignal }) => api.consumers(signal),
  ...liveQueryDefaults,
};
const riskOptions = (id: string) => ({
  queryKey: ['live', 'risk', id],
  queryFn: ({ signal }: { signal: AbortSignal }) => api.risk(id, signal),
  ...liveQueryDefaults,
});
export const useDirectory = (enabled = true) =>
  useQuery({ ...directoryOptions, enabled });
export const useHealth = () =>
  useQuery({
    queryKey: ['live', 'health'],
    queryFn: ({ signal }) => api.health(signal),
    ...liveQueryDefaults,
  });
export const useModelInfo = () =>
  useQuery({
    queryKey: ['live', 'model'],
    queryFn: ({ signal }) => api.modelInfo(signal),
    ...liveQueryDefaults,
  });
export const useLiveConsumer = (id: string) =>
  useQuery({
    queryKey: ['live', 'consumer', id],
    queryFn: ({ signal }) => api.consumer(id, signal),
    enabled: Boolean(id),
    ...liveQueryDefaults,
  });
export const useRisk = (id: string, enabled = true) =>
  useQuery({ ...riskOptions(id), enabled: Boolean(id) && enabled });
export const useHistory = (id: string, enabled = true) => {
  const controlling = useIsMutating({ mutationKey: ['simulation-control'] }) > 0;
  return useQuery({
    queryKey: ['live', 'history', id],
    queryFn: ({ signal }) => api.history(id, signal),
    enabled: Boolean(id) && enabled && !controlling,
    ...liveQueryDefaults,
  });
};

export function useConsumerSummaries() {
  const client = useQueryClient();
  return useQuery({
    queryKey: ['live', 'summaries'],
    ...liveQueryDefaults,
    queryFn: async ({ signal }) => {
      const consumers = await client.fetchQuery(directoryOptions);
      const result: ConsumerSummary[] = new Array(consumers.length);
      let next = 0;
      // The v1 API has only individual latest-risk lookup. Bound concurrency and
      // share each result with detail pages instead of issuing unbounded requests.
      await Promise.all(
        Array.from({ length: Math.min(6, consumers.length) }, async () => {
          while (next < consumers.length) {
            signal.throwIfAborted();
            const index = next++;
            const consumer = consumers[index];
            try {
              result[index] = {
                ...consumer,
                risk: await client.fetchQuery(riskOptions(consumer.id)),
              };
            } catch (error) {
              result[index] = {
                ...consumer,
                risk: null,
                riskError:
                  error instanceof Error ? error.message : 'Risk unavailable',
              };
            }
          }
        }),
      );
      return result;
    },
  });
}

export function useRefreshLive() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['live'] });
}

export function useRescore(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.scoreHistory({
        consumers: [{ CONS_NO: id, stored: true }],
        include_explanations: true,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['live'] });
    },
  });
}
