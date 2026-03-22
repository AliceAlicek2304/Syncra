import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostFooterProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostFooter({ state, actions }: CreatePostFooterProps) {
  const isDisabled = state.caption.trim() === '' || state.overLimit || !state.hasIntegration

  const handleDraftClick = async () => {
    await actions.handleDraft()
  }

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
      <button className={styles.draftBtn} onClick={handleDraftClick}>Save Draft</button>
      <button
        className={styles.scheduleBtn}
        onClick={actions.handleSchedule}
        disabled={isDisabled}
        title={!state.hasIntegration ? `Please connect platform first: ${state.missingIntegrationPlatforms?.join(', ')}` : ''}
      >
        {state.scheduleMode ? 'Schedule Post' : 'Publish Now'}
      </button>
    </div>
  )
}