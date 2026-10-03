import {
  Consumer,
  AnomalyItem,
  AlertItem,
  DashboardKPIs,
  PipelineModuleStatus,
  ModelMetrics,
  DataQualitySummary,
  NotificationItem,
  GlobalSearchResult,
  ConsumptionDataPoint,
  AlertStatus,
} from '../types';
import {
  mockDashboardKPIs,
  mockConsumers,
  mockAnomalies,
  mockAlerts,
  mockPipelineModules,
  mockModelMetrics,
  mockDataQualitySummary,
  mockNotifications,
  mockAnalyticsData,
  generateConsumerHistory,
  generate24HourProfile,
} from '../mocks';

// Local storage keys for persisting interactive updates during demo
const ALERTS_STORAGE_KEY = 'electrify_alerts_data_v1';
const NOTIFICATIONS_STORAGE_KEY = 'electrify_notifs_data_v1';

const getStoredAlerts = (): AlertItem[] => {
  try {
    const data = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  return [...mockAlerts];
};

const saveStoredAlerts = (alerts: AlertItem[]) => {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
};

const getStoredNotifications = (): NotificationItem[] => {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  return [...mockNotifications];
};

const saveStoredNotifications = (notifs: NotificationItem[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
  } catch {
    // ignore
  }
};

// Simulated network delay helper to emulate real API
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const dashboardService = {
  getKPIs: async (): Promise<DashboardKPIs> => {
    await delay();
    return { ...mockDashboardKPIs };
  },
  getConsumptionTrend: async (timeframe: '24H' | '7D' | '30D' | '1Y'): Promise<ConsumptionDataPoint[]> => {
    await delay();
    if (timeframe === '24H') {
      return generate24HourProfile('CONS-7821');
    }
    const full = generateConsumerHistory('CONS-7821');
    if (timeframe === '7D') {
      return full.slice(-7);
    }
    if (timeframe === '30D') {
      return full;
    }
    // 1Y aggregated 12 monthly points
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    return months.map((m, idx) => ({
      timestamp: `2025-${idx + 1}`,
      label: m,
      actual: Math.round(7200 + Math.sin(idx) * 1100 + (idx >= 10 ? -2200 : 0)),
      baseline: Math.round(7400 + Math.sin(idx) * 900),
      peerAverage: Math.round(7300 + Math.cos(idx) * 800),
      isAnomaly: idx >= 10,
    }));
  },
};

export const consumerService = {
  getAll: async (params?: {
    search?: string;
    severity?: string;
    status?: string;
    cause?: string;
    minRisk?: number;
    maxRisk?: number;
  }): Promise<Consumer[]> => {
    await delay();
    let result = [...mockConsumers];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.meterId.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.feeder.toLowerCase().includes(q) ||
          c.substation.toLowerCase().includes(q)
      );
    }
    if (params?.severity && params.severity !== 'all') {
      result = result.filter((c) => c.risk.severity === params.severity);
    }
    if (params?.status && params.status !== 'all') {
      result = result.filter((c) => c.status === params.status);
    }
    if (params?.cause && params.cause !== 'all') {
      result = result.filter((c) => c.classification.cause === params.cause);
    }
    if (params?.minRisk !== undefined) {
      result = result.filter((c) => c.risk.score >= params.minRisk!);
    }
    if (params?.maxRisk !== undefined) {
      result = result.filter((c) => c.risk.score <= params.maxRisk!);
    }

    return result;
  },

  getById: async (id: string): Promise<Consumer | null> => {
    await delay();
    const found = mockConsumers.find((c) => c.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found } : null;
  },

  getConsumptionHistory: async (
    id: string,
    timeframe: '24H' | '7D' | '30D'
  ): Promise<ConsumptionDataPoint[]> => {
    await delay();
    if (timeframe === '24H') {
      return generate24HourProfile(id);
    }
    const full = generateConsumerHistory(id);
    if (timeframe === '7D') {
      return full.slice(-7);
    }
    return full;
  },
};

export const anomalyService = {
  getAll: async (params?: {
    search?: string;
    severity?: string;
    cause?: string;
    status?: string;
  }): Promise<AnomalyItem[]> => {
    await delay();
    let result = [...mockAnomalies];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.consumerId.toLowerCase().includes(q) ||
          a.meterId.toLowerCase().includes(q) ||
          a.consumerName.toLowerCase().includes(q)
      );
    }
    if (params?.severity && params.severity !== 'all') {
      result = result.filter((a) => a.severity === params.severity);
    }
    if (params?.cause && params.cause !== 'all') {
      result = result.filter((a) => a.likelyCause === params.cause);
    }
    if (params?.status && params.status !== 'all') {
      result = result.filter((a) => a.status === params.status);
    }

    return result;
  },

  getById: async (id: string): Promise<AnomalyItem | null> => {
    await delay();
    const found = mockAnomalies.find((a) => a.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found } : null;
  },
};

