import api from '../lib/axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User, LinkAccountRequest, LinkedAccount } from './types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await api.post('auth/register', data);
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('auth/refresh', { refreshToken });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('auth/me');
    return response.data;
  },

  getOAuthLoginUrl: async (provider: string, returnUrl: string = '/'): Promise<{ loginUrl: string }> => {
    const response = await api.get<{ loginUrl: string }>(`auth/oauth/${provider}/login`, {
      params: { returnUrl },
    });
    return response.data;
  },

  oauthCallback: async (provider: string, code: string, state: string, returnUrl?: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`auth/oauth/${provider}/callback`, {
      code,
      state,
      returnUrl,
    });
    return response.data;
  },

  linkAccount: async (data: LinkAccountRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('auth/link', data);
    return response.data;
  },

  getLinkedAccounts: async (): Promise<LinkedAccount[]> => {
    const response = await api.get<LinkedAccount[]>('auth/linked-accounts');
    return response.data;
  },

  unlinkGoogleAccount: async (): Promise<void> => {
    await api.delete('auth/link/google');
  },
};
