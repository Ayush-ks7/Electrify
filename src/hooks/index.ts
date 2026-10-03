import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardService,
  consumerService,
  anomalyService,
  alertService,
  analyticsService,
  dataQualityService,
  systemService,
  notificationService,
  searchService,
} from '../services';
import { AlertStatus } from '../types';

export const useDashboard = (timeframe: '24H' | '7D' | '30D' | '1Y' = '30D') => {
  const kpisQuery = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardService.getKPIs(),
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard', 'trend', timeframe],
    queryFn: () => dashboardService.getConsumptionTrend(timeframe),
  });

  const highRiskConsumersQuery = useQuery({
    queryKey: ['dashboard', 'highRisk'],
    queryFn: () => consumerService.getAll({ minRisk: 75 }),
  });

  const recentAlertsQuery = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => alertService.getAll(),
  });

  const topAnomaliesQuery = useQuery({
    queryKey: ['dashboard', 'anomalies'],
    queryFn: () => anomalyService.getAll(),
  });

  const pipelineModulesQuery = useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: () => systemService.getPipelineModules(),
  });

  return {
    kpis: kpisQuery.data,
    trend: trendQuery.data,
    highRiskConsumers: highRiskConsumersQuery.data,
    recentAlerts: recentAlertsQuery.data,
    topAnomalies: topAnomaliesQuery.data,
    pipelineModules: pipelineModulesQuery.data,
    isLoading:
      kpisQuery.isLoading ||
      trendQuery.isLoading ||
      highRiskConsumersQuery.isLoading,
    isError: kpisQuery.isError || trendQuery.isError,
    refetchAll: () => {
      kpisQuery.refetch();
      trendQuery.refetch();
      highRiskConsumersQuery.refetch();
      recentAlertsQuery.refetch();
      topAnomaliesQuery.refetch();
    },
  };
};

export const useConsumers = (params?: {
  search?: string;
  severity?: string;
  status?: string;
  cause?: string;
  minRisk?: number;
  maxRisk?: number;
}) => {
  return useQuery({
    queryKey: ['consumers', params],
    queryFn: () => consumerService.getAll(params),
  });
};

export const useConsumer = (id: string, timeframe: '24H' | '7D' | '30D' = '30D') => {
  const detailQuery = useQuery({
    queryKey: ['consumer', id],
    queryFn: () => consumerService.getById(id),
    enabled: Boolean(id),
  });

  const historyQuery = useQuery({
    queryKey: ['consumer', id, 'history', timeframe],
    queryFn: () => consumerService.getConsumptionHistory(id, timeframe),
    enabled: Boolean(id),
  });

  return {
    consumer: detailQuery.data,
    history: historyQuery.data,
    isLoading: detailQuery.isLoading || historyQuery.isLoading,
    isError: detailQuery.isError,
    refetch: () => {
      detailQuery.refetch();
      historyQuery.refetch();
    },
  };
};

export const useAnomalies = (params?: {
  search?: string;
  severity?: string;
  cause?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['anomalies', params],
    queryFn: () => anomalyService.getAll(params),
  });
};

export const useAnomaly = (id: string) => {
  return useQuery({
    queryKey: ['anomaly', id],
    queryFn: () => anomalyService.getById(id),
    enabled: Boolean(id),
  });
};

export const useAlerts = (params?: {
  search?: string;
  severity?: string;
  status?: string;
  cause?: string;
}) => {
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertService.getAll(params),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: AlertStatus; note?: string }) =>
      alertService.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignee }: { id: string; assignee: string }) =>
      alertService.assign(id, assignee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      alertService.addNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  return {
    alerts: alertsQuery.data,
    isLoading: alertsQuery.isLoading,
    updateStatus: (id: string, status: AlertStatus, note?: string) =>
      updateStatusMutation.mutateAsync({ id, status, note }),
    assign: (id: string, assignee: string) =>
      assignMutation.mutateAsync({ id, assignee }),
    addNote: (id: string, note: string) =>
      addNoteMutation.mutateAsync({ id, note }),
    refetch: alertsQuery.refetch,
  };
};

export const useCases = (params?: {
  search?: string;
  severity?: string;
  status?: string;
  cause?: string;
}) => {
  const result = useAlerts(params);
  return {
    ...result,
    cases: result.alerts,
  };
};


export const useAnalytics = (filters?: Record<string, string>) => {
  return useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => analyticsService.getSummary(),
  });
};

export const useDataQuality = () => {
  return useQuery({
    queryKey: ['data-quality'],
    queryFn: () => dataQualityService.getSummary(),
  });
};

export const useSystemMetrics = () => {
  const modulesQuery = useQuery({
    queryKey: ['system', 'modules'],
    queryFn: () => systemService.getPipelineModules(),
  });

  const metricsQuery = useQuery({
    queryKey: ['system', 'metrics'],
    queryFn: () => systemService.getModelMetrics(),
  });

  return {
    modules: modulesQuery.data,
    metrics: metricsQuery.data,
    isLoading: modulesQuery.isLoading || metricsQuery.isLoading,
    isError: modulesQuery.isError || metricsQuery.isError,
    refetch: () => {
      modulesQuery.refetch();
      metricsQuery.refetch();
    },
  };
};

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = query.data?.filter((n) => !n.isRead).length || 0;

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
  };
};

export const useGlobalSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchService.searchAll(query),
    enabled: Boolean(query && query.trim().length >= 2),
  });
};
