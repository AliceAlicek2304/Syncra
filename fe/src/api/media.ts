import { api } from './axios'

export interface MediaDto {
  id: string
  workspaceId: string
  fileName: string
  contentType: string
  sizeBytes: number
  url: string
  storageType: string
  postId: string | null
  ideaId?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export const mediaApi = {
  upload: (workspaceId: string, file: File, postId?: string, ideaId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (postId) formData.append('postId', postId)
    if (ideaId) formData.append('ideaId', ideaId)
    return api.post<MediaDto>(`/workspaces/${workspaceId}/media/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  list: (workspaceId: string, params?: { mediaType?: string; isAttached?: boolean; page?: number; pageSize?: number }) =>
    api.get(`/workspaces/${workspaceId}/media`, { params }).then(res => res.data.items as MediaDto[]),

  delete: (workspaceId: string, mediaId: string) =>
    api.delete(`/workspaces/${workspaceId}/media/${mediaId}`),
}
