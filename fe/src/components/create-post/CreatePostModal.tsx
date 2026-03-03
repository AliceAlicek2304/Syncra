import React from 'react'
import { ImageIcon, X } from 'lucide-react'
import { useCreatePostState } from './useCreatePostState'
import CreatePostHeader from './CreatePostHeader'
import CreatePostEditor, { ImageEditorPanel } from './CreatePostEditor'
import { PlatformTabs, ScheduleRow, RightPanel } from './CreatePostSidebar'
import CreatePostFooter from './CreatePostFooter'
import type { CreatePostModalProps } from './types'
import styles from '../CreatePostModal.module.css'

export default function CreatePostModal(props: CreatePostModalProps) {
  const hookData = useCreatePostState(props)
  const { state, actions } = hookData

  if (!props.isOpen) return null

  return (
    <div
      className={styles.backdrop}
      onMouseDown={e => {
        if (e.target !== e.currentTarget) return
        if (state.editingId) {
          actions.setEditingId(null)
          return
        }
        actions.handleAttemptClose()
      }}
    >
      <div className={styles.dialog}>
        
        {/* Unsaved Changes Dialog */}
        {state.showUnsavedDialog && (
          <div className={styles.editorBackdrop} style={{ zIndex: 10000 }}>
            <div className={`glass-card ${styles.editorModal}`} style={{ maxWidth: 360, padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Unsaved Changes</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  You have unsaved changes. Do you want to save this draft before closing?
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  className="btn-secondary" 
                  style={{ fontSize: 13, padding: '8px 16px', flex: 1 }}
                  onClick={() => actions.setShowUnsavedDialog(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ fontSize: 13, padding: '8px 16px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', flex: 1 }}
                  onClick={() => {
                    actions.setShowUnsavedDialog(false)
                    localStorage.removeItem('technest_draft')
                    actions.reset()
                    props.onClose()
                  }}
                >
                  Discard
                </button>
                <button 
                  className="btn-primary" 
                  style={{ fontSize: 13, padding: '8px 16px', flex: 1 }}
                  onClick={() => {
                    if (actions.handleDraft()) {
                      actions.setShowUnsavedDialog(false)
                      actions.reset()
                      props.onClose()
                    }
                  }}
                >
                  Save Draft
                </button>
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

        <CreatePostHeader state={state} actions={actions} />

        <div className={styles.body}>
          <div className={styles.composer}>
            {!state.hasPlatforms ? (
              <div className={styles.composerEmpty}>
                <div className={styles.previewEmptyIcon}>
                  <ImageIcon size={28} style={{ color: 'var(--text-muted)' }} />
                </div>
                <span className={styles.previewEmptyText}>
                  Select a channel above to start creating your post
                </span>
              </div>
            ) : (
              <>
                {state.activePlatforms.length > 1 && <PlatformTabs state={state} actions={actions} />}
                <CreatePostEditor state={state} actions={actions} />
                <ScheduleRow state={state} actions={actions} />
                <CreatePostFooter state={state} actions={actions} />
              </>
            )}
          </div>

          <RightPanel state={state} actions={actions} />
        </div>
      </div>
    </div>
  )
}