import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import type {
  AnalyticsError,
  AnalyticsPresetDays,
  ZernioDailyMetricsDto,
  ZernioDailyDataPointDto,
  ZernioPlatformBreakdownDto
} from '../api/analytics';
import { AxiosError } from 'axios';
import { useWorkspace } from '../context/WorkspaceContext';

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



function aggregateDailyMetrics(metrics: ZernioDailyMetricsDto[]): ZernioDailyMetricsDto {
  const dailyDataMap: Record<string, ZernioDailyDataPointDto> = {};
  metrics.forEach((m) => {
    (m.dailyData || []).forEach((d) => {
      if (!dailyDataMap[d.date]) {
        dailyDataMap[d.date] = { ...d };
      } else {
        const existing = dailyDataMap[d.date];
        existing.postCount += d.postCount;
        existing.impressions += d.impressions;
        existing.reach += d.reach;
        existing.likes += d.likes;
        existing.comments += d.comments;
        existing.shares += d.shares;
        existing.saves += d.saves;
        existing.clicks += d.clicks;
        existing.views += d.views;
      }
    });
  });
  const dailyData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

  const platformBreakdownMap: Record<string, ZernioPlatformBreakdownDto> = {};
  metrics.forEach((m) => {
    (m.platformBreakdown || []).forEach((p) => {
      if (!platformBreakdownMap[p.platform]) {
        platformBreakdownMap[p.platform] = { ...p };
      } else {
        const existing = platformBreakdownMap[p.platform];
        existing.postCount += p.postCount;
        existing.impressions += p.impressions;
        existing.reach += p.reach;
        existing.likes += p.likes;
        existing.comments += p.comments;
        existing.shares += p.shares;
        existing.saves += p.saves;
        existing.clicks += p.clicks;
        existing.views += p.views;
      }
    });
  });
  const platformBreakdown = Object.values(platformBreakdownMap);

  return { dailyData, platformBreakdown };
}

export function useAnalyticsSummary({ workspaceId }: UseAnalyticsSummaryArgs) {
  const { workspaces } = useWorkspace();
  const [presetDays, setPresetDays] = useState<AnalyticsPresetDays>(30);
  const [heatmapPlatform, setHeatmapPlatform] = useState<string | undefined>(undefined);

  const targetIds = useMemo(() => {
    if (!workspaceId) return [];
    if (workspaceId === 'all') return workspaces.map((w) => w.id);
    return [workspaceId];
  }, [workspaceId, workspaces]);

  const dailyMetricsQueries = useQueries({
    queries: targetIds.map((id) => ({
      queryKey: ['analytics-daily-metrics', id],
      enabled: Boolean(id),
      queryFn: async () => {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 365);
        return analyticsApi.getDailyMetrics({
          accountId: undefined, // Add correct params based on what is needed
          fromDate: fromDate.toISOString().split('T')[0]
        }); // Pass properly adjusted params object
      },
      staleTime: 300_000,
    })),
  });

  // Structured error info
  const analyticsError: AnalyticsError | null = useMemo(() => {
    const errors = [
      ...dailyMetricsQueries.map((q) => q.error),
    ].filter(Boolean);
    return errors.length > 0 ? toAnalyticsError(errors[0]) : null;
  }, [dailyMetricsQueries]);

  const selectedPresetLabel = useMemo(
    () => PRESET_OPTIONS.find((option) => option.days === presetDays)?.label ?? 'Last 30 days',
    [presetDays]
  );

  const refresh = useCallback(() => {
    dailyMetricsQueries.forEach((q) => q.refetch());
  }, [dailyMetricsQueries]);

  const isBillingGateError = analyticsError?.status === 402
    || (analyticsError?.status === 403 && analyticsError?.code === 'analytics_addon_required');

  const isScopeError = analyticsError?.status === 412;

  const dailyMetrics = useMemo(() => {
    const data = dailyMetricsQueries.map((q) => q.data).filter(Boolean) as ZernioDailyMetricsDto[];
    if (data.length === 0) return null;
    if (workspaceId !== 'all') return data[0];
    return aggregateDailyMetrics(data);
  }, [dailyMetricsQueries, workspaceId]);

  return {
    presetDays,
    setPresetDays,
    presetOptions: PRESET_OPTIONS,
    selectedPresetLabel,
    rangeLabel: formatRangeLabel(presetDays),
    heatmapPlatform,
    setHeatmapPlatform,
    dailyMetrics,
    isLoading: dailyMetricsQueries.some((q) => q.isLoading),
    isFetching: dailyMetricsQueries.some((q) => q.isFetching),
    isError: dailyMetricsQueries.some((q) => q.isError),
    analyticsError,
    isBillingGateError,
    isScopeError,
    refresh,
  };
}
