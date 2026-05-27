import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreatePostState } from './useCreatePostState'
import CreatePostHeader from './CreatePostHeader'
import CreatePostEditor, { ImageEditorPanel } from './CreatePostEditor'
import { RightPanel } from './CreatePostSidebar'
import CreatePostFooter from './CreatePostFooter'
import type { CreatePostModalProps } from './types'
import styles from '../CreatePostModal.module.css'

export default function CreatePostModal(props: CreatePostModalProps) {
  const hookData = useCreatePostState(props)
  const { state, actions } = hookData

  return (
    <AnimatePresence>
      {props.isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={e => {
            if (e.target !== e.currentTarget) return
            if (state.editingId) {
              actions.setEditingId(null)
              return
            }
            actions.handleAttemptClose()
          }}
        >
          <motion.div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >

            {/* Unsaved Changes Dialog */}
            {state.showUnsavedDialog && (
              <div className={styles.editorBackdrop} style={{ zIndex: 10000 }}>
                <div className={styles.editorModal} style={{ maxWidth: 360, padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--clr-canvas)', borderRadius: '12px', border: '1px solid var(--clr-border)' }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-ink)', marginBottom: 8, fontFamily: 'var(--font-body)' }}>Unsaved Changes</h3>
                    <p style={{ fontSize: 14, color: 'var(--clr-body)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                      You have unsaved changes. Do you want to save this draft before closing?
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      className={styles.cancelBtn}
                      style={{ fontSize: 13, padding: '8px 16px', flex: 1, borderRadius: '8px', textTransform: 'none' }}
                      onClick={() => actions.setShowUnsavedDialog(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.cancelBtn}
                      style={{ fontSize: 13, padding: '8px 16px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', flex: 1, borderRadius: '8px', textTransform: 'none', background: 'transparent' }}
                      onClick={() => {
                        actions.setShowUnsavedDialog(false)
                        localStorage.removeItem('syncra_draft')
                        actions.reset()
                        props.onClose()
                      }}
                    >
                      Discard
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      className={styles.submitBtn}
                      style={{ fontSize: 13, padding: '8px 16px', flex: 1, borderRadius: '8px', textTransform: 'none' }}
                      onClick={async () => {
                        const success = await actions.handleDraft()
                        if (success) {
                          actions.setShowUnsavedDialog(false)
                        }
                      }}
                    >
                      Save Draft
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Publish/Schedule Confirmation Dialog */}
            {state.showPublishConfirmDialog && (
              <div className={styles.editorBackdrop} style={{ zIndex: 10000 }}>
                <div className={styles.editorModal} style={{ maxWidth: 400, padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--clr-canvas)', borderRadius: '12px', border: '1px solid var(--clr-border)' }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-ink)', marginBottom: 8, fontFamily: 'var(--font-body)' }}>
                      {state.scheduleMode ? 'Schedule Post' : 'Publish Post'}
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--clr-body)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                      {state.scheduleMode
                        ? `Your post will be scheduled for ${state.scheduleTime ? new Date(state.scheduleTime).toLocaleDateString() : 'today'}. Are you sure?`
                        : 'Your post will be published immediately. Are you sure?'
                      }
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      className={styles.cancelBtn}
                      style={{ fontSize: 13, padding: '8px 16px', flex: 1, borderRadius: '8px', textTransform: 'none' }}
                      onClick={() => actions.setShowPublishConfirmDialog(false)}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      className={styles.submitBtn}
                      style={{ fontSize: 13, padding: '8px 16px', flex: 1, borderRadius: '8px', textTransform: 'none' }}
                      onClick={() => actions.confirmSchedule()}
                    >
                      {state.scheduleMode ? 'Schedule' : 'Publish'}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Image Editor Overlay */}
            {state.editingId && (() => {
              const item = state.media.find(m => m.id === state.editingId)
              if (!item || item.type !== 'image') return null
              return (
                <div className={styles.editorBackdrop} onMouseDown={() => actions.setEditingId(null)}>
                  <div
                    className={styles.editorModal}
                    onMouseDown={e => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Edit Image"
                  >
                    <div className={styles.editorModalHeader}>
                      <div className={styles.editorModalTitle}>Edit Image</div>
                      <button
                        type="button"
                        className={styles.editorModalClose}
                        onClick={() => actions.setEditingId(null)}
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className={styles.editorModalBody}>
                      <ImageEditorPanel
                        src={item.url}
                        onSave={actions.handleEditorSave}
                        onCancel={() => actions.setEditingId(null)}
                      />
                    </div>
                  </div>
                </div>
              )
            })()}

            <CreatePostHeader state={state} refs={hookData.refs} actions={actions} />

            <div className={styles.body}>
              <div className={styles.composer}>
                <CreatePostEditor state={state} refs={hookData.refs} actions={actions} />
              </div>

              <RightPanel state={state} refs={hookData.refs} actions={actions} />
            </div>

            <CreatePostFooter state={state} refs={hookData.refs} actions={actions} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
