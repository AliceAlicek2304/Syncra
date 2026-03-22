import { useState } from 'react'
import { X, Facebook, HelpCircle, Users, Building2 } from 'lucide-react'
import styles from './FacebookConnectModal.module.css'

export type FacebookEntityType = 'page' | 'group'

interface FacebookConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (entityType: FacebookEntityType) => void
  isLoading?: boolean
}

export default function FacebookConnectModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: FacebookConnectModalProps) {
  const [selectedType, setSelectedType] = useState<FacebookEntityType | null>(null)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedType) {
      onConfirm(selectedType)
    }
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
          <h2 className={styles.title}>Connect Facebook</h2>
          <p className={styles.subtitle}>
            Choose what you want to connect for posting content
          </p>
        </div>

        <div className={styles.options}>
          <label className={`${styles.optionCard} ${selectedType === 'page' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="entityType"
              value="page"
              checked={selectedType === 'page'}
              onChange={() => setSelectedType('page')}
              className={styles.radioInput}
            />
            <div className={styles.optionContent}>
              <div className={styles.optionIcon}>
                <Building2 size={24} color="#1877f2" />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>Page</span>
                <span className={styles.optionDescription}>
                  Connect a Facebook Page to publish posts and manage content for your business or brand.
                </span>
              </div>
            </div>
            <div className={styles.checkmark}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="#1877f2" />
                <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </label>

          <label className={`${styles.optionCard} ${selectedType === 'group' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="entityType"
              value="group"
              checked={selectedType === 'group'}
              onChange={() => setSelectedType('group')}
              className={styles.radioInput}
            />
            <div className={styles.optionContent}>
              <div className={styles.optionIcon}>
                <Users size={24} color="#1877f2" />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>Group</span>
                <span className={styles.optionDescription}>
                  Connect a Facebook Group to share content and engage with your community members.
                </span>
              </div>
            </div>
            <div className={styles.checkmark}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="#1877f2" />
                <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </label>
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
            disabled={!selectedType || isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
