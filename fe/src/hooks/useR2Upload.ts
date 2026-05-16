import { useState, useCallback } from 'react';
import axios from 'axios'; // plain axios — NOT the shared api instance
import { mediaApi } from '../api/media';

export interface UploadProgress {
  [fileId: string]: number; // 0-100
}

export interface UseR2UploadReturn {
  upload: (file: File, workspaceId: string, fileId?: string) => Promise<string>; // returns assetId
  progress: UploadProgress;
  isUploading: boolean;
  error: string | null;
  resetProgress: () => void;
}

/**
 * Direct-to-R2 upload hook.
 * Flow: presign → PUT to presigned URL (plain axios, no auth headers) → confirm
 * Handles D-09 (presigned URLs), D-10 (contextual progress), D-11 (dedup via backend).
 */
export function useR2Upload(): UseR2UploadReturn {
  const [progress, setProgress] = useState<UploadProgress>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, workspaceId: string, fileId?: string): Promise<string> => {
      const id = fileId ?? `${Date.now()}-${file.name}`;
      setIsUploading(true);
      setError(null);
      setProgress((prev) => ({ ...prev, [id]: 0 }));

      try {
        // Step 1: Get presigned URL from backend
        const presignRes = await mediaApi.presignUpload(workspaceId, {
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        });

        // D-11: Backend may return existing assetId for deduplicated files
        // If backend signals the file already exists (no presignedUrl or empty), skip PUT
        if (!presignRes.presignedUrl) {
          setProgress((prev) => ({ ...prev, [id]: 100 }));
          return presignRes.assetId;
        }

        // Step 2: PUT directly to R2 using PLAIN axios (not the shared api instance)
        // CRITICAL: Do not include Authorization or X-Workspace-Id headers — R2 rejects them
        await axios.put(presignRes.presignedUrl, file, {
          headers: {
            'Content-Type': file.type,
          },
          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / (event.total ?? 1));
            setProgress((prev) => ({ ...prev, [id]: percent }));
          },
        });

        // Step 3: Confirm upload with backend to finalize the MediaAsset record
        await mediaApi.confirmUpload(workspaceId, presignRes.assetId);

        setProgress((prev) => ({ ...prev, [id]: 100 }));
        return presignRes.assetId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        setProgress((prev) => ({ ...prev, [id]: 0 }));
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const resetProgress = useCallback(() => {
    setProgress({});
    setError(null);
  }, []);

  return { upload, progress, isUploading, error, resetProgress };
}
