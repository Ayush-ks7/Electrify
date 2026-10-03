import type { ScoreResponse } from './api';

export type Scenario = 'normal' | 'tampering' | 'meter_fault' | 'communication_failure' | 'legitimate_abnormal';
export type Speed = 'realistic' | 'fast' | 'very_fast';
export type CaseStatus = 'Requires Review' | 'Under Investigation' | 'Dismissed' | 'Resolved';
export const scenarios: { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'tampering', label: 'Theft / Tampering' },
  { value: 'meter_fault', label: 'Meter Malfunction' },
  { value: 'communication_failure', label: 'Communication Failure' },
  { value: 'legitimate_abnormal', label: 'Legitimate Abnormal Consumption' },
];
export const caseStatuses: CaseStatus[] = ['Requires Review', 'Under Investigation', 'Dismissed', 'Resolved'];
export interface SimulationStream {
  consumer_id: string; source_consumer_id: string; scenario: Scenario;
  state: 'running' | 'paused' | 'stopped'; speed: Speed; cursor: string;
  generated_readings: number; completed_days: number; score_state: string;
  last_error: string | null;
}
export interface SimulationState {
  streams: SimulationStream[]; demo_consumers: string[];
  minimum_observed_days: number; score_every_completed_days: number; max_simulated_days: number;
}
export interface MeterReading {
  id: number; consumer_id: string; timestamp: string; received_at: string;
  voltage_v: number | null; current_a: number | null; power_kw: number | null;
  energy_kwh: number | null; interval_minutes: number;
  meter_status: string; communication_status: string; load_context: string | null;
  simulated: boolean;
}
export interface Investigation {
  consumer_id: string; simulated: boolean; source_consumer_id: string | null;
  provenance: string | null; scenario: Scenario | null; stream_state: string | null;
  simulation_time: string | null; baseline_kwh: number | null;
  latest_daily_kwh: number | null; latest_daily_date: string | null; deviation_pct: number | null;
  latest_reading: MeterReading | null; risk_level: string; review_probability: number | null;
  anomaly_score: number | null; cause_confidence: number | null;
  probable_cause: string; cause_evidence_confidence: string; recommended_action: string;
  inspection_priority: string; priority_basis: string; requires_review: boolean;
  case_status: CaseStatus | null; detection_start: string | null; detection_end: string | null;
  evidence: string[]; score_state: string | null; last_error: string | null;
  prediction: { created_at: string; period_start: string | null; period_end: string | null; score: ScoreResponse } | null;
}
