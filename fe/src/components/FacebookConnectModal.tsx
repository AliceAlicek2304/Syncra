import { X, Facebook, HelpCircle, Building2 } from 'lucide-react'
import styles from './FacebookConnectModal.module.css'

interface FacebookConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function FacebookConnectModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: FacebookConnectModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
  }

  const handleHelpClick = () => {
    window.open('https://www.facebook.com/help', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Facebook size={32} color="#1877f2" />
          </div>
          <h2 className={styles.title}>Connect Facebook Page</h2>
          <p className={styles.subtitle}>
            Connect a Facebook Page to publish posts and manage content for your business or brand
          </p>
        </div>

        <div className={styles.singleOption}>
          <div className={styles.optionIcon}>
            <Building2 size={32} color="#1877f2" />
          </div>
          <div className={styles.optionText}>
            <span className={styles.optionLabel}>Facebook Page</span>
            <span className={styles.optionDescription}>
              Select a Facebook Page to connect for posting content
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.helpLink}
            onClick={handleHelpClick}
          >
            <HelpCircle size={14} />
            Need Help?
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Connecting...
              </>
            ) : (
              'Connect Page'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
