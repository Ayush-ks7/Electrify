export interface ConsumptionDataPoint {
  timestamp: string;
  label: string;
  actual: number | null;
  baseline: number | null;
  peerAverage: number | null;
}
