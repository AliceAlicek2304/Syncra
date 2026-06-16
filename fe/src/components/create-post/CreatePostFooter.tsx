import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostFooterProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostFooter({ state, actions }: CreatePostFooterProps) {
  const getPrimaryButtonLabel = () => {
    if (state.isEditMode) {
      if (state.publishingTab === 'draft') return 'Save Changes'
      const status = state.editPost?.status?.toLowerCase()
      if (status === 'partial' || status === 'failed') {
        return 'Update & Retry'
      }
      return 'Update Schedule'
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
    (state.publishingTab === 'schedule' && !state.scheduleTime) ||
    (state.publishingTab !== 'draft' &&
     state.socialAccounts && 
     state.socialAccounts.filter((acc: any) => acc.isActive).length > 0 && 
     state.selectedSocialAccountIds.length === 0)

  return (
    <div className={styles.footer}>
      <div className={styles.footerSpacer} />

      <button 
        type="button" 
        className={styles.cancelBtn} 
        onClick={actions.handleAttemptClose}
        disabled={state.isSubmitting}
      >
        cancel
      </button>

      <button 
        type="button" 
        className={styles.submitBtn} 
        onClick={handlePrimaryAction} 
        disabled={isSubmitDisabled || state.isSubmitting}
      >
        {state.isSubmitting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <div className={styles.buttonSpinner} />
            <span>saving...</span>
          </div>
        ) : (
          getPrimaryButtonLabel()
        )}
      </button>
    </div>
  )
}