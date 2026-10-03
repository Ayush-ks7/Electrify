export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type AlertStatus =
  | 'Detected'
  | 'Open'
  | 'Under Review'
  | 'Resolved'
  | 'False Positive'
  | 'Confirmed';

export type LikelyCause =
  | 'Suspected Theft'
  | 'Meter Fault'
  | 'Communication Issue'
  | 'Legitimate Behaviour'
  | 'Unknown';

export type ConsumerStatus =
  | 'Active'
  | 'Under Investigation'
  | 'Flagged'
  | 'Cleared';

export type TariffType =
  | 'Residential'
  | 'Commercial'
  | 'Industrial'
  | 'Agricultural';

export interface EvidenceItem {
  id: string;
  type: 'drop' | 'night_surge' | 'peer_divergence' | 'persistence' | 'model_outlier' | 'tamper';
  label: string;
  value: string | number;
  unit?: string;
  severity: Severity;
  explanation: string;
}

export interface ModelSignal {
  id: string;
  name: string;
  signalType: 'statistical' | 'isolation_forest' | 'temporal' | 'classification';
  status: 'normal' | 'warning' | 'critical';
  score: number;
  threshold: number;
  description: string;
}

export interface ConsumptionDataPoint {
  timestamp: string;
  label: string;
  actual: number | null;
  baseline: number | null;
  peerAverage: number | null;
  isAnomaly?: boolean;
}

export interface ConsumerMetrics {
  avgDaily: number;
  peakUsage: number;
  nightUsage: number;
  weekendUsage: number;
  typicalHours: string;
  baselineDeviationPct: number;
  peerDeviationPct: number;
  peerPercentile: number;
}

export interface Consumer {
  id: string;
  meterId: string;
  name: string;
  tariffType: TariffType;
  address: string;
  substation: string;
  feeder: string;
  status: ConsumerStatus;
  consumption: {
    current: number;
    baseline: number;
    peerAverage: number;
    unit: string;
  };
  metrics: ConsumerMetrics;
  risk: {
    score: number; // 0-100
    severity: Severity;
  };
  anomaly: {
    detected: boolean;
    score: number; // 0.0 - 1.0
    detectedAt: string;
    durationDays: number;
  };
  classification: {
    cause: LikelyCause;
    confidence: number; // 0-100
    alternativeProbabilities: Array<{
      cause: LikelyCause;
      probability: number;
    }>;
  };
  signals: ModelSignal[];
  evidence: EvidenceItem[];
  relatedAlertId?: string;
  updatedAt: string;
}

export interface AnomalyItem {
  id: string;
  consumerId: string;
  meterId: string;
  consumerName: string;
  substation: string;
  tariffType: TariffType;
  riskScore: number;
  likelyCause: LikelyCause;
  anomalyScore: number;
  confidence: number;
  severity: Severity;
  detectedAt: string;
  status: 'Unresolved' | 'Investigating' | 'Confirmed' | 'Dismissed';
  evidenceSummary: string;
  durationDays: number;
  actualVsBaselinePct: number;
  relatedAlertId?: string;
}

export interface CaseTimelineItem {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  action: string;
  note?: string;
  type: 'system' | 'status_change' | 'note' | 'assignment';
}

export interface AlertItem {
  id: string;
  consumerId: string;
  meterId: string;
  consumerName: string;
  severity: Severity;
  cause: LikelyCause;
  riskScore: number;
  createdAt: string;
  assignee: string;
  status: AlertStatus;
  notes: string[];
  timeline: CaseTimelineItem[];
  anomalyId: string;
  evidence: EvidenceItem[];
}

export interface DashboardKPIs {
  totalConsumers: number;
  totalConsumersChangePct: number;
  totalAnomalies: number;
  totalAnomaliesChangePct: number;
  highRiskConsumers: number;
  highRiskChangePct: number;
  avgRiskScore: number;
  avgRiskScoreChangePct: number;
  criticalAlerts: number;
  criticalAlertsChangePct: number;
  dataQualityPct: number;
  dataQualityChangePct: number;
}

export interface PipelineModuleStatus {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Inactive' | 'Training' | 'Warning';
  lastRun: string;
  latencyMs: number;
  processedRecords: number;
  throughputRate: string;
  description: string;
}

export interface ModelMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  falsePositiveRate: number;
  lastTrained: string;
  validationDatasetSize: number;
}

export type CaseStatus = AlertStatus;
export type CaseItem = AlertItem;

export interface AnalyticsSummary {
  riskDistribution: Array<{ name: string; count: number; color: string }>;
  riskScoreTrend: Array<{ period: string; avgScore: number; highRiskCount: number }>;
  causeDistribution: Array<{ name: string; count: number; percentage: number; color: string }>;
  severityDistribution: Array<{ name: string; value: number; color: string }>;
  anomaliesOverTime: Array<{ date: string; count: number; theft: number; fault: number; comm: number }>;
  hourlyHeatmap: Array<{ hour: string; avgKwh: number; anomalyRatePct: number }>;
  dailyPatterns: Array<{ day: string; actual: number; baseline: number }>;
  confidenceDistribution: Array<{ range: string; count: number }>;
  segmentLosses: Array<{ segment: string; losses: number; verifiedTheft: number }>;
  resolutionStats: {
    totalCases: number;
    confirmedRate: number;
    falsePositiveRate: number;
    avgResolutionTimeHours: number;
    revenueRecoveredEstimate: string;
  };
}

export interface QualityIssueItem {
  id: string;
  meterId: string;
  substation: string;
  issue: 'Missing Values' | 'Duplicates' | 'Invalid Measurements' | 'Time Gaps' | 'Outliers';
  count: number;
  lastOccurrence: string;
  severity: Severity;
  resolutionStatus: 'Pending' | 'Auto-Imputed' | 'Requires Field Visit';
}

export interface DataQualitySummary {
  recordsProcessed: number;
  validPct: number;
  missingPct: number;
  invalidPct: number;
  duplicatesPct: number;
  qualityScore: number;
  issues: QualityIssueItem[];
  issueTypeDistribution: Array<{ name: string; count: number; color: string }>;
  topMetersMissing: Array<{ meterId: string; gaps: number; location: string }>;
  trend: Array<{
    date: string;
    qualityScore: number;
    missingCount: number;
    duplicateCount: number;
  }>;
}

export interface NotificationItem {
  id: string;
  title: string;
  consumerId?: string;
  meterId?: string;
  timestamp: string;
  severity: Severity;
  message: string;
  actionUrl: string;
  actionText: string;
  isRead: boolean;
}

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'consumer' | 'meter' | 'alert' | 'anomaly' | 'case';
  url: string;
  severity?: Severity;
  badge?: string;
}

