import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import type { AnalyticsError, AnalyticsPresetDays, HeatmapDto, WorkspaceAnalyticsSummaryDto, ZernioDailyMetricsDto } from '../api/analytics';
import { AxiosError } from 'axios';

interface UseAnalyticsSummaryArgs {
  workspaceId?: string;
}

const PRESET_OPTIONS = [
  { label: 'Last 7 days', days: 7 as const },
  { label: 'Last 30 days', days: 30 as const },
  { label: 'Last 90 days', days: 90 as const },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatRangeLabel = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const startText = `${MONTH_NAMES[start.getMonth()]} ${String(start.getDate()).padStart(2, '0')}`;
  const endText = `${MONTH_NAMES[end.getMonth()]} ${String(end.getDate()).padStart(2, '0')}`;

  return `${startText} – ${endText}, ${end.getFullYear()}`;
};

/** Extract a structured AnalyticsError from an Axios error response. */
function toAnalyticsError(error: unknown): AnalyticsError | null {
  if (!(error instanceof AxiosError) || !error.response) return null;
  const data = error.response.data as Record<string, unknown> | undefined;
  return {
    code: (data?.code as string) ?? 'unknown',
    message: (data?.message as string) ?? error.message,
    reason: data?.reason as string | undefined,
    platform: data?.platform as string | undefined,
    reauthorizeUrl: data?.reauthorizeUrl as string | undefined,
    dashboardUrl: data?.dashboardUrl as string | undefined,
    status: error.response.status,
  };
}

export function useAnalyticsSummary({ workspaceId }: UseAnalyticsSummaryArgs) {
  const [presetDays, setPresetDays] = useState<AnalyticsPresetDays>(30);
  const [heatmapPlatform, setHeatmapPlatform] = useState<string | undefined>(undefined);

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', workspaceId, presetDays],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<WorkspaceAnalyticsSummaryDto | null> => {
      if (!workspaceId) return null;
      return analyticsApi.getWorkspaceSummary(workspaceId, presetDays);
    },
  });

  const heatmapQuery = useQuery({
    queryKey: ['analytics-heatmap', workspaceId, presetDays, heatmapPlatform],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<HeatmapDto | null> => {
      if (!workspaceId) return null;
      return analyticsApi.getWorkspaceHeatmap(workspaceId, presetDays, heatmapPlatform);
    },
  });

  const dailyMetricsQuery = useQuery({
    queryKey: ['analytics-daily-metrics', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<ZernioDailyMetricsDto | null> => {
      if (!workspaceId) return null;
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 365)
      return analyticsApi.getDailyMetrics(fromDate.toISOString().split('T')[0]);
    },
    staleTime: 300_000,
  });

  // Structured error info
  const analyticsError: AnalyticsError | null = useMemo(() => {
    return toAnalyticsError(summaryQuery.error) ?? toAnalyticsError(heatmapQuery.error) ?? null;
  }, [summaryQuery.error, heatmapQuery.error]);

  const selectedPresetLabel = useMemo(
    () => PRESET_OPTIONS.find((option) => option.days === presetDays)?.label ?? 'Last 30 days',
    [presetDays]
  );

  const refresh = useCallback(() => {
    summaryQuery.refetch();
    heatmapQuery.refetch();
    dailyMetricsQuery.refetch();
  }, [summaryQuery.refetch, heatmapQuery.refetch, dailyMetricsQuery.refetch]);

  const isBillingGateError = analyticsError?.status === 402
    || (analyticsError?.status === 403 && analyticsError?.code === 'analytics_addon_required');

  const isScopeError = analyticsError?.status === 412;

  return {
    presetDays,
    setPresetDays,
    presetOptions: PRESET_OPTIONS,
    selectedPresetLabel,
    rangeLabel: formatRangeLabel(presetDays),
    heatmapPlatform,
    setHeatmapPlatform,
    summary: summaryQuery.data,
    heatmap: heatmapQuery.data,
    dailyMetrics: dailyMetricsQuery.data,
    isLoading: summaryQuery.isLoading || heatmapQuery.isLoading,
    isFetching: summaryQuery.isFetching || heatmapQuery.isFetching || dailyMetricsQuery.isFetching,
    isError: summaryQuery.isError || heatmapQuery.isError,
    analyticsError,
    isBillingGateError,
    isScopeError,
    refresh,
  };
}
