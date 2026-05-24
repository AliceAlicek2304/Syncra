import api from '../lib/axios';

export interface SocialAccountDto {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  connectedAtUtc: string;
  externalAccountId: string;
  zernioProfileId: string;
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
  getSocialAccounts: async (workspaceId: string): Promise<SocialAccountDto[]> => {
    const response = await api.get<SocialAccountDto[]>('social-accounts', {
      headers: {
        'X-Workspace-Id': workspaceId
      }
    });
    return response.data;
  },
  listSocialAccounts: async (workspaceId: string): Promise<SocialAccountDto[]> => {
    return socialAccountsApi.getSocialAccounts(workspaceId);
  },
  getAccountHealth: async (workspaceId: string, accountId: string): Promise<AccountHealthDto> => {
    const response = await api.get<AccountHealthDto>(`social-accounts/${accountId}/health`, {
      headers: {
        'X-Workspace-Id': workspaceId
      }
    });
    return response.data;
  }
};
