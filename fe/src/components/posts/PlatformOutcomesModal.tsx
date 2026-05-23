import { X, ExternalLink } from 'lucide-react'
import type { Post } from '../../api/posts'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import styles from './PlatformOutcomesModal.module.css'

interface PlatformOutcomesModalProps {
  post: Post
  open: boolean
  onClose: () => void
  onRetry?: () => void
}

export function PlatformOutcomesModal({
  post,
  open,
  onClose,
  onRetry,
}: PlatformOutcomesModalProps) {
  if (!open) return null

  const targets = post.platformTargets || []
  const totalCount = post.zernioTargetCount || targets.length || 0
  const publishedCount = targets.filter(
    (t) => t.status === 'Published'
  ).length
  const failedCount = targets.filter(
    (t) => t.status === 'Failed'
  ).length
  const hasFailed = failedCount > 0

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'Published'
      case 'failed':
        return 'Failed'
      case 'pending':
      default:
        return 'Pending'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return styles.statusPublished
      case 'failed':
        return styles.statusFailed
      case 'pending':
      default:
        return styles.statusPending
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Platform results for ${post.title}`}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Platform Results</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {targets.length === 0 ? (
            <div className={styles.emptyState}>
              No platform targets found for this post.
            </div>
          ) : (
            targets.map((target) => (
              <div key={target.id} className={styles.row}>
                <div className={styles.rowLeft}>
                  <ExtendedPlatformIcon platform={target.platform} size={20} />
                  <span className={styles.platformName}>
                    {target.platform}
                  </span>
                </div>
                <div className={styles.rowRight}>
                  <div className={styles.statusAndLink}>
                    <span className={`${styles.statusChip} ${getStatusClass(target.status)}`}>
                      {getStatusLabel(target.status)}
                    </span>
                    {target.externalPostUrl && (
                      <a
                        href={target.externalPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLink}
                        title="View post on platform"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {target.errorMessage && (
                    <div className={styles.errorMessage} title={target.errorMessage}>
                      {target.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.summaryText}>
            {publishedCount} of {totalCount} platforms published
          </div>
          {hasFailed && onRetry && (
            <button className="btn-primary" onClick={onRetry}>
              Retry failed platforms
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
