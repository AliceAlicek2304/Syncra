import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import type { PostMediaItem } from '../../api/posts'
import ReusePostModal from '../reuse-post/ReusePostModal'
import { shortId } from '../../utils/shortId'
import styles from '../CreatePostModal.module.css'

type CreatePostHeaderProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostHeader({ state, actions }: CreatePostHeaderProps) {
  const [showReuseModal, setShowReuseModal] = useState(false)

  const handleReuseApply = useCallback((payload: { content?: string; mediaItems?: PostMediaItem[] }) => {
    if (payload.content !== undefined) {
      actions.setMainContent(payload.content)
    }
    if (payload.mediaItems?.length) {
      const mapped = payload.mediaItems.map(m => ({
        id: shortId(),
        url: m.url,
        type: (m.type === 'video' ? 'video' : 'image') as 'image' | 'video',
        name: m.filename || 'media',
        mimeType: m.mimeType,
      }))
      actions.setMedia(mapped)
    }
  }, [actions])

  return (
    <>
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
              onClick={() => setShowReuseModal(true)}
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

      <ReusePostModal
        isOpen={showReuseModal}
        onClose={() => setShowReuseModal(false)}
        onApply={handleReuseApply}
      />
    </>
  )
}