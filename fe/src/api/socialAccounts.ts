import api from '../lib/axios';
import type { PagedResult } from './types';

export interface SocialAccountDto {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  connectedAtUtc: string;
  externalAccountId: string;
  zernioProfileId: string;
  metadata?: Record<string, unknown>;
  handle?: string;
}

export interface FacebookPageDto {
  id: string;
  name: string;
  username: string | null;
  category: string | null;
  fanCount: number | null;
}

export interface FacebookPagesResponseDto {
  pages: FacebookPageDto[];
  selectedPageId: string | null;
  cached: boolean;
}

export interface AccountHealthDto {
  accountId: string;
  platform: string;
  username: string;
  displayName: string;
  status: 'healthy' | 'warning' | 'error';
  tokenStatus: {
    valid: boolean;
    expiresAt: string | null;
    expiresIn: string | null;
    needsRefresh: boolean;
  };
  permissions: {
    posting: { scope: string; granted: boolean; required: boolean }[];
    analytics: { scope: string; granted: boolean; required: boolean }[];
    optional: { scope: string; granted: boolean; required: boolean }[];
    canPost: boolean;
    canFetchAnalytics: boolean;
    missingRequired: string[];
  };
  issues: string[];
  recommendations: string[];
}

export interface TikTokCreatorInfoDto {
  creator_info?: {
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
    commercial_content_type_options?: string[];
  };
}

export const socialAccountsApi = {
  getFacebookPages: async (workspaceId: string, accountId: string, refresh?: boolean): Promise<FacebookPagesResponseDto> => {
    const params: Record<string, string> = {};
    if (refresh) params.refresh = 'true';
    const response = await api.get<FacebookPagesResponseDto>(
      `social-accounts/${accountId}/facebook-page`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params
      }
    );
    return response.data;
  },
  updateFacebookPage: async (workspaceId: string, accountId: string, selectedPageId: string): Promise<void> => {
    await api.put(
      `social-accounts/${accountId}/facebook-page`,
      { selectedPageId },
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
  },
  getSocialAccounts: async (
    workspaceId: string,
    params?: { page?: number; pageSize?: number },
    profileId?: string
  ): Promise<PagedResult<SocialAccountDto>> => {
    const headers: Record<string, string> = { 'X-Workspace-Id': workspaceId };
    if (profileId) headers['X-Profile-Id'] = profileId;
    const response = await api.get<PagedResult<SocialAccountDto>>('social-accounts', {
      headers,
      params,
    });
    return response.data;
  },
  /** Backward-compat helper: returns only the items array (all on page 1 with large pageSize). */
  listSocialAccounts: async (workspaceId: string, profileId?: string): Promise<SocialAccountDto[]> => {
    const result = await socialAccountsApi.getSocialAccounts(workspaceId, { pageSize: 200 }, profileId);
    return result.items;
  },
  getAccountHealth: async (workspaceId: string, accountId: string): Promise<AccountHealthDto> => {
    const response = await api.get<AccountHealthDto>(`social-accounts/${accountId}/health`, {
      headers: {
        'X-Workspace-Id': workspaceId
      }
    });
    return response.data;
  },
  getLinkedInOrganizations: async (
    workspaceId: string,
    accountId: string,
    refresh?: boolean
  ): Promise<LinkedInOrganizationsResponseDto> => {
    const params: Record<string, string> = {};
    if (refresh) params.refresh = 'true';
    const response = await api.get<LinkedInOrganizationsResponseDto>(
      `social-accounts/${accountId}/linkedin-organization`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params,
      }
    );
    return response.data;
  },
  getTikTokCreatorInfo: async (
    workspaceId: string,
    accountId: string
  ): Promise<TikTokCreatorInfoDto> => {
    const response = await api.get<TikTokCreatorInfoDto>(
      `social-accounts/${accountId}/tiktok-creator-info`,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },
  updateLinkedInOrganization: async (
    workspaceId: string,
    accountId: string,
    selectedOrganizationUrn: string
  ): Promise<void> => {
    await api.put(
      `social-accounts/${accountId}/linkedin-organization`,
      { selectedOrganizationUrn },
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
  }
};

export interface LinkedInOrganizationDto {
  urn: string;
  name: string;
  logoUrl?: string;
}

export interface LinkedInOrganizationsResponseDto {
  organizations: LinkedInOrganizationDto[];
  selectedOrganizationUrn: string | null;
}
