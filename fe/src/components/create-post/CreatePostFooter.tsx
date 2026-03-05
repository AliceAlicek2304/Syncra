import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

type CreatePostFooterProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export default function CreatePostFooter({ state, actions }: CreatePostFooterProps) {
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
      <button className={styles.draftBtn} onClick={() => actions.handleDraft()}>Save Draft</button>
      <button 
        className={styles.scheduleBtn} 
        onClick={actions.handleSchedule} 
        disabled={state.caption.trim() === '' || state.overLimit}
      >
        {state.scheduleMode ? 'Schedule Post' : 'Publish Now'}
      </button>
    </div>
  )
}