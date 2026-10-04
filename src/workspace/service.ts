import { operationsAdapter } from "./adapter";
import { simulationApi } from "../services/simulation";
import { api } from "../services/api";
import type { Consumer, Workspace } from "./types";
export const operationsService = operationsAdapter;
export const simulationService = simulationApi;
export const scoreStoredHistory = (id: string) =>
  api.scoreHistory({
    consumers: [{ CONS_NO: id, stored: true }],
    include_explanations: true,
  });
export const risk = (c: Consumer) =>
  c.investigation?.inspection_priority === "High"
    ? "High"
    : c.investigation?.requires_review
      ? "Review"
      : c.investigation?.review_probability != null
        ? "Low"
        : "Not scored";

export { computeRiskScore } from "./scoring";


export const status = (c: Consumer) =>
  c.investigation?.requires_review
    ? "Anomaly detected"
    : c.backend_id
      ? "Monitoring"
      : "Baseline preview";
export const cause = (c: Consumer) =>
  c.investigation?.probable_cause ?? "No detection available";
export const latest = (c: Consumer) => c.investigation
  ? c.investigation.latest_daily_kwh
  : c.history.at(-1)?.consumption ?? null;
export function consumptionTrend(data: Workspace) {
  return data.consumers[0].history.map((p, i) => {
    const values = data.consumers.map((c) => c.history[i]?.consumption ?? null);
    return {
      date: p.date,
      consumption: values.every((v) => v !== null && v >= 0)
        ? values.reduce<number>((s, v) => s + (v ?? 0), 0)
        : null,
    };
  });
}
export function usageTrend(c: Consumer, data: Workspace) {
  const peers = data.consumers.filter(
    (p) => p.transformer === c.transformer && p.id !== c.id,
  );
  return c.history.map((p, i) => {
    const values = peers.map((peer) => peer.history[i]?.consumption ?? null);
    return {
      ...p,
      baseline: c.baseline,
      peer: values.every((v) => v !== null && v >= 0)
        ? values.reduce<number>((s, v) => s + (v ?? 0), 0) / values.length
        : null,
    };
  });
}
export function quality(data: Workspace) {
  const all = data.consumers.flatMap((c) => c.history);
  const missing = all.filter((p) => p.consumption === null).length;
  const invalid = all.filter(
    (p) => p.consumption !== null && p.consumption < 0,
  ).length;
  const duplicate = data.consumers.reduce(
    (sum, c) =>
      sum + c.history.length - new Set(c.history.map((p) => p.date)).size,
    0,
  );
  return {
    missing: (missing / all.length) * 100,
    invalid: (invalid / all.length) * 100,
    duplicate: (duplicate / all.length) * 100,
    score: ((all.length - missing - invalid) / all.length) * 100,
    trend: data.consumers[0].history.map((p, i) => ({
      date: p.date,
      missing:
        (data.consumers.filter((c) => c.history[i]?.consumption == null)
          .length /
          data.consumers.length) *
        100,
    })),
  };
}
