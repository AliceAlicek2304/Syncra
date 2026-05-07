import api from '../lib/axios';

export interface Group {
  id: string;
  name: string;
  position?: number;
}

export interface CreateGroupRequest {
  name: string;
}

export interface UpdateGroupRequest {
  name: string;
}

export const groupsApi = {
  getGroups: async (workspaceId: string): Promise<Group[]> => {
    const response = await api.get<Group[]>(`workspaces/${workspaceId}/groups`);
    return response.data;
  },

  createGroup: async (workspaceId: string, data: CreateGroupRequest): Promise<Group> => {
    const response = await api.post<Group>(`workspaces/${workspaceId}/groups`, data);
    return response.data;
  },

  updateGroup: async (workspaceId: string, groupId: string, data: UpdateGroupRequest): Promise<Group> => {
    const response = await api.put<Group>(`workspaces/${workspaceId}/groups/${groupId}`, data);
    return response.data;
  },

  deleteGroup: async (workspaceId: string, groupId: string): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/groups/${groupId}`);
  },
};
