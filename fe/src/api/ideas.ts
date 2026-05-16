import api from '../lib/axios';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  groupId: string;          // maps to "status" in the board UI (column id)
  status: 'idea' | 'draft' | 'scheduled' | 'published';
  position?: number;        // for drag-drop ordering (D-15)
  priority?: 'low' | 'medium' | 'high'; // D-14
  tags?: string[];          // D-14
  mediaAssetIds?: string[]; // D-08
  createdAt: string;        // ISO 8601
}

export interface CreateIdeaRequest {
  title: string;
  description?: string;
  groupId?: string;
  status?: 'idea';
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  position?: number;
}

export interface UpdateIdeaRequest {
  title?: string;
  description?: string;
  groupId?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  position?: number;
  mediaAssetIds?: string[];
}

export const ideasApi = {
  getIdeas: async (workspaceId: string): Promise<Idea[]> => {
    const response = await api.get<Idea[]>(`workspaces/${workspaceId}/posts`, {
      params: { status: 'idea' },
    });
    return response.data;
  },

  createIdea: async (workspaceId: string, data: CreateIdeaRequest): Promise<Idea> => {
    const response = await api.post<Idea>(`workspaces/${workspaceId}/posts`, {
      ...data,
      status: 'idea',
    });
    return response.data;
  },

  updateIdea: async (workspaceId: string, ideaId: string, data: UpdateIdeaRequest): Promise<Idea> => {
    const response = await api.put<Idea>(`workspaces/${workspaceId}/posts/${ideaId}`, data);
    return response.data;
  },

  deleteIdea: async (workspaceId: string, ideaId: string): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/posts/${ideaId}`);
  },

  reorderIdeas: async (workspaceId: string, orderedIds: string[]): Promise<void> => {
    await api.put(`workspaces/${workspaceId}/posts/reorder`, { orderedIds });
  },
};
