import api from '../lib/axios';

export type AnalyticsPresetDays = 7 | 30 | 90;

export interface WeeklyReachDto {
  weekStart: string;
  reach: number;
}

export interface PlatformBreakdownDto {
  platform: string;
  postCount: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
  requiresReauth?: boolean;
  reauthorizeUrl?: string | null;
}

export interface WorkspaceAnalyticsSummaryDto {
  totalReach: number;
  engagementRate: number;
  followerGrowth: number;
  totalPosts: number;
  weeklyReach: WeeklyReachDto[];
  platformBreakdown?: PlatformBreakdownDto[] | null;
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

export interface ZernioDailyDataPointDto {
  date: string;
  postCount: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
}

export interface ZernioPlatformBreakdownDto {
  platform: string;
  postCount: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
}

export interface ZernioDailyMetricsDto {
  dailyData: ZernioDailyDataPointDto[];
  platformBreakdown: ZernioPlatformBreakdownDto[] | null;
}

export interface PostMetricsDto {
  impressions: number;
  engagements: number;
  clicks: number;
  views: number;
  engagementRate: number;
  isSyncPending?: boolean;
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

  getDailyMetrics: async (
    fromDate?: string
  ): Promise<ZernioDailyMetricsDto> => {
    const response = await api.get<ZernioDailyMetricsDto>(
      'analytics/daily-metrics',
      { params: { fromDate } }
    );
    return response.data;
  },

  getPostAnalytics: async (
    workspaceId: string,
    postId: string,
    dateDays: AnalyticsPresetDays
  ): Promise<PostMetricsDto> => {
    const response = await api.get<PostMetricsDto>(
      `workspaces/${workspaceId}/analytics/post/${postId}`,
      { params: { date: dateDays } }
    );

    return response.data;
  },
};
