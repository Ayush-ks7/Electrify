// Transport types follow backend/app/schemas; no model features are calculated here.
export interface ConsumerRecord {
  consumer_id: string;
  created_at: string;
}
export interface ConsumerList {
  consumers: ConsumerRecord[];
  total: number;
  limit: number;
  offset: number;
}
export interface Reading {
  date: string;
  consumption: number | null;
}
export interface HistoryResponse {
  consumer_id: string;
  readings: Reading[];
  total: number;
  limit: number;
  offset: number;
}
export interface Signal {
  feature: string;
  value: number | null;
  reference_value: number;
  probability_sensitivity: number;
  direction: 'increases_risk' | 'decreases_risk' | 'neutral';
  description: string;
}
export interface ScoreResult {
  CONS_NO: string;
  predicted_probability: number;
  screening_threshold: number;
  screening_flag: boolean;
  status: 'screen_for_review' | 'below_screening_threshold';
  data_quality: {
    observed_days: number | null;
    missing_days: number | null;
    missing_ratio: number | null;
  };
  explanation: { method: string; top_signals: Signal[]; note: string } | null;
}
export interface ScoreResponse {
  model_version: string;
  scope: string;
  results: ScoreResult[];
  disclaimer: string;
  history_warnings: string[];
}
export interface RiskResponse {
  prediction_id: number;
  consumer_id: string;
  created_at: string;
  source: 'features' | 'history' | 'stored_history';
  period_start: string | null;
  period_end: string | null;
  score: ScoreResponse;
}
export interface Health {
  status: 'ok' | 'degraded';
  database: 'ok' | 'unavailable';
  model: 'ok' | 'unavailable';
  feature_count: number;
}
export interface ModelInfo {
  model_version: string;
  model_family: string;
  probability_calibration: string;
  feature_count: number;
  required_features: string[];
  default_threshold: number;
  scope: string;
  warning: string;
}
export interface ScoreOptions {
  threshold?: number;
  include_explanations?: boolean;
  explanation_top_k?: number;
}
export interface FeatureScoreRequest extends ScoreOptions {
  consumers: { CONS_NO: string; features: Record<string, number | null> }[];
}
export interface HistoryScoreRequest extends ScoreOptions {
  consumers: ({
    CONS_NO: string;
    period_start?: string;
    period_end?: string;
  } & ({ stored: true } | { readings: Reading[] }))[];
}
export interface LiveConsumer {
  id: string;
  createdAt: string;
}
export interface ConsumerSummary extends LiveConsumer {
  risk: RiskResponse | null;
  riskError?: string;
}
