import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import styles from './DisconnectConfirm.module.css'

interface DisconnectConfirmProps {
  platformName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function DisconnectConfirm({
  platformName,
  onConfirm,
  onCancel,
  isLoading,
}: DisconnectConfirmProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onCancel()
    }
  }

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Disconnect ${platformName}`}
    >
      <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <AlertTriangle size={20} />
        </div>
        <h3 className={styles.title}>Disconnect {platformName}?</h3>
        <p className={styles.message}>
          You will need to re-authorize to post on {platformName} again.
        </p>
        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    </div>
  )
}
