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
  }
};
