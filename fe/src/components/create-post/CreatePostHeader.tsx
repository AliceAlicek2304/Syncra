import { X, Sparkles, Eye } from 'lucide-react'
import { PLATFORMS, PLATFORM_ICONS, type Platform } from './types'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

const CHIP_CLASS: Record<Platform, string> = {
  TikTok: styles.chipTikTok,
  Instagram: styles.chipIG,
  Facebook: styles.chipFB,
  X: styles.chipX,
}

type CreatePostHeaderProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostHeader({ state, actions }: CreatePostHeaderProps) {
  return (
    <div className={styles.header}>
      <span className={styles.headerTitle}>
        {state.isEditMode ? 'Edit Post' : 'Create Post'}
      </span>

      <div className={styles.platformChips}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            className={`${styles.chip} ${CHIP_CLASS[p.id]} ${state.activePlatforms.includes(p.id) ? styles.chipActive : ''}`}
            onClick={() => actions.togglePlatform(p.id)}
          >
            <span>{PLATFORM_ICONS[p.id]}</span>
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.headerSpacer} />

      <button
        className={`${styles.headerBtn} ${state.showAI ? styles.headerBtnActive : ''}`}
        onClick={() => {
          actions.setShowAI(true)
          actions.setShowPreview(false)
        }}
      >
        <Sparkles size={14} /> AI Assistant
      </button>

      <button
        className={`${styles.headerBtn} ${state.showPreview ? styles.headerBtnActive : ''}`}
        onClick={() => {
          actions.setShowPreview(true)
          actions.setShowAI(false)
        }}
      >
        <Eye size={14} /> Preview
      </button>

      <button className={styles.closeBtn} onClick={actions.handleAttemptClose}>
        <X size={16} />
      </button>
    </div>
  )
}