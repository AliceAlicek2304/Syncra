import api from '../lib/axios';

/**
 * Shape returned by GET /workspaces/{id}/media.
 * Field names match the backend MediaDto camelCase serialization.
 */
export interface MediaAsset {
  id: string;
  fileName: string;    // backend: FileName
  fileUrl: string;     // backend: FileUrl  (the public storage URL)
  mimeType: string;    // backend: MimeType
  mediaType: string;   // backend: MediaType  ("image" | "video" | "document")
  sizeBytes: number;
  postId?: string;
  createdAtUtc: string;
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

/** Normalised result returned by uploadMedia — always has publicUrl */
export interface UploadResult {
  id: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export const mediaApi = {
  getMedia: async (workspaceId: string, params?: MediaListParams): Promise<MediaAsset[]> => {
    const response = await api.get<{ items: MediaAsset[]; totalCount: number; page: number; pageSize: number }>(
      `workspaces/${workspaceId}/media`, { params }
    );
    // Backend wraps the list in { items, totalCount, page, pageSize }
    return response.data.items ?? (response.data as any) ?? [];
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

  confirmUpload: async (workspaceId: string, assetId: string): Promise<UploadResult> => {
    const response = await api.post<any>(
      `workspaces/${workspaceId}/media/confirm`,
      { assetId }
    );
    const d = response.data;
    return { id: d.id, publicUrl: d.fileUrl ?? d.publicUrl ?? '', fileName: d.fileName ?? d.filename ?? '', mimeType: d.mimeType ?? d.contentType ?? '', sizeBytes: d.sizeBytes ?? 0 };
  },

  /**
   * Upload a file directly to the backend (which stores it in Wasabi).
   * Returns a normalised UploadResult with a guaranteed publicUrl string.
   */
  uploadMedia: async (workspaceId: string, file: File, onProgress?: (percent: number) => void): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<any>(
      `workspaces/${workspaceId}/media/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          if (onProgress) {
            const percent = Math.round((event.loaded * 100) / (event.total ?? 1));
            onProgress(percent);
          }
        }
      }
    );
    // Backend returns MediaDto: { id, fileName, fileUrl, mimeType, sizeBytes, ... }
    const d = response.data;
    const publicUrl: string = d.fileUrl ?? d.publicUrl ?? d.url ?? '';
    if (!publicUrl) {
      console.error('uploadMedia: backend response missing URL field', d);
      throw new Error(`Upload succeeded but backend returned no URL for "${file.name}". Check backend MediaDto.`);
    }
    return {
      id: d.id ?? '',
      publicUrl,
      fileName: d.fileName ?? d.filename ?? file.name,
      mimeType: d.mimeType ?? d.contentType ?? file.type,
      sizeBytes: d.sizeBytes ?? file.size,
    };
  },
};

