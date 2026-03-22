import { api } from './axios'

export interface PostDto {
  id: string
  workspaceId: string
  userId: string
  title: string
  content: string
  status: string
  scheduledAtUtc: string | null
  publishedAtUtc: string | null
  integrationId: string | null
  mediaIds: string[]  // GUIDs returned from backend
}

export interface CreatePostPayload {
  title: string
  content: string
  scheduledAtUtc: string | null
  integrationId: string | null
  mediaIds: string[]
}

export interface UpdatePostPayload {
  title?: string
  content?: string
  scheduledAtUtc?: string | null
  status?: string
  integrationId?: string | null
  mediaIds?: string[]
}

export interface PublishPostRequest {
  dryRun?: boolean
  scheduledAtUtc?: string
  integrationId?: string
}

export const postsApi = {
  create: (workspaceId: string, data: CreatePostPayload) =>
    api.post<PostDto>(`/workspaces/${workspaceId}/posts`, data),

  update: (workspaceId: string, postId: string, data: UpdatePostPayload) =>
    api.put<PostDto>(`/workspaces/${workspaceId}/posts/${postId}`, data),

  publish: (workspaceId: string, postId: string, data?: PublishPostRequest) =>
    api.post<PostDto>(`/workspaces/${workspaceId}/posts/${postId}/publish`, data),

  delete: (workspaceId: string, postId: string) =>
    api.delete(`/workspaces/${workspaceId}/posts/${postId}`),
}
