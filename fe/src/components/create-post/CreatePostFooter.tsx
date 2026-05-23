import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostFooterProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostFooter({ state, actions }: CreatePostFooterProps) {
  // Add zernio actions to actions type if they don't exist yet but we know they are there.
  const a = actions as any
  const isZernioPost = !!state.editPost?.zernioPostId
  const canRetry = state.editPost?.status === 'failed' || state.editPost?.status === 'partial'

  return (
    <div className={styles.footer}>
      <label className={styles.createAnotherLabel}>
        <input 
          type="checkbox" 
          checked={state.createAnother} 
          onChange={e => actions.setCreateAnother(e.target.checked)} 
        />
        Create Another
      </label>
      <div className={styles.footerSpacer} />

      {isZernioPost && canRetry && (
        <button 
          className="btn-secondary" 
          onClick={a.retryZernioPost}
          disabled={a.isRetryingZernio}
        >
          {a.isRetryingZernio ? 'Retrying...' : 'Retry Failed'}
        </button>
      )}

      {isZernioPost && (
        <button 
          className="btn-secondary" 
          onClick={a.deleteZernioPost}
          style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          disabled={a.isDeletingZernio}
        >
          {a.isDeletingZernio ? 'Deleting...' : 'Delete Post'}
        </button>
      )}

      {!isZernioPost && (!state.socialAccounts || state.socialAccounts.filter((a: any) => a.isActive).length === 0) && (
        <button className={styles.draftBtn} onClick={() => actions.handleDraft()}>Save Draft</button>
      )}
      {!isZernioPost && (
        <button 
          className={styles.scheduleBtn} 
          onClick={actions.handleSchedule} 
          disabled={state.caption.trim() === '' || state.overLimit || (state.socialAccounts && state.socialAccounts.filter((a: any) => a.isActive).length > 0 && state.selectedSocialAccountIds.length === 0)}
        >
          {state.socialAccounts && state.socialAccounts.filter((a: any) => a.isActive).length > 0 && state.selectedSocialAccountIds.length >= 1
            ? (state.scheduleMode 
                ? `Schedule to ${state.selectedSocialAccountIds.length} account${state.selectedSocialAccountIds.length > 1 ? 's' : ''}`
                : `Publish to ${state.selectedSocialAccountIds.length} account${state.selectedSocialAccountIds.length > 1 ? 's' : ''}`)
            : (state.scheduleMode ? 'Schedule Post' : 'Publish Now')}
        </button>
      )}
    </div>
  )
}