import { RotateCcw } from 'lucide-react'
import type { PostPlatformTargetDto } from '../../api/posts'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import styles from './RetryConfirmDialog.module.css'

interface RetryConfirmDialogProps {
  failedTargets: PostPlatformTargetDto[]
  open: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function RetryConfirmDialog({
  failedTargets,
  open,
  onCancel,
  onConfirm,
}: RetryConfirmDialogProps) {
  if (!open) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  const count = failedTargets.length
  const platformWord = count > 1 ? 'Platforms' : 'Platform'

  return (
    <div className={styles.backdrop} onMouseDown={onCancel}>
      <div
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Retry Failed Platforms Dialog"
      >
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper}>
            <RotateCcw size={28} />
          </div>
        </div>

        <h3 className={styles.title}>Retry Failed Platforms</h3>
        <p className={styles.bodyText}>
          These platforms failed and will be retried:
        </p>

        <ul className={styles.platformList}>
          {failedTargets.map((target) => (
            <li key={target.id} className={styles.platformItem}>
              <ExtendedPlatformIcon platform={target.platform} size={16} />
              <span className={styles.platformName}>{target.platform}</span>
            </li>
          ))}
        </ul>

        <div className={styles.caveat}>
          Platforms that already published will not be affected.
        </div>

        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            Retry {count} {platformWord}
          </button>
          <button className="btn-ghost" onClick={onCancel}>
            Keep Post
          </button>
        </div>
      </div>
    </div>
  )
}
