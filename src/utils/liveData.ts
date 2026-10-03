import type { ConsumptionDataPoint } from '../types';
import type { ConsumerSummary, Reading, RiskResponse } from '../types/api';

export const scoreFor = (risk: RiskResponse | null | undefined) =>
  risk?.score.results.find((r) => r.CONS_NO === risk.consumer_id);
export const reviewLabel = (risk: RiskResponse | null | undefined) => {
  const score = scoreFor(risk);
  return !score
    ? 'Not scored'
    : score.screening_flag
      ? 'Screen for review'
      : 'Below screening threshold';
};
export const probabilityLabel = (value: number | null | undefined) =>
  value == null ? 'Unavailable' : `${(value * 100).toFixed(2)}%`;

export function summarizeConsumers(consumers: ConsumerSummary[]) {
  const scores = consumers.flatMap((c) => {
    const score = scoreFor(c.risk);
    return score ? [score] : [];
  });
  return {
    total: consumers.length,
    scored: scores.length,
    flagged: scores.filter((s) => s.screening_flag).length,
    average: scores.length
      ? scores.reduce((sum, s) => sum + s.predicted_probability, 0) /
        scores.length
      : null,
    incomplete: consumers.some((c) => c.riskError),
  };
}

// Presentation only: show calendar gaps as null; never interpolate or generate model features.
// Windows end at the latest stored reading so historical datasets remain inspectable.
export function historyPoints(
  readings: Reading[],
  timeframe: '24H' | '7D' | '30D' | '1Y',
): ConsumptionDataPoint[] {
  if (!readings.length || timeframe === '24H') return [];
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const last = Date.parse(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  const first = Math.max(
    Date.parse(`${sorted[0].date}T00:00:00Z`),
    last -
      ((timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 365) - 1) *
        86400000,
  );
  const byDate = new Map(sorted.map((r) => [r.date, r.consumption]));
  const points: ConsumptionDataPoint[] = [];
  for (let day = first; day <= last; day += 86400000) {
    const date = new Date(day).toISOString().slice(0, 10);
    points.push({
      timestamp: date,
      label: date,
      actual: byDate.get(date) ?? null,
      baseline: null,
      peerAverage: null,
    });
  }
  return points;
}
