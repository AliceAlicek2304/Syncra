import api from '../lib/axios';

export interface MediaAsset {
  id: string;
  filename: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string; // ISO 8601
}

export interface PresignResponse {
  presignedUrl: string;  // PUT URL for direct-to-R2 upload
  assetId: string;       // pre-created asset record id
  publicUrl: string;     // final public URL after upload
}

export interface PresignRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface MediaListParams {
  type?: 'image' | 'video' | 'document';
  search?: string;
  page?: number;
  pageSize?: number;
}

export const mediaApi = {
  getMedia: async (workspaceId: string, params?: MediaListParams): Promise<MediaAsset[]> => {
    const response = await api.get<MediaAsset[]>(`workspaces/${workspaceId}/media`, { params });
    return response.data;
  },

  deleteMedia: async (workspaceId: string, mediaId: string): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/media/${mediaId}`);
  },

  presignUpload: async (workspaceId: string, data: PresignRequest): Promise<PresignResponse> => {
    const response = await api.post<PresignResponse>(
      `workspaces/${workspaceId}/media/presign`,
      data
    );
    return response.data;
  },

  confirmUpload: async (workspaceId: string, assetId: string): Promise<MediaAsset> => {
    const response = await api.post<MediaAsset>(
      `workspaces/${workspaceId}/media/confirm`,
      { assetId }
    );
    return response.data;
  },
};
