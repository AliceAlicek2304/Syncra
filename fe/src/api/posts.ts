import api from '../lib/axios';
import type { PagedResult } from './types';

export interface PlatformContent {
  platform: string;
  caption: string;
  hashtags?: string[];
}

export interface Post {
  id: string;
  workspaceId?: string;
  title: string;
  content?: string;          // master caption
  status: 'idea' | 'draft' | 'scheduled' | 'published' | 'publishing' | 'partial' | 'failed';
  scheduledAtUtc?: string;   // ISO 8601
  platforms?: string[];
  platformContents?: PlatformContent[];
  mediaAssetIds?: string[];  // D-08: reference by assetId
  groupId?: string;
  createdBy?: string;        // userId of the creator
  createdAt: string;
  updatedAt: string;
  zernioPostId?: string;
  zernioTargetCount?: number;
  platformTargets?: PostPlatformTargetDto[];
  mediaItems?: PostMediaItem[];
}

export interface PostMediaItem {
  url: string;
  type: string;
  filename?: string;
  mimeType?: string;
}

export interface PostPlatformTargetDto {
  id: string;
  platform: string;
  status: 'Pending' | 'Published' | 'Failed';
  externalPostUrl?: string;
  errorMessage?: string;
  zernioAccountId?: string;
  platformSpecificData?: any;
}

export interface GetPostsParams {
  status?: string;
  scheduledFromUtc?: string;
  scheduledToUtc?: string;
  page?: number;
  pageSize?: number;
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

export interface CreateZernioPostRequest {
  postId?: string;
  status?: string;
  title?: string;
  content?: string;
  socialAccountIds?: string[];
  scheduledAtUtc?: string;
  publishNow: boolean;
  isDraft?: boolean;
  mediaItems?: PostMediaItem[];
  platformContents?: PlatformContent[];
  platformSpecificData?: any;
  tiktokSettings?: any;
  facebookSettings?: any;
}

export interface ScheduledPostsCountResponse {
  count: number;
}

export const postsApi = {
  createPost: async (workspaceId: string, data: CreatePostRequest): Promise<Post> => {
    const response = await api.post<Post>(`workspaces/${workspaceId}/posts`, data);
    return response.data;
  },

  getPosts: async (workspaceId: string, params?: GetPostsParams): Promise<PagedResult<Post>> => {
    const response = await api.get<PagedResult<Post>>(`workspaces/${workspaceId}/posts`, { params });
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

  reschedulePost: async (workspaceId: string, postId: string, scheduledAtUtc: string): Promise<Post> => {
    const response = await api.put<Post>(`workspaces/${workspaceId}/posts/${postId}`, { scheduledAtUtc });
    return response.data;
  },

  deletePost: async (workspaceId: string, postId: string): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/posts/${postId}`);
  },

  createZernioPost: async (workspaceId: string, data: CreateZernioPostRequest): Promise<Post> => {
    if (data.postId) {
      const response = await api.put<Post>(`workspaces/${workspaceId}/posts/zernio/${data.postId}`, data);
      return response.data;
    }
    const response = await api.post<Post>(`workspaces/${workspaceId}/posts/zernio`, data);
    return response.data;
  },

  retryZernioPost: async (workspaceId: string, postId: string): Promise<Post> => {
    const response = await api.post<Post>(`workspaces/${workspaceId}/posts/zernio/${postId}/retry`);
    return response.data;
  },

  deleteZernioPost: async (workspaceId: string, postId: string): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/posts/zernio/${postId}`);
  },

  getScheduledPostsCount: async (
    workspaceId: string,
    socialAccountId: string
  ): Promise<ScheduledPostsCountResponse> => {
    const response = await api.get<ScheduledPostsCountResponse>(
      `workspaces/${workspaceId}/posts/scheduled-posts-count`,
      { params: { socialAccountId }, headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },
};
