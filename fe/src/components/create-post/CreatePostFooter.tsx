import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostFooterProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostFooter({ state, actions }: CreatePostFooterProps) {
  const isZernioPost = !!state.editPost?.zernioPostId
  const canRetry = state.editPost?.status === 'failed' || state.editPost?.status === 'partial'
  const a = actions as any

  const getPrimaryButtonLabel = () => {
    if (state.isEditMode) {
      return state.publishingTab === 'draft' ? 'Save Changes' : 'Update Schedule'
    }
    if (state.publishingTab === 'draft') return 'save draft'
    if (state.publishingTab === 'now') return 'publish now'
    if (state.publishingTab === 'queue') return 'add to queue'
    return 'schedule post'
  }

  const handlePrimaryAction = () => {
    if (state.publishingTab === 'draft') {
      actions.handleDraft()
    } else {
      actions.handleSchedule()
    }
  }

  const isSubmitDisabled = 
    state.caption.trim() === '' || 
    state.overLimit || 
    (state.publishingTab !== 'draft' &&
     state.socialAccounts && 
     state.socialAccounts.filter((acc: any) => acc.isActive).length > 0 && 
     state.selectedSocialAccountIds.length === 0)

  return (
    <div className={styles.footer}>
      {/* Retrying failed posts / Deleting if applicable */}
      {isZernioPost && canRetry && (
        <button 
          className={styles.retryBtn} 
          onClick={a.retryZernioPost}
          disabled={a.isRetryingZernio}
        >
          {a.isRetryingZernio ? 'Retrying...' : 'Retry Failed'}
        </button>
      )}

      {isZernioPost && (
        <button 
          className={styles.deletePostBtn} 
          onClick={a.deleteZernioPost}
          disabled={a.isDeletingZernio}
        >
          {a.isDeletingZernio ? 'Deleting...' : 'Delete Post'}
        </button>
      )}

      <div className={styles.footerSpacer} />

      <button 
        type="button" 
        className={styles.cancelBtn} 
        onClick={actions.handleAttemptClose}
      >
        cancel
      </button>

      <button 
        type="button" 
        className={styles.submitBtn} 
        onClick={handlePrimaryAction} 
        disabled={isSubmitDisabled}
      >
        {getPrimaryButtonLabel()}
      </button>
    </div>
  )
}