import type {
  ConsumerList,
  ConsumerRecord,
  FeatureScoreRequest,
  Health,
  HistoryResponse,
  HistoryScoreRequest,
  LiveConsumer,
  ModelInfo,
  RiskResponse,
  ScoreResponse,
} from '../types/api';

// Empty base URL supports a same-origin production reverse proxy.
export const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  acceptedStatuses: number[] = [],
): Promise<T> {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
    : AbortSignal.timeout(30_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      'Cannot reach the backend. Check the connection and try again.',
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    const message =
      response.status === 401 || response.status === 403
        ? 'Backend access denied. Configure authentication on your server proxy; do not put API keys in the browser.'
        : (body?.detail?.message ??
          `Backend request failed (${response.status}).`);
    throw new ApiError(message, response.status, body?.detail?.code);
  }
  if (body === null)
    throw new ApiError(
      'The backend returned an invalid JSON response.',
      response.status,
    );
  return body as T;
}

const consumerPath = (id: string) =>
  `/api/v1/consumers/${encodeURIComponent(id)}`;
const mapConsumer = (row: ConsumerRecord): LiveConsumer => ({
  id: row.consumer_id,
  createdAt: row.created_at,
});

export const api = {
  health: (signal?: AbortSignal) =>
    request<Health>('/health', { signal }, [503]),
  modelInfo: (signal?: AbortSignal) =>
    request<ModelInfo>('/api/v1/model-info', { signal }),
  async consumers(signal?: AbortSignal): Promise<LiveConsumer[]> {
    const rows: LiveConsumer[] = [];
    let offset = 0;
    while (true) {
      const page = await request<ConsumerList>(
        `/api/v1/consumers?limit=1000&offset=${offset}`,
        { signal },
      );
      rows.push(...page.consumers.map(mapConsumer));
      offset += page.consumers.length;
      if (offset >= page.total) break;
      if (!page.consumers.length)
        throw new ApiError(
          'The consumer directory changed while loading. Please refresh.',
          0,
        );
    }
    return rows;
  },
  async consumer(
    id: string,
    signal?: AbortSignal,
  ): Promise<LiveConsumer | null> {
    try {
      return mapConsumer(
        await request<ConsumerRecord>(consumerPath(id), { signal }),
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONSUMER_NOT_FOUND')
        return null;
      throw error;
    }
  },
  async risk(id: string, signal?: AbortSignal): Promise<RiskResponse | null> {
    try {
      return await request<RiskResponse>(`${consumerPath(id)}/risk`, {
        signal,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RISK_NOT_FOUND')
        return null;
      throw error;
    }
  },
  async history(id: string, signal?: AbortSignal) {
    const readings: HistoryResponse['readings'] = [];
    let offset = 0;
    while (true) {
      const page = await request<HistoryResponse>(
        `${consumerPath(id)}/history?limit=1000&offset=${offset}`,
        { signal },
      );
      readings.push(...page.readings);
      offset += page.readings.length;
      if (offset >= page.total) break;
      if (!page.readings.length)
        throw new ApiError('History changed while loading. Please refresh.', 0);
    }
    return readings;
  },
  score: (body: FeatureScoreRequest) =>
    request<ScoreResponse>('/api/v1/score', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  scoreHistory: (body: HistoryScoreRequest) =>
    request<ScoreResponse>('/api/v1/score-history', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
