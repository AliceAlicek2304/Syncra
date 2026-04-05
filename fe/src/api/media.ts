import { api } from './axios'

export interface MediaDto {
  id: string
  workspaceId: string
  fileName: string
  contentType: string
  sizeBytes: number
  url: string
  storageType?: string
  postId: string | null
  ideaId?: string | null
  createdAtUtc: string
  updatedAtUtc?: string
}

type BackendMediaDto = {
  id: string
  workspaceId: string
  fileName: string
  url: string
  mediaType?: string
  mimeType?: string
  contentType?: string
  storageType?: string
  sizeBytes: number
  postId: string | null
  ideaId?: string | null
  createdAtUtc: string
  updatedAtUtc?: string
}

const normalizeMediaDto = (dto: BackendMediaDto): MediaDto => ({
  id: dto.id,
  workspaceId: dto.workspaceId,
  fileName: dto.fileName,
  url: dto.url,
  // Keep FE contract stable while accepting current BE field names.
  contentType: dto.contentType ?? dto.mimeType ?? dto.mediaType ?? '',
  storageType: dto.storageType,
  sizeBytes: dto.sizeBytes,
  postId: dto.postId,
  ideaId: dto.ideaId,
  createdAtUtc: dto.createdAtUtc,
  updatedAtUtc: dto.updatedAtUtc,
})

export const mediaApi = {
  upload: (workspaceId: string, file: File, postId?: string, ideaId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (postId) formData.append('postId', postId)
    if (ideaId) formData.append('ideaId', ideaId)
    return api
      .post<BackendMediaDto>(`/workspaces/${workspaceId}/media/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(res => ({ ...res, data: normalizeMediaDto(res.data) }))
  },

  list: (workspaceId: string, params?: { mediaType?: string; isAttached?: boolean; page?: number; pageSize?: number }) =>
    api
      .get<{ items: BackendMediaDto[] }>(`/workspaces/${workspaceId}/media`, { params })
      .then(res => (res.data.items ?? []).map(normalizeMediaDto)),

  delete: (workspaceId: string, mediaId: string) =>
    api.delete(`/workspaces/${workspaceId}/media/${mediaId}`),
}
