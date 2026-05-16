import api from '../lib/axios';
import type { User } from './types';

export const usersApi = {
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<User>('users/me', data);
    return response.data;
  },
};
