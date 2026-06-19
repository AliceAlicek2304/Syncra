import api from '../lib/axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User, LinkAccountRequest, LinkedAccount } from './types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('auth/register', data);
    return response.data;
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

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('auth/reset-password', { token, newPassword });
    return response.data;
  },

  /**
   * Change the authenticated user's password.
   * @param data - { currentPassword?: string, newPassword: string }
   * Returns a message on success.
   */
  changePassword: async (data: { currentPassword?: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('auth/change-password', data);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('auth/verify-email', { token });
    return response.data;
  },

  resendVerificationEmail: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('auth/resend-verification-email', { email });
    return response.data;
  },
};
