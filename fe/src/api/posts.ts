import api from '../lib/axios';

export interface PlatformContent {
  platform: string;
  caption: string;
  hashtags?: string[];
}

export interface Post {
  id: string;
  title: string;
  content?: string;          // master caption
  status: 'idea' | 'draft' | 'scheduled' | 'published';
  scheduledAtUtc?: string;   // ISO 8601
  platforms?: string[];
  platformContents?: PlatformContent[];
  mediaAssetIds?: string[];  // D-08: reference by assetId
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  content?: string;
  status?: 'idea' | 'draft' | 'scheduled';
  groupId?: string;
  platforms?: string[];
  platformContents?: PlatformContent[];
  mediaAssetIds?: string[];
  scheduledAtUtc?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  status?: 'idea' | 'draft' | 'scheduled' | 'published';
  groupId?: string;
  platforms?: string[];
  platformContents?: PlatformContent[];
  mediaAssetIds?: string[];
  scheduledAtUtc?: string;
}

export const postsApi = {
  createPost: async (workspaceId: string, data: CreatePostRequest): Promise<Post> => {
    const response = await api.post<Post>(`workspaces/${workspaceId}/posts`, data);
    return response.data;
  },

  getPost: async (workspaceId: string, postId: string): Promise<Post> => {
    const response = await api.get<Post>(`workspaces/${workspaceId}/posts/${postId}`);
    return response.data;
  },

  updatePost: async (workspaceId: string, postId: string, data: UpdatePostRequest): Promise<Post> => {
    const response = await api.put<Post>(`workspaces/${workspaceId}/posts/${postId}`, data);
    return response.data;
  },
};
