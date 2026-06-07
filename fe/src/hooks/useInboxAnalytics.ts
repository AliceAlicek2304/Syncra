import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { inboxAnalyticsApi } from '../api/inbox-analytics';
import type {
  InboxAnalyticsError,
  InboxAnalyticsPresetDays,
  HeatmapAction,
  InboxMessageSource,
} from '../types/inbox-analytics';

export interface InboxFilters {
  fromDate: string;
  toDate: string;
  platform?: string;
  source?: InboxMessageSource | 'all';
  /** heatmap-only: which action to aggregate */
  heatmapAction?: HeatmapAction;
}

const PRESET_OPTIONS: { label: string; days: InboxAnalyticsPresetDays }[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 365 days', days: 365 },
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

const computeFromDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const toIsoDate = (d: Date): string =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

function toInboxError(error: unknown): InboxAnalyticsError | null {
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

const noAutoRefetch = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function useInboxAnalytics() {
  const [presetDays, setPresetDays] = useState<InboxAnalyticsPresetDays>(30);
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<InboxMessageSource | 'all'>('all');
  const [heatmapAction, setHeatmapAction] = useState<HeatmapAction>('all');

  const toDate = useMemo(() => toIsoDate(new Date()), []);
  const fromDate = useMemo(() => computeFromDate(presetDays), [presetDays]);

  const filters = useMemo<InboxFilters>(
    () => ({
      fromDate,
      toDate,
      ...(platform ? { platform } : {}),
      ...(source && source !== 'all' ? { source } : {}),
      heatmapAction,
    }),
    [fromDate, toDate, platform, source, heatmapAction]
  );

  const volumeQuery = useQuery({
    queryKey: ['inbox-analytics-volume', fromDate, toDate, platform ?? 'all', source],
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: () => inboxAnalyticsApi.getVolume({
      fromDate,
      toDate,
      ...(platform ? { platform } : {}),
      ...(source && source !== 'all' ? { source } : {}),
    }),
  });

  const topAccountsQuery = useQuery({
    queryKey: ['inbox-analytics-top-accounts', fromDate, toDate, platform ?? 'all', source],
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: () => inboxAnalyticsApi.getTopAccounts({
      fromDate,
      toDate,
      limit: 10,
      ...(platform ? { platform } : {}),
      ...(source && source !== 'all' ? { source } : {}),
    }),
  });

  const sourceBreakdownQuery = useQuery({
    queryKey: ['inbox-analytics-source-breakdown', fromDate, toDate, platform ?? 'all'],
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: () => inboxAnalyticsApi.getSourceBreakdown({
      fromDate,
      toDate,
      ...(platform ? { platform } : {}),
    }),
  });

  const responseTimeQuery = useQuery({
    queryKey: ['inbox-analytics-response-time', fromDate, toDate, platform ?? 'all'],
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: () => inboxAnalyticsApi.getResponseTime({
      fromDate,
      toDate,
      ...(platform ? { platform } : {}),
    }),
  });

  const heatmapQuery = useQuery({
    queryKey: ['inbox-analytics-heatmap', fromDate, toDate, platform ?? 'all', heatmapAction],
    staleTime: 5 * 60_000,
    ...noAutoRefetch,
    queryFn: () => inboxAnalyticsApi.getHeatmap({
      fromDate,
      toDate,
      ...(platform ? { platform } : {}),
      action: heatmapAction,
    }),
  });

  const conversationsQuery = useQuery({
    queryKey: ['inbox-analytics-conversations', fromDate, toDate, platform ?? 'all', source],
    staleTime: 60_000,
    ...noAutoRefetch,
    queryFn: () => inboxAnalyticsApi.listConversations({
      fromDate,
      toDate,
      limit: 50,
      page: 1,
      sortBy: 'lastMessagedAt',
      order: 'desc',
      ...(platform ? { platform } : {}),
      ...(source && source !== 'all' ? { source } : {}),
    }),
  });

  // primary error = first failed query (volume is the canonical one for banners)
  const primaryError =
    volumeQuery.error ??
    topAccountsQuery.error ??
    sourceBreakdownQuery.error ??
    responseTimeQuery.error ??
    heatmapQuery.error ??
    conversationsQuery.error ??
    null;

  const inboxError: InboxAnalyticsError | null = useMemo(
    () => (primaryError ? toInboxError(primaryError) : null),
    [primaryError]
  );

  const isNotConnected = inboxError?.code === 'zernio_not_connected';
  const isBillingGate =
    inboxError?.status === 402 ||
    (inboxError?.status === 403 && inboxError?.code === 'analytics_addon_required');
  const isScopeError = inboxError?.status === 412;

  const refresh = useCallback(() => {
    volumeQuery.refetch();
    topAccountsQuery.refetch();
    sourceBreakdownQuery.refetch();
    responseTimeQuery.refetch();
    heatmapQuery.refetch();
    conversationsQuery.refetch();
  }, [
    volumeQuery,
    topAccountsQuery,
    sourceBreakdownQuery,
    responseTimeQuery,
    heatmapQuery,
    conversationsQuery,
  ]);

  return {
    // state
    presetDays,
    setPresetDays,
    presetOptions: PRESET_OPTIONS,
    platform,
    setPlatform,
    source,
    setSource,
    heatmapAction,
    setHeatmapAction,
    // derived
    fromDate,
    toDate,
    rangeLabel: formatRangeLabel(presetDays),
    filters,
    // data
    volume: volumeQuery.data ?? null,
    topAccounts: topAccountsQuery.data?.accounts ?? [],
    sourceBreakdown: sourceBreakdownQuery.data?.sources ?? [],
    responseTime: responseTimeQuery.data ?? null,
    heatmap: heatmapQuery.data?.buckets ?? [],
    conversations: conversationsQuery.data?.items ?? [],
    // loading flags
    isLoading: volumeQuery.isLoading,
    isFetching: volumeQuery.isFetching,
    isError: volumeQuery.isError,
    // per-query loading for individual skeletons
    loadingFlags: {
      volume: volumeQuery.isLoading,
      topAccounts: topAccountsQuery.isLoading,
      sourceBreakdown: sourceBreakdownQuery.isLoading,
      responseTime: responseTimeQuery.isLoading,
      heatmap: heatmapQuery.isLoading,
      conversations: conversationsQuery.isLoading,
    },
    // errors
    inboxError,
    isNotConnected,
    isBillingGate,
    isScopeError,
    refresh,
  };
}