export const alertService = {
  getAll: async (params?: {
    search?: string;
    severity?: string;
    status?: string;
    cause?: string;
  }): Promise<AlertItem[]> => {
    await delay();
    let result = getStoredAlerts();

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (al) =>
          al.id.toLowerCase().includes(q) ||
          al.consumerId.toLowerCase().includes(q) ||
          al.meterId.toLowerCase().includes(q) ||
          al.consumerName.toLowerCase().includes(q) ||
          al.assignee.toLowerCase().includes(q)
      );
    }
    if (params?.severity && params.severity !== 'all') {
      result = result.filter((al) => al.severity === params.severity);
    }
    if (params?.status && params.status !== 'all') {
      result = result.filter((al) => al.status === params.status);
    }
    if (params?.cause && params.cause !== 'all') {
      result = result.filter((al) => al.cause === params.cause);
    }

    return result;
  },

  getById: async (id: string): Promise<AlertItem | null> => {
    await delay();
    const alerts = getStoredAlerts();
    const found = alerts.find((al) => al.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found } : null;
  },

  updateStatus: async (id: string, status: AlertStatus, note?: string): Promise<AlertItem> => {
    await delay();
    const alerts = getStoredAlerts();
    const idx = alerts.findIndex((al) => al.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) {
      throw new Error(`Alert with id ${id} not found`);
    }

    const updated = { ...alerts[idx], status };
    const timelineEntry = {
      id: `TL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: 'Ayush Sharma (Lead Analyst)',
      role: 'Grid Lead Analyst',
      action: `Status Changed to ${status}`,
      note: note || `Case status shifted to ${status} via operations console.`,
      type: 'status_change' as const,
    };
    updated.timeline = [timelineEntry, ...updated.timeline];
    if (note) {
      updated.notes = [note, ...updated.notes];
    }

    alerts[idx] = updated;
    saveStoredAlerts(alerts);
    return updated;
  },

  assign: async (id: string, assignee: string): Promise<AlertItem> => {
    await delay();
    const alerts = getStoredAlerts();
    const idx = alerts.findIndex((al) => al.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) {
      throw new Error(`Alert with id ${id} not found`);
    }

    const updated = { ...alerts[idx], assignee };
    const timelineEntry = {
      id: `TL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: 'Ayush Sharma (Lead Analyst)',
      role: 'Grid Lead Analyst',
      action: `Assigned to ${assignee}`,
      note: `Investigation lead transferred to ${assignee}.`,
      type: 'assignment' as const,
    };
    updated.timeline = [timelineEntry, ...updated.timeline];

    alerts[idx] = updated;
    saveStoredAlerts(alerts);
    return updated;
  },

  addNote: async (id: string, note: string): Promise<AlertItem> => {
    await delay();
    const alerts = getStoredAlerts();
    const idx = alerts.findIndex((al) => al.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) {
      throw new Error(`Alert with id ${id} not found`);
    }

    const updated = { ...alerts[idx] };
    updated.notes = [note, ...updated.notes];
    const timelineEntry = {
      id: `TL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: 'Ayush Sharma (Lead Analyst)',
      role: 'Grid Lead Analyst',
      action: 'Investigation Note Added',
      note,
      type: 'note' as const,
    };
    updated.timeline = [timelineEntry, ...updated.timeline];

    alerts[idx] = updated;
    saveStoredAlerts(alerts);
    return updated;
  },
};

export const analyticsService = {
  getSummary: async () => {
    await delay();
    return { ...mockAnalyticsData };
  },
};

export const dataQualityService = {
  getSummary: async (): Promise<DataQualitySummary> => {
    await delay();
    return { ...mockDataQualitySummary };
  },
};

export const systemService = {
  getPipelineModules: async (): Promise<PipelineModuleStatus[]> => {
    await delay();
    return [...mockPipelineModules];
  },
  getModelMetrics: async (): Promise<ModelMetrics> => {
    await delay();
    return { ...mockModelMetrics };
  },
};

export const notificationService = {
  getAll: async (): Promise<NotificationItem[]> => {
    await delay();
    return getStoredNotifications();
  },
  markAsRead: async (id: string): Promise<NotificationItem[]> => {
    const list = getStoredNotifications().map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    saveStoredNotifications(list);
    return list;
  },
  markAllAsRead: async (): Promise<NotificationItem[]> => {
    const list = getStoredNotifications().map((n) => ({ ...n, isRead: true }));
    saveStoredNotifications(list);
    return list;
  },
};

export const searchService = {
  searchAll: async (query: string): Promise<GlobalSearchResult[]> => {
    if (!query || query.trim().length < 2) return [];
    await delay(60);
    const q = query.toLowerCase().trim();
    const results: GlobalSearchResult[] = [];

    // Search Consumers
    mockConsumers.forEach((c) => {
      if (
        c.id.toLowerCase().includes(q) ||
        c.meterId.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
      ) {
        results.push({
          id: c.id,
          title: `${c.id} - ${c.name}`,
          subtitle: `Meter: ${c.meterId} | ${c.tariffType} | ${c.feeder}`,
          category: 'consumer',
          url: `/consumers/${c.id}`,
          severity: c.risk.severity,
          badge: `Risk ${c.risk.score}`,
        });
      }
    });

    // Search Anomalies
    mockAnomalies.forEach((a) => {
      if (
        a.id.toLowerCase().includes(q) ||
        a.consumerId.toLowerCase().includes(q) ||
        a.meterId.toLowerCase().includes(q)
      ) {
        results.push({
          id: a.id,
          title: `${a.id} (${a.likelyCause})`,
          subtitle: `Consumer: ${a.consumerId} | ${a.evidenceSummary}`,
          category: 'anomaly',
          url: `/anomalies/${a.id}`,
          severity: a.severity,
          badge: `${(a.anomalyScore * 100).toFixed(0)}% score`,
        });
      }
    });

    // Search Cases / Alerts
    getStoredAlerts().forEach((al) => {
      if (
        al.id.toLowerCase().includes(q) ||
        al.consumerId.toLowerCase().includes(q) ||
        al.meterId.toLowerCase().includes(q) ||
        'case'.includes(q)
      ) {
        results.push({
          id: al.id,
          title: `Case #${al.id} - ${al.status}`,
          subtitle: `${al.consumerName} | ${al.cause} | Assignee: ${al.assignee}`,
          category: 'case',
          url: `/cases?id=${al.id}`,
          severity: al.severity,
          badge: al.status,
        });
      }
    });

    return results.slice(0, 10);
  },
};

export const caseService = alertService;

