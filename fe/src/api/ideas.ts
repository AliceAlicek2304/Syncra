import api from '../lib/axios';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  groupId: string;
  status: 'idea' | 'draft' | 'scheduled' | 'published';
  position?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  mediaAssetIds?: string[];
  createdAt: string;
}

export interface IdeaDto {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: string;
  position: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateIdeaRequest {
  title: string;
  description?: string;
  groupId?: string;
  status?: string;
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

const toIdea = (dto: IdeaDto): Idea => ({
  id: dto.id,
  title: dto.title,
  description: dto.description,
  groupId: dto.status,
  status: 'idea',
  position: dto.position,
  createdAt: dto.createdAtUtc,
});

export const ideasApi = {
  getIdeas: async (workspaceId: string): Promise<Idea[]> => {
    const response = await api.get<{ items: IdeaDto[] }>(`workspaces/${workspaceId}/ideas`);
    return response.data.items.map(toIdea);
  },

  createIdea: async (workspaceId: string, data: CreateIdeaRequest): Promise<Idea> => {
    const response = await api.post<IdeaDto>(`workspaces/${workspaceId}/ideas`, {
      title: data.title,
      description: data.description,
      status: data.groupId ?? 'unassigned',
    });
    return toIdea(response.data);
  },

  updateIdea: async (workspaceId: string, ideaId: string, data: UpdateIdeaRequest): Promise<Idea> => {
    const response = await api.put<IdeaDto>(`workspaces/${workspaceId}/ideas/${ideaId}`, {
      title: data.title,
      description: data.description,
      status: data.groupId,
    });
    return toIdea(response.data);
  },

  deleteIdea: async (workspaceId: string, ideaId: string): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/ideas/${ideaId}`);
  },

  reorderIdeas: async (workspaceId: string, orderedIds: string[]): Promise<void> => {
    await api.put(`workspaces/${workspaceId}/ideas/reorder`, { orderedIds });
  },
};

