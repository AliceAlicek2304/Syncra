import api from '../lib/axios';
import type { Workspace, Profile } from './types';

export const workspacesApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const response = await api.get<Workspace[]>('workspaces');
    return response.data;
  },

  getProfiles: async (): Promise<Profile[]> => {
    const response = await api.get<Profile[]>('profiles');
    return response.data;
  },

  createProfile: async (data: { name: string; color?: string }): Promise<Profile> => {
    const response = await api.post<Profile>('profiles', data);
    return response.data;
  },

  updateProfile: async (id: string, data: { name: string }): Promise<Profile> => {
    const response = await api.put<Profile>(`profiles/${id}`, data);
    return response.data;
  },

  deleteProfile: async (id: string): Promise<void> => {
    await api.delete(`profiles/${id}`);
  },
};
