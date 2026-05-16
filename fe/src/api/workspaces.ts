import api from '../lib/axios';
import type { Workspace } from './types';

export const workspacesApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const response = await api.get<Workspace[]>('workspaces');
    return response.data;
  },

  createWorkspace: async (data: { name: string; slug: string }): Promise<Workspace> => {
    const response = await api.post<Workspace>('workspaces', data);
    return response.data;
  },

  getWorkspace: async (id: string): Promise<Workspace> => {
    const response = await api.get<Workspace>(`workspaces/${id}`);
    return response.data;
  },

  updateWorkspace: async (id: string, data: { name: string }): Promise<Workspace> => {
    const response = await api.put<Workspace>(`workspaces/${id}`, data);
    return response.data;
  },
};
