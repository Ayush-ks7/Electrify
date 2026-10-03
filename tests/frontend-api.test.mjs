import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, request } from '../src/services/api.ts';
import {
  historyPoints,
  probabilityLabel,
  reviewLabel,
  summarizeConsumers,
} from '../src/utils/liveData.ts';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

test('history preserves null, recorded zero, gaps and calendar windows', () => {
  const points = historyPoints(
    [
      { date: '2024-01-01', consumption: 9 },
      { date: '2024-01-03', consumption: null },
      { date: '2024-01-04', consumption: 0 },
    ],
    '7D',
  );
  assert.deepEqual(
    points.map((p) => p.actual),
    [9, null, null, 0],
  );
  assert.ok(points.every((p) => p.baseline === null && p.peerAverage === null));
  assert.deepEqual(
    historyPoints(
      [
        { date: '2024-01-01', consumption: 2 },
        { date: '2024-02-01', consumption: 0 },
      ],
      '7D',
    ).map((p) => p.timestamp),
    [
      '2024-01-26',
      '2024-01-27',
      '2024-01-28',
      '2024-01-29',
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
    ],
  );
  assert.deepEqual(
    historyPoints([{ date: '2024-01-01', consumption: 1 }], '24H'),
    [],
  );
});

test('summary uses saved screening flags, preserves zero and distinguishes missing risk', () => {
  const risk = (id, probability, flag) => ({
    consumer_id: id,
    score: {
      results: [
        {
          CONS_NO: id,
          predicted_probability: probability,
          screening_flag: flag,
        },
      ],
    },
  });
  const rows = [
    { id: 'A', risk: risk('A', 0, false) },
    { id: 'B', risk: risk('B', 0.1, true) },
    { id: 'C', risk: null },
  ];
  assert.deepEqual(summarizeConsumers(rows), {
    total: 3,
    scored: 2,
    flagged: 1,
    average: 0.05,
    incomplete: false,
  });
  assert.equal(probabilityLabel(0), '0.00%');
  assert.equal(probabilityLabel(null), 'Unavailable');
  assert.equal(reviewLabel(null), 'Not scored');
  assert.equal(reviewLabel(rows[1].risk), 'Screen for review');
  assert.equal(
    summarizeConsumers([{ id: 'X', risk: null, riskError: 'Offline' }])
      .incomplete,
    true,
  );
  assert.equal(summarizeConsumers([]).average, null);
});

test('consumer and history pagination consume every page, retaining identifiers and nulls', async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    const offset = Number(new URL(url).searchParams.get('offset'));
    return url.includes('/history')
      ? json({
          readings: [
            {
              date: offset ? '2024-01-02' : '2024-01-01',
              consumption: offset ? 0 : null,
            },
          ],
          total: 2,
        })
      : json({
          consumers: [
            { consumer_id: offset ? 'b' : 'A', created_at: '2024-01-01' },
          ],
          total: 2,
        });
  };
  assert.deepEqual(
    (await api.consumers()).map((c) => c.id),
    ['A', 'b'],
  );
  assert.deepEqual(
    (await api.history('ID:#?+%')).map((r) => r.consumption),
    [null, 0],
  );
  assert.ok(urls[3].includes('ID%3A%23%3F%2B%25/history?limit=1000&offset=1'));
});

test('only documented missing-record errors become empty results', async () => {
  globalThis.fetch = async () =>
    json({ detail: { code: 'RISK_NOT_FOUND', message: 'No prediction' } }, 404);
  assert.equal(await api.risk('A'), null);
  globalThis.fetch = async () =>
    json(
      { detail: { code: 'CONSUMER_NOT_FOUND', message: 'No consumer' } },
      404,
    );
  assert.equal(await api.consumer('A'), null);
  await assert.rejects(
    api.risk('A'),
    (error) => error instanceof ApiError && error.code === 'CONSUMER_NOT_FOUND',
  );
  globalThis.fetch = async () =>
    json(
      {
        detail: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database unavailable',
        },
      },
      503,
    );
  await assert.rejects(api.risk('A'), /Database unavailable/);
});

test('health retains degraded component status on HTTP 503', async () => {
  globalThis.fetch = async () =>
    json(
      {
        status: 'degraded',
        model: 'unavailable',
        database: 'ok',
        feature_count: 24,
      },
      503,
    );
  assert.equal((await api.health()).model, 'unavailable');
});

test('client reports network, auth, validation and malformed-response errors safely', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(request('/health'), /Cannot reach the backend/);
  globalThis.fetch = async () => json({ detail: 'Unauthorized' }, 401);
  await assert.rejects(api.modelInfo(), /do not put API keys in the browser/);
  globalThis.fetch = async () =>
    json(
      {
        detail: {
          code: 'INVALID_INPUT',
          message: 'Request validation failed.',
        },
      },
      422,
    );
  await assert.rejects(
    api.score({ consumers: [] }),
    (error) => error.status === 422 && error.code === 'INVALID_INPUT',
  );
  globalThis.fetch = async () => new Response('<html>proxy error</html>');
  await assert.rejects(api.consumers(), /invalid JSON/);
});

test('scoring forwards inputs unchanged without inserting labels, keys or feature calculations', async () => {
  const payload = {
    consumers: [
      {
        CONS_NO: 'A',
        readings: [
          { date: '2024-01-01', consumption: null },
          { date: '2024-01-02', consumption: 0 },
        ],
      },
    ],
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/v1/score-history'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.headers['X-API-Key'], undefined);
    return json({ results: [] });
  };
  await api.scoreHistory(payload);
});

test('cancellation propagates without being reported as backend failure', async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_url, options) => options.signal.throwIfAborted();
  await assert.rejects(
    api.consumers(controller.signal),
    (error) => error.name === 'AbortError',
  );
});
