import api from '../lib/axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from './types';

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
};
