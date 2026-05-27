import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Upload, FileText, Trash2, Search, Image } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useToast } from '../../context/ToastContext'
import { mediaApi } from '../../api/media'
import type { MediaAsset } from '../../api/media'
import Skeleton from '../../components/Skeleton'
import { WidgetErrorFallback } from '../../components/WidgetErrorFallback'
import styles from './MediaLibraryPage.module.css'

type MediaType = 'all' | 'image' | 'video' | 'document'

const TYPE_FILTERS: { value: MediaType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'document', label: 'Documents' },
]

// ─── Media Card ─────────────────────────────────────────────────────────────
interface MediaCardProps {
  asset: MediaAsset
  onDelete: (id: string) => void
  uploadProgress?: number
}

function MediaCard({ asset, onDelete, uploadProgress }: MediaCardProps) {
  const isImage = asset.mimeType.startsWith('image/')
  const isUploading = uploadProgress !== undefined && uploadProgress < 100

  return (
    <div className={`glass-card ${styles.mediaCard}`}>
      {isImage ? (
        <img src={asset.fileUrl} alt={asset.fileName} className={styles.cardImage} />
      ) : (
        <div className={styles.cardDocIcon}>
          <FileText size={36} />
        </div>
      )}

      {/* Upload progress bar (D-10) */}
      {isUploading && (
        <div className={styles.progressBarWrap}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Hover overlay */}
      <div className={styles.cardOverlay}>
        <p className={styles.cardFilename}>{asset.fileName}</p>
        <p className={styles.cardSize}>
          {(asset.sizeBytes / 1024).toFixed(0)} KB
        </p>
        <button
          className={styles.deleteBtn}
          onClick={() => onDelete(asset.id)}
          title="Delete file"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MediaLibraryPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const queryClient = useQueryClient()
  const { error: toastError, success: toastSuccess } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MediaType>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch media assets (D-12: flat gallery)
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['media', workspaceId, typeFilter, search],
    queryFn: () => mediaApi.getMedia(workspaceId, {
      type: typeFilter === 'all' ? undefined : typeFilter,
      search: search || undefined,
    }),
    enabled: !!workspaceId,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.deleteMedia(workspaceId, mediaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media', workspaceId] }),
    onError: () => toastError('Something went wrong. Please try again.'),
  })

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || !workspaceId) return
    const fileArray = Array.from(files)
    setIsUploading(true)
    
    // Initialize progress for each file to 0
    const initialProgress: Record<string, number> = {}
    fileArray.forEach(file => {
      initialProgress[file.name] = 0
    })
    setUploadProgress(initialProgress)

    await Promise.allSettled(
      fileArray.map(async (file) => {
        try {
          await mediaApi.uploadMedia(workspaceId, file, (percent) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: percent }))
          })
        } catch {
          toastError(`Upload failed for ${file.name}. Check your connection and try again.`)
        }
      })
    )
    
    setIsUploading(false)
    setUploadProgress({})
    toastSuccess('Upload completed.')
    queryClient.invalidateQueries({ queryKey: ['media', workspaceId] })
  }, [workspaceId, queryClient, toastError, toastSuccess])

  const assetList = Array.isArray(assets) ? assets : []
  const isEmpty = !isLoading && assetList.length === 0

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Image size={20} />
          </div>
          <div>
            <h1 className={styles.title}>Media Library</h1>
            <p className={styles.subtitle}>Manage your images, videos, and documents</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Search (D-12) */}
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              id="media-search"
              type="text"
              className={styles.searchInput}
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter chips (D-12) */}
          <div className={styles.filterChips}>
            {TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                className={`${styles.chip} ${typeFilter === f.value ? styles.chipActive : ''}`}
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Upload button */}
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload size={15} />
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className={styles.gallery}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className={styles.mediaCard}>
              <Skeleton height="180px" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className={styles.emptyState}>
          <Upload size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyHeading}>No media yet</h2>
          <p className={styles.emptyBody}>
            Upload images, videos, or documents to use in your posts.
          </p>
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload your first file
          </button>
        </div>
      ) : (
        <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
          <div className={styles.gallery}>
            {assetList.map(asset => (
              <MediaCard
                key={asset.id}
                asset={asset}
                onDelete={(id) => deleteMutation.mutate(id)}
                uploadProgress={uploadProgress[asset.id]}
              />
            ))}
          </div>
        </ErrorBoundary>
      )}
    </div>
  )
}