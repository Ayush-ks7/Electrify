import type { Investigation } from "../types/simulation";
export interface Point {
  date: string;
  consumption: number | null;
}
export interface Consumer {
  id: string;
  meter: string;
  transformer: string;
  backend_id: string | null;
  source: string;
  history: Point[];
  baseline: number;
  investigation: Investigation | null;
}
export interface BalancePoint {
  date: string;
  input: number;
  consumer: number | null;
  residual: number | null;
  percent: number | null;
}
export interface Transformer extends Omit<BalancePoint, "date"> {
  id: string;
  consumers: string[];
  status: string;
  trend: BalancePoint[];
}
export interface Anomaly {
  id: string;
  consumer: string;
  detected_at: string;
  case_id: string | null;
  evidence: Investigation;
}
export type CaseStatus =
  "Open" | "Under Review" | "Confirmed" | "False Positive" | "Resolved";
export interface Case {
  id: string;
  anomaly_id: string;
  status: CaseStatus;
  created_at: string;
  events: { at: string; message: string; note?: string }[];
}
export interface Workspace {
  range: { start: string; end: string; days: number };
  consumers: Consumer[];
  transformers: Transformer[];
  anomalies: Anomaly[];
  cases: Case[];
  input_source: string;
}
