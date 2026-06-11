import api from '../lib/axios';
import type {
  ZernioInboxConversationDetailDto,
  ZernioInboxConversationsListResponseDto,
  ZernioInboxHeatmapResponseDto,
  ZernioInboxResponseTimeResponseDto,
  ZernioInboxSourceBreakdownResponseDto,
  ZernioInboxTopAccountsResponseDto,
  ZernioInboxVolumeResponseDto,
  HeatmapAction,
} from '../types/inbox-analytics';

export interface VolumeParams {
  fromDate: string;
  toDate: string;
  platform?: string;
  source?: string;
  accountId?: string;
  profileId?: string;
}

export interface TopAccountsParams {
  fromDate: string;
  toDate: string;
  platform?: string;
  source?: string;
  limit?: number;
  profileId?: string;
}

export interface SourceBreakdownParams {
  fromDate: string;
  toDate: string;
  platform?: string;
  accountId?: string;
  profileId?: string;
}

export interface ResponseTimeParams {
  fromDate: string;
  toDate: string;
  platform?: string;
  accountId?: string;
  profileId?: string;
}

export interface HeatmapParams {
  fromDate: string;
  toDate: string;
  platform?: string;
  accountId?: string;
  source?: string;
  action?: HeatmapAction;
  profileId?: string;
}

export interface ConversationsListParams {
  fromDate: string;
  toDate: string;
  platform?: string;
  accountId?: string;
  source?: string;
  limit?: number;
  page?: number;
  sortBy?: 'lastMessagedAt' | 'firstMessagedAt' | 'totalMessages' | 'received' | 'sent' | 'read' | 'failed';
  order?: 'asc' | 'desc';
  profileId?: string;
}

export interface ConversationDetailParams {
  conversationId: string;
  fromDate: string;
  toDate: string;
  profileId?: string;
}

function stripFalsy(params: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

function buildProfileHeader(profileId?: string | null): Record<string, string> | undefined {
  if (profileId === 'all' || !profileId) return { 'X-Profile-Id': '' };
  return { 'X-Profile-Id': profileId };
}

export const inboxAnalyticsApi = {
  getVolume: async (params: VolumeParams): Promise<ZernioInboxVolumeResponseDto> => {
    const response = await api.get<ZernioInboxVolumeResponseDto>(
      'inbox/analytics/volume',
      {
        params: stripFalsy(params),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },

  getTopAccounts: async (params: TopAccountsParams): Promise<ZernioInboxTopAccountsResponseDto> => {
    const response = await api.get<ZernioInboxTopAccountsResponseDto>(
      'inbox/analytics/top-accounts',
      {
        params: stripFalsy(params),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },

  getSourceBreakdown: async (params: SourceBreakdownParams): Promise<ZernioInboxSourceBreakdownResponseDto> => {
    const response = await api.get<ZernioInboxSourceBreakdownResponseDto>(
      'inbox/analytics/source-breakdown',
      {
        params: stripFalsy(params),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },

  getResponseTime: async (params: ResponseTimeParams): Promise<ZernioInboxResponseTimeResponseDto> => {
    const response = await api.get<ZernioInboxResponseTimeResponseDto>(
      'inbox/analytics/response-time',
      {
        params: stripFalsy(params),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },

  getHeatmap: async (params: HeatmapParams): Promise<ZernioInboxHeatmapResponseDto> => {
    const response = await api.get<ZernioInboxHeatmapResponseDto>(
      'inbox/analytics/heatmap',
      {
        params: stripFalsy(params),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },

  listConversations: async (params: ConversationsListParams): Promise<ZernioInboxConversationsListResponseDto> => {
    const response = await api.get<ZernioInboxConversationsListResponseDto>(
      'inbox/analytics/conversations',
      {
        params: stripFalsy(params),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },

  getConversationDetail: async (params: ConversationDetailParams): Promise<ZernioInboxConversationDetailDto> => {
    const response = await api.get<ZernioInboxConversationDetailDto>(
      `inbox/analytics/conversations/${encodeURIComponent(params.conversationId)}`,
      {
        params: stripFalsy({
          fromDate: params.fromDate,
          toDate: params.toDate,
          profileId: params.profileId,
        }),
        headers: buildProfileHeader(params.profileId),
      }
    );
    return response.data;
  },
};
