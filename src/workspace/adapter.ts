import { request } from "../services/api";
import type { Case, CaseStatus, Workspace } from "./types";
const post = <T>(path: string, body: unknown) =>
  request<T>(`/api/v1/operations${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
export const operationsAdapter = {
  snapshot: (days: number, signal?: AbortSignal) =>
    request<Workspace>(`/api/v1/operations?days=${days}`, { signal }),
  createCase: (anomaly_id: string) => post<Case>("/cases", { anomaly_id }),
  status: (id: string, status: CaseStatus) =>
    post<Case>(`/cases/${encodeURIComponent(id)}/status`, { status }),
  note: (id: string, note: string) =>
    post<Case>(`/cases/${encodeURIComponent(id)}/notes`, { note }),
};
