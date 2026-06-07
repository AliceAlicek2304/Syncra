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

// Routes are workspace-less — backend resolves from TenantResolutionMiddleware.
// FE never passes X-Workspace-Id (axios interceptor would otherwise inject it).
// We DO NOT call api.get with headers: buildWorkspaceHeader(...) because the
// controller does not expect that path.

export interface VolumeParams {
  fromDate: string; // YYYY-MM-DD
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
  limit?: number; // 1..50
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
  limit?: number; // 1..100, default 50
  page?: number; // ≥1
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

export const inboxAnalyticsApi = {
  getVolume: async (params: VolumeParams): Promise<ZernioInboxVolumeResponseDto> => {
    const response = await api.get<ZernioInboxVolumeResponseDto>(
      'inbox/analytics/volume',
      { params: stripFalsy(params) }
    );
    return response.data;
  },

  getTopAccounts: async (params: TopAccountsParams): Promise<ZernioInboxTopAccountsResponseDto> => {
    const response = await api.get<ZernioInboxTopAccountsResponseDto>(
      'inbox/analytics/top-accounts',
      { params: stripFalsy(params) }
    );
    return response.data;
  },

  getSourceBreakdown: async (params: SourceBreakdownParams): Promise<ZernioInboxSourceBreakdownResponseDto> => {
    const response = await api.get<ZernioInboxSourceBreakdownResponseDto>(
      'inbox/analytics/source-breakdown',
      { params: stripFalsy(params) }
    );
    return response.data;
  },

  getResponseTime: async (params: ResponseTimeParams): Promise<ZernioInboxResponseTimeResponseDto> => {
    const response = await api.get<ZernioInboxResponseTimeResponseDto>(
      'inbox/analytics/response-time',
      { params: stripFalsy(params) }
    );
    return response.data;
  },

  getHeatmap: async (params: HeatmapParams): Promise<ZernioInboxHeatmapResponseDto> => {
    const response = await api.get<ZernioInboxHeatmapResponseDto>(
      'inbox/analytics/heatmap',
      { params: stripFalsy(params) }
    );
    return response.data;
  },

  listConversations: async (params: ConversationsListParams): Promise<ZernioInboxConversationsListResponseDto> => {
    const response = await api.get<ZernioInboxConversationsListResponseDto>(
      'inbox/analytics/conversations',
      { params: stripFalsy(params) }
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
      }
    );
    return response.data;
  },
};
