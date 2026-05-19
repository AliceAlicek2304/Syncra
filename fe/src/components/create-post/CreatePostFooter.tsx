import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostFooterProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostFooter({ state, actions }: CreatePostFooterProps) {
  const isDisabled = state.caption.trim() === '' || state.overLimit

  const handleDraftClick = async () => {
    await actions.handleDraft()
  }

  return (
    <div className={styles.footer}>
      {state.subscription && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} style={{ color: '#10b981' }} />
          Quota: {state.subscription.currentScheduledPostsThisMonth}/{state.subscription.maxScheduledPostsPerMonth} posts
          <span style={{ opacity: 0.5 }}>•</span>
          Plan: {state.subscription.planName}
        </div>
      )}
      <label className={styles.createAnotherLabel}>
        <input
          type="checkbox"
          checked={state.createAnother}
          onChange={e => actions.setCreateAnother(e.target.checked)}
        />
        Create Another
      </label>
      <div className={styles.footerSpacer} />
      {state.isEditMode && (
        <button 
          className={styles.draftBtn} 
          style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
          onClick={actions.handleDelete}
        >
          Delete Post
        </button>
      )}
      <button className={styles.draftBtn} onClick={handleDraftClick}>Save Draft</button>
      <button
        className={styles.scheduleBtn}
        onClick={actions.handleSchedule}
        disabled={isDisabled}
        title={state.overLimit ? 'Caption over limit' : (state.caption.trim() === '' ? 'Enter caption' : (!state.hasIntegration ? 'Plan only: Account not connected' : ''))}
        style={{
          opacity: isDisabled ? 0.5 : 1,
          background: !state.hasIntegration && !isDisabled ? 'rgba(255, 255, 255, 0.05)' : undefined,
          border: !state.hasIntegration && !isDisabled ? '1px solid rgba(255, 255, 255, 0.1)' : undefined,
          color: !state.hasIntegration && !isDisabled ? 'var(--text-secondary)' : undefined,
          boxShadow: !state.hasIntegration && !isDisabled ? 'none' : undefined
        }}
      >
        {!state.hasIntegration && !isDisabled ? 'Save as Plan' : (state.scheduleMode ? 'Schedule Post' : 'Publish Now')}
      </button>
    </div>
  )
}