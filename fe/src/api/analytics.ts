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
  requiresReauth?: boolean;
  reauthorizeUrl?: string;
}

export interface ZernioDailyMetricsDto {
  dailyData: ZernioDailyDataPointDto[];
  platformBreakdown: ZernioPlatformBreakdownDto[];
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

export interface ZernioPostTimelineItemDto {
  date: string;
  platform: string;
  platformPostId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
}

export interface ZernioPostTimelineResponseDto {
  timeline?: ZernioPostTimelineItemDto[];
}

export interface ZernioAnalyticsListPostDto {
  id?: string;
  latePostId?: string;
  content?: string;
  scheduledFor?: string;
  publishedAt?: string;
  status?: string;
  analytics?: PostAnalyticsFields;
  platforms?: unknown[];
  platform?: string;
  platformPostUrl?: string;
  isExternal?: boolean;
  profileId?: string;
  thumbnailUrl?: string;
  mediaType?: string;
  mediaItems?: unknown[];
}

export interface ZernioPostAnalyticsListDto {
  overview?: unknown;
  posts?: ZernioAnalyticsListPostDto[];
  pagination?: unknown;
  accounts?: unknown[];
  hasAnalyticsAccess?: boolean;
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

export interface ZernioFollowerStatsDateRangeDto {
  from?: string;
  to?: string;
}

export interface ZernioFollowerStatsAccountDto {
  _id: string;
  platform: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  currentFollowers: number;
  lastUpdated: string;
  growth: number;
  growthPercentage: number;
  dataPoints: number;
}

export interface ZernioFollowerStatsDataPointDto {
  date: string;
  followers: number;
}

export interface ZernioFollowerStatsResponseDto {
  accounts: ZernioFollowerStatsAccountDto[];
  stats?: Record<string, ZernioFollowerStatsDataPointDto[]>;
  dateRange?: ZernioFollowerStatsDateRangeDto;
  granularity?: string;
}

export interface ContentDecayPointDto {
  bucketOrder: number;
  bucketLabel: string;
  avgPctOfFinal: number;
  postCount: number;
}

export interface ZernioContentDecayResponseDto {
  buckets?: ContentDecayPointDto[];
}

export interface PostingFrequencyItemDto {
  platform: string;
  postsPerWeek: number;
  avgEngagementRate: number;
  avgEngagement: number;
  weeksCount: number;
}

export interface ZernioPostingFrequencyResponseDto {
  frequency?: PostingFrequencyItemDto[];
}

/**
 * Helper: build the X-Workspace-Id header for a request.
 *
 * - `null`  → send `X-Workspace-Id: ''` to override any default from localStorage
 *             (signals "all workspaces" to the backend)
 * - string  → send `X-Workspace-Id: <id>` to scope to one workspace
 * - `undefined` → omit the header; the axios interceptor will fill it from
 *             localStorage (default behavior, used when caller doesn't care)
 */
function buildWorkspaceHeader(workspaceId?: string | null): Record<string, string> | undefined {
  if (workspaceId === null) return { 'X-Workspace-Id': '' };
  if (workspaceId) return { 'X-Workspace-Id': workspaceId };
  return undefined;
}

/**
 * Helper: build the X-Profile-Id header for a request.
 *
 * - 'all' / null / undefined → send `X-Profile-Id: ''` to override any default from localStorage
 * - string → send `X-Profile-Id: <id>` to scope to one profile
 */
function buildProfileHeader(profileId?: string | null): Record<string, string> | undefined {
  if (profileId === 'all' || !profileId) return { 'X-Profile-Id': '' };
  return { 'X-Profile-Id': profileId };
}

/**
 * Helper: add profileId as a query param if provided.
 */
function maybeProfileId(profileId?: string | null): Record<string, string> | undefined {
  if (profileId) return { profileId };
  return undefined;
}

export const analyticsApi = {
  /**
   * GET /api/v1/analytics/daily-metrics?fromDate=YYYY-MM-DD
   *
   * Contract: ONLY `fromDate` is sent as a query param. No source/toDate.
   */
  getDailyMetrics: async (
    params: { fromDate: string; platform?: string; profileId?: string },
    workspaceId?: string | null
  ): Promise<ZernioDailyMetricsDto> => {
    try {
      const response = await api.get<ZernioDailyMetricsDto>(
        'analytics/daily-metrics',
        {
          params: {
            fromDate: params.fromDate,
            ...(params.platform ? { platform: params.platform } : {}),
            ...maybeProfileId(params.profileId),
          },
          headers: {
            ...buildWorkspaceHeader(workspaceId),
            ...buildProfileHeader(params.profileId),
          },
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

  /**
   * GET /api/v1/analytics/best-time
   *
   * Contract: NO query params. The backend decides scope from the
   * X-Workspace-Id header.
   */
  getBestTime: async (
    workspaceId?: string | null,
    platform?: string,
    profileId?: string
  ): Promise<BestTimeDto> => {
    const response = await api.get<BestTimeDto>(
      'analytics/best-time',
      {
        params: {
          ...(platform ? { platform } : {}),
          ...maybeProfileId(profileId),
        },
        headers: {
          ...buildWorkspaceHeader(workspaceId),
          ...buildProfileHeader(profileId),
        },
      }
    );
    return response.data;
  },

  getPostAnalytics: async (
    workspaceId: string | null | undefined,
    postId: string,
    dateDays: AnalyticsPresetDays,
    profileId?: string
  ): Promise<ZernioPostAnalyticsDto> => {
    const response = await api.get<ZernioPostAnalyticsDto>(
      `analytics`,
      {
        params: { postId, date: dateDays, ...maybeProfileId(profileId) },
        headers: {
          ...buildWorkspaceHeader(workspaceId),
          ...buildProfileHeader(profileId),
        },
      }
    );

    return response.data;
  },

  /**
   * GET /api/v1/analytics?sortBy=&order=&limit=&fromDate=
   *
   * Contract: ONLY the 4 listed params. Caller is responsible for passing
   * the right values for the Analytics-page top-posts list.
   */
  getAnalyticsList: async (
    workspaceId?: string | null,
    params?: {
      sortBy: string;
      order: 'asc' | 'desc';
      limit: number;
      fromDate: string;
      platform?: string;
      profileId?: string;
    }
  ): Promise<ZernioPostAnalyticsListDto> => {
    const response = await api.get<ZernioPostAnalyticsListDto>(
      `analytics`,
      {
        params,
        headers: {
          ...buildWorkspaceHeader(workspaceId),
          ...buildProfileHeader(params?.profileId),
        },
      }
    );

    return response.data;
  },

  /**
   * GET /api/v1/analytics/accounts/follower-stats?fromDate=YYYY-MM-DD
   *
   * Contract: ONLY `fromDate` is sent. No toDate/granularity/etc.
   */
  getFollowerStats: async (
    workspaceId?: string | null,
    params?: { fromDate: string; profileId?: string }
  ): Promise<ZernioFollowerStatsResponseDto> => {
    const response = await api.get<ZernioFollowerStatsResponseDto>(
      'analytics/accounts/follower-stats',
      {
        params: params ? { fromDate: params.fromDate, ...maybeProfileId(params.profileId) } : undefined,
        headers: {
          ...buildWorkspaceHeader(workspaceId),
          ...buildProfileHeader(params?.profileId),
        },
      }
    );
    return response.data;
  },

  /**
   * GET /api/v1/analytics/content-decay
   *
   * Contract: NO query params.
   */
  getContentDecay: async (
    workspaceId?: string | null,
    profileId?: string
  ): Promise<ZernioContentDecayResponseDto> => {
    const response = await api.get<ZernioContentDecayResponseDto>(
      'analytics/content-decay',
      {
        params: maybeProfileId(profileId),
        headers: {
          ...buildWorkspaceHeader(workspaceId),
          ...buildProfileHeader(profileId),
        },
      }
    );
    return response.data;
  },

  /**
   * GET /api/v1/analytics/posting-frequency
   *
   * Contract: NO query params.
   */
  getPostingFrequency: async (
    workspaceId?: string | null,
    profileId?: string
  ): Promise<ZernioPostingFrequencyResponseDto> => {
    const response = await api.get<ZernioPostingFrequencyResponseDto>(
      'analytics/posting-frequency',
      {
        params: maybeProfileId(profileId),
        headers: {
          ...buildWorkspaceHeader(workspaceId),
          ...buildProfileHeader(profileId),
        },
      }
    );
    return response.data;
  },

  getPostTimeline: async (
    workspaceId: string | null | undefined,
    postId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ZernioPostTimelineResponseDto> => {
    const response = await api.get<ZernioPostTimelineResponseDto>(
      'analytics/post-timeline',
      {
        params: { postId, fromDate, toDate },
        headers: buildWorkspaceHeader(workspaceId),
      }
    );
    return response.data;
  },
};
