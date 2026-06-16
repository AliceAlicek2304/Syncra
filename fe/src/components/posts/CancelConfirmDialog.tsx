import { Trash2 } from 'lucide-react'
import type { Post } from '../../api/posts'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import styles from './CancelConfirmDialog.module.css'

interface CancelConfirmDialogProps {
  post: Post
  open: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function CancelConfirmDialog({
  post,
  open,
  onCancel,
  onConfirm,
}: CancelConfirmDialogProps) {
  if (!open) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  const targets = post.platformTargets || []

  return (
    <div className={styles.backdrop} onMouseDown={onCancel}>
      <div
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cancel Scheduled Post Dialog"
      >
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper}>
            <Trash2 size={28} />
          </div>
        </div>

        <h3 className={styles.title}>Cancel Scheduled Post</h3>
        <p className={styles.bodyText}>
          This will cancel the following scheduled platform targets:
        </p>

        <ul className={styles.platformList}>
          {targets.map((target) => (
            <li key={target.id} className={styles.platformItem}>
              <ExtendedPlatformIcon platform={target.platform} size={16} />
              <span className={styles.platformName}>{target.platform}</span>
            </li>
          ))}
        </ul>

        <div className={styles.warning}>
          This action cannot be undone. Content already published is not affected.
        </div>

        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            Yes, Cancel Post
          </button>
          <button className="btn-ghost" onClick={onCancel}>
            Keep Scheduled
          </button>
        </div>
      </div>
    </div>
  )
}
