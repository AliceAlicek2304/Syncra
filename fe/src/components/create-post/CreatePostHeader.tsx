import { X } from 'lucide-react'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostHeaderProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostHeader({ state, actions }: CreatePostHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h2 className={styles.headerTitle}>
          {state.isEditMode 
            ? (state.editPost?.status === 'scheduled' ? 'Edit Scheduled Post' : state.editPost?.status === 'draft' ? 'Edit Draft' : 'Edit Post') 
            : 'Create Post'}
        </h2>
        <p className={styles.headerSubtitle}>
          {state.isEditMode ? 'edit & update content' : 'create & publish content'}
        </p>
      </div>

      <div className={styles.headerSpacer} />

      <div className={styles.headerRight}>
        {!state.isEditMode && (
          <button 
            type="button" 
            className={styles.reuseBtn} 
            onClick={actions.reuseLastPost}
          >
            Reuse
          </button>
        )}
        <button 
          type="button" 
          className={styles.closeBtn} 
          onClick={actions.handleAttemptClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}