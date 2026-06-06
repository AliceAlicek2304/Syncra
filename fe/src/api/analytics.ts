import api from '../lib/axios';

export type AnalyticsPresetDays = 7 | 30 | 90;

export interface AnalyticsError {
  code: string;
  message: string;
  reason?: string;
  platform?: string;
  reauthorizeUrl?: string;
  dashboardUrl?: string;
  status: number;
}

export interface ZernioMetricsDto {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
}

export interface ZernioDailyDataPointDto {
  date: string;
  postCount: number;
  platforms: Record<string, number>;
  metrics: ZernioMetricsDto;
}

export interface ZernioPlatformBreakdownDto extends ZernioMetricsDto {
  platform: string;
  postCount: number;
}

export interface ZernioDailyMetricsDto {
  dailyData: ZernioDailyDataPointDto[];
  platformBreakdown: ZernioPlatformBreakdownDto[];
}

export interface DailyMetricsParams {
  platform?: string;
  profileId?: string;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  source?: 'all' | 'late' | 'external';
}

export interface PostAnalyticsFields {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
  engagementRate: number;
  lastUpdated?: string;
}

export interface ZernioPostAnalyticsDto {
  postId?: string;
  latePostId?: string;
  status?: string;
  content?: string;
  scheduledFor?: string;
  publishedAt?: string;
  analytics?: PostAnalyticsFields;
  platformAnalytics?: any[];
  platform?: string;
  platformPostUrl?: string;
  isExternal?: boolean;
  syncStatus?: string;
  message?: string;
  thumbnailUrl?: string;
  mediaType?: string;
  mediaItems?: any[];
  syncPending: boolean;
}

export interface BestTimeSlotDto {
  dayOfWeek: number;
  hour: number;
  avgEngagement: number;
  postCount: number;
}

export interface BestTimeDto {
  slots: BestTimeSlotDto[];
}

export interface BestTimeParams {
  platform?: string;
  profileId?: string;
  accountId?: string;
  source?: 'all' | 'late' | 'external';
}

export const analyticsApi = {
  getDailyMetrics: async (
    params: DailyMetricsParams = {}
  ): Promise<ZernioDailyMetricsDto> => {
    const {
      source = 'all',
      fromDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      toDate = new Date().toISOString(),
    } = params;

    try {
      const response = await api.get<ZernioDailyMetricsDto>(
        'analytics/daily-metrics',
        {
          params: { ...params, source, fromDate, toDate },
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402 && error.response?.data?.code === 'analytics_addon_required') {
        error.isAnalyticsAddonRequired = true;
      }
      throw error;
    }
  },

  getBestTime: async (
    workspaceId: string,
    params?: BestTimeParams
  ): Promise<BestTimeDto> => {
    const response = await api.get<BestTimeDto>(
      'analytics/best-time',
      { 
        params,
        headers: { 'X-Workspace-Id': workspaceId }
      }
    );
    return response.data;
  },

  getPostAnalytics: async (
    workspaceId: string,
    postId: string,
    dateDays: AnalyticsPresetDays
  ): Promise<ZernioPostAnalyticsDto> => {
    const response = await api.get<ZernioPostAnalyticsDto>(
      `analytics`,
      { 
        params: { postId, date: dateDays },
        headers: { 'X-Workspace-Id': workspaceId }
      }
    );

    return response.data;
  },
};
