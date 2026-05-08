import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import type { AnalyticsPresetDays, HeatmapDto, WorkspaceAnalyticsSummaryDto } from '../api/analytics';

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

export function useAnalyticsSummary({ workspaceId }: UseAnalyticsSummaryArgs) {
  const [presetDays, setPresetDays] = useState<AnalyticsPresetDays>(30);

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', workspaceId, presetDays],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<WorkspaceAnalyticsSummaryDto | null> => {
      if (!workspaceId) return null;
      return analyticsApi.getWorkspaceSummary(workspaceId, presetDays);
    },
  });

  const heatmapQuery = useQuery({
    queryKey: ['analytics-heatmap', workspaceId, presetDays],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<HeatmapDto | null> => {
      if (!workspaceId) return null;
      return analyticsApi.getWorkspaceHeatmap(workspaceId, presetDays);
    },
  });

  const selectedPresetLabel = useMemo(
    () => PRESET_OPTIONS.find((option) => option.days === presetDays)?.label ?? 'Last 30 days',
    [presetDays]
  );

  return {
    presetDays,
    setPresetDays,
    presetOptions: PRESET_OPTIONS,
    selectedPresetLabel,
    rangeLabel: formatRangeLabel(presetDays),
    summary: summaryQuery.data,
    heatmap: heatmapQuery.data,
    isLoading: summaryQuery.isLoading || heatmapQuery.isLoading,
    isFetching: summaryQuery.isFetching || heatmapQuery.isFetching,
    isError: summaryQuery.isError || heatmapQuery.isError,
  };
}
