import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import type {
  AnalyticsError,
  AnalyticsPresetDays,
  BestTimeDto,
  ZernioContentDecayResponseDto,
  ZernioFollowerStatsResponseDto,
  ZernioPostingFrequencyResponseDto,
} from '../api/analytics';
import { AxiosError } from 'axios';

interface UseAnalyticsSummaryArgs {
  workspaceId?: string;
  /** Platform filter (e.g. 'facebook'). undefined / 'all' = all platforms. */
  platform?: string;
  /** Zernio profile ID to scope analytics to a specific profile. */
  profileId?: string | null;
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

/**
 * Compute the YYYY-MM-DD string for "today minus N days" using the local
 * calendar. Used as the `fromDate` query param for daily-metrics, analytics
 * (top-posts), and follower-stats.
 */
const computeFromDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  // Use local calendar date to avoid UTC offset shifting the day
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

/**
 * Convert a workspace-id prop into the value `analyticsApi` expects.
 * - 'all' → null (sends X-Workspace-Id: '' to override default)
 * - string → that workspace id
 * - undefined → undefined (axios interceptor fills from localStorage)
 */
const resolveWorkspaceId = (workspaceId?: string): string | null | undefined => {
  if (workspaceId === 'all') return null;
  if (workspaceId) return workspaceId;
  return undefined;
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

/**
 * Disable React Query auto-refetches that would re-issue any of the 6
 * contract endpoints without user interaction. The QueryClient global
 * already disables `refetchOnWindowFocus`, but we set it explicitly per-query
 * for defense-in-depth.
 */
const noAutoRefetch = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function useAnalyticsSummary({ workspaceId, platform, profileId }: UseAnalyticsSummaryArgs) {
  const [presetDays, setPresetDays] = useState<AnalyticsPresetDays>(30);
  const [heatmapPlatform, setHeatmapPlatform] = useState<string | undefined>(undefined);

  const wsId = resolveWorkspaceId(workspaceId);
  // Normalise 'all' → undefined so API receives no platform param
  const platformParam = (!platform || platform === 'all') ? undefined : platform;
  const fromDate = useMemo(() => computeFromDate(presetDays), [presetDays]);

  // Resolve profileId: 'all' → null (don't filter by profile)
  const resolvedProfileId = profileId === 'all' ? undefined : (profileId || undefined);

  const dailyMetricsQuery = useQuery({
    queryKey: ['analytics-daily-metrics', workspaceId ?? 'none', presetDays, platformParam ?? 'all', resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
    ...noAutoRefetch,
    queryFn: () => {
      return analyticsApi.getDailyMetrics({ fromDate, platform: platformParam, profileId: resolvedProfileId }, wsId)
    }
  });

  const topPostsQuery = useQuery({
    queryKey: ['analytics-top-posts', workspaceId ?? 'none', presetDays, platformParam ?? 'all', resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: async () => {
      const list = await analyticsApi.getAnalyticsList(wsId, {
        sortBy: 'engagement',
        order: 'desc',
        limit: 10,
        fromDate,
        platform: platformParam,
        profileId: resolvedProfileId,
      });
      return list.posts ?? [];
    },
  });

  /**
   * Fetch a broader post list (limit 100, the backend max) to aggregate Metric Summary totals.
   * Uses the same getAnalyticsList endpoint so the summed
   * likes/comments/shares/saves/views/impressions/reach/clicks are representative.
   */
  const analyticsListSummaryQuery = useQuery({
    queryKey: ['analytics-list-summary', workspaceId ?? 'none', presetDays, platformParam ?? 'all', resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
    ...noAutoRefetch,
    queryFn: async () => {
      const list = await analyticsApi.getAnalyticsList(wsId, {
        sortBy: 'engagement',
        order: 'desc',
        limit: 100,
        fromDate,
        platform: platformParam,
        profileId: resolvedProfileId,
      });
      const posts = list.posts ?? [];
      const totals = posts.reduce(
        (acc, p) => {
          const a = p.analytics;
          if (!a) return acc;
          return {
            likes: acc.likes + (a.likes ?? 0),
            comments: acc.comments + (a.comments ?? 0),
            shares: acc.shares + (a.shares ?? 0),
            saves: acc.saves + (a.saves ?? 0),
            views: acc.views + (a.views ?? 0),
            impressions: acc.impressions + (a.impressions ?? 0),
            reach: acc.reach + (a.reach ?? 0),
            clicks: acc.clicks + (a.clicks ?? 0),
            posts: acc.posts + 1,
          };
        },
        { likes: 0, comments: 0, shares: 0, saves: 0, views: 0, impressions: 0, reach: 0, clicks: 0, posts: 0 }
      );
      return { totals, posts };
    },
  });

  const bestTimeQuery = useQuery({
    queryKey: ['analytics-best-time', workspaceId ?? 'none', heatmapPlatform ?? 'all', resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: (): Promise<BestTimeDto> => analyticsApi.getBestTime(wsId, heatmapPlatform, resolvedProfileId),
  });

  const followerStatsQuery = useQuery({
    queryKey: ['analytics-follower-stats', workspaceId ?? 'none', presetDays, resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: (): Promise<ZernioFollowerStatsResponseDto> =>
      analyticsApi.getFollowerStats(wsId, { fromDate, profileId: resolvedProfileId }),
  });

  const contentDecayQuery = useQuery({
    queryKey: ['analytics-content-decay', workspaceId ?? 'none', resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: (): Promise<ZernioContentDecayResponseDto> =>
      analyticsApi.getContentDecay(wsId, resolvedProfileId),
  });

  const postingFrequencyQuery = useQuery({
    queryKey: ['analytics-posting-frequency', workspaceId ?? 'none', resolvedProfileId ?? 'none'],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: (): Promise<ZernioPostingFrequencyResponseDto> =>
      analyticsApi.getPostingFrequency(wsId, resolvedProfileId),
  });

  // Use the first failed query's error as the page-level analytics error.
  // daily-metrics is the most "primary" and is the one shown in the banner.
  const primaryError =
    dailyMetricsQuery.error ?? bestTimeQuery.error ?? followerStatsQuery.error ?? null;

  const analyticsError: AnalyticsError | null = useMemo(
    () => (primaryError ? toAnalyticsError(primaryError) : null),
    [primaryError]
  );

  const selectedPresetLabel = useMemo(
    () => PRESET_OPTIONS.find((option) => option.days === presetDays)?.label ?? 'Last 30 days',
    [presetDays]
  );

  const refresh = useCallback(() => {
    dailyMetricsQuery.refetch();
    topPostsQuery.refetch();
    analyticsListSummaryQuery.refetch();
    bestTimeQuery.refetch();
    followerStatsQuery.refetch();
    contentDecayQuery.refetch();
    postingFrequencyQuery.refetch();
  }, [
    dailyMetricsQuery,
    topPostsQuery,
    analyticsListSummaryQuery,
    bestTimeQuery,
    followerStatsQuery,
    contentDecayQuery,
    postingFrequencyQuery,
  ]);

  const isBillingGateError =
    analyticsError?.status === 402 ||
    (analyticsError?.status === 403 && analyticsError?.code === 'analytics_addon_required');

  const isScopeError = analyticsError?.status === 412;

  return {
    presetDays,
    setPresetDays,
    presetOptions: PRESET_OPTIONS,
    selectedPresetLabel,
    rangeLabel: formatRangeLabel(presetDays),
    heatmapPlatform,
    setHeatmapPlatform,
    dailyMetrics: dailyMetricsQuery.data ?? null,
    topPosts: topPostsQuery.data ?? [],
    analyticsListSummary: analyticsListSummaryQuery.data?.totals ?? null,
    analyticsListSummaryPosts: analyticsListSummaryQuery.data?.posts ?? [],
    bestTime: bestTimeQuery.data ?? null,
    followerStats: followerStatsQuery.data ?? null,
    contentDecay: contentDecayQuery.data ?? null,
    postingFrequency: postingFrequencyQuery.data ?? null,
    dataUpdatedAt: dailyMetricsQuery.dataUpdatedAt ?? 0,
    isLoading: dailyMetricsQuery.isLoading,
    isFetching: dailyMetricsQuery.isFetching,
    isError: dailyMetricsQuery.isError,
    analyticsError,
    isBillingGateError,
    isScopeError,
    refresh,
  };
}
