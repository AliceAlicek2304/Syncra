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
