import api from '../lib/axios';

export type AnalyticsPresetDays = 7 | 30 | 90;

export interface WeeklyReachDto {
  weekStart: string;
  reach: number;
}

export interface WorkspaceAnalyticsSummaryDto {
  totalReach: number;
  engagementRate: number;
  followerGrowth: number;
  totalPosts: number;
  weeklyReach: WeeklyReachDto[];
}

export interface HeatmapSlotDto {
  dayOfWeek: number;
  hour: number;
  score: number;
}

export interface HeatmapDto {
  slots: HeatmapSlotDto[];
}

export interface AnalyticsError {
  code: string;
  message: string;
  reason?: string;
  platform?: string;
  reauthorizeUrl?: string;
  dashboardUrl?: string;
  status: number;
}

export const analyticsApi = {
  getWorkspaceSummary: async (
    workspaceId: string,
    dateDays: AnalyticsPresetDays
  ): Promise<WorkspaceAnalyticsSummaryDto> => {
    const response = await api.get<WorkspaceAnalyticsSummaryDto>(
      `workspaces/${workspaceId}/analytics/summary`,
      { params: { date: dateDays } }
    );

    return response.data;
  },

  getWorkspaceHeatmap: async (
    workspaceId: string,
    dateDays: AnalyticsPresetDays,
    platform?: string
  ): Promise<HeatmapDto> => {
    const response = await api.get<HeatmapDto>(
      `workspaces/${workspaceId}/analytics/heatmap`,
      { params: { date: dateDays, ...(platform ? { platform } : {}) } }
    );

    return response.data;
  },
};
