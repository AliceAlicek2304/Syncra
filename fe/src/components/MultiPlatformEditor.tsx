import { useState, useRef, useEffect, useCallback } from 'react'
import { X, RefreshCw, Smartphone, Globe, AlertCircle, Check, Calendar, Clock } from 'lucide-react'
import styles from './MultiPlatformEditor.module.css'
import { useMutation } from '@tanstack/react-query'
import { postsApi } from '../api/posts'
import type { PlatformContent } from '../api/posts'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../context/ToastContext'

interface MultiPlatformEditorProps {
  initialContent: {
    hook: string
    caption: string
    hashtags: string[]
  }
  platforms: string[]
  onClose: () => void
  onSave: (contents: Record<string, PlatformContent>) => void
  postId?: string
}

const PLATFORM_LIMITS: Record<string, number> = {
  TikTok: 4000,
  Instagram: 2200,
  YouTube: 5000,
  X: 280,
  LinkedIn: 3000,
  Facebook: 63206,
}

export default function MultiPlatformEditor({ initialContent, platforms, onClose, onSave, postId }: MultiPlatformEditorProps) {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const { error: toastError } = useToast()

  const [activePostId, setActivePostId] = useState<string | null>(postId ?? null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const [activeTab, setActiveTab] = useState(platforms && platforms.length > 0 ? platforms[0] : '')
  const [contents, setContents] = useState<Record<string, PlatformContent>>(() => {
    const initial: Record<string, PlatformContent> = {}
    if (platforms) {
      platforms.forEach(p => {
        initial[p] = {
          platform: p,
          caption: initialContent?.caption || '',
          hashtags: initialContent?.hashtags ? [...initialContent.hashtags] : []
        }
      })
    }
    return initial
  })
  
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduledTime, setScheduledTime] = useState('10:00')

  const createPostMutation = useMutation({
    mutationFn: () => postsApi.createPost(workspaceId, {
      title: 'Untitled',
      status: 'draft',
      platforms,
    }),
    onSuccess: (post) => setActivePostId(post.id),
    onError: () => toastError('Failed to create draft. Changes may not be saved.'),
  })

  // Create Draft on mount if no postId provided
  useEffect(() => {
    if (!activePostId && workspaceId) {
      createPostMutation.mutate()
    }
  }, [workspaceId, activePostId, createPostMutation])

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  const updatePostMutation = useMutation({
    mutationFn: (data: Parameters<typeof postsApi.updatePost>[2]) =>
      postsApi.updatePost(workspaceId, activePostId!, data),
  })

  const autoSave = useCallback(
    (updatedContents: Record<string, PlatformContent>) => {
      if (!activePostId) return
      setSaveStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          const platformContents = Object.entries(updatedContents).map(([platform, content]) => ({
            platform,
            caption: content.caption,
            hashtags: content.hashtags,
          }))
          await updatePostMutation.mutateAsync({
            platformContents,
            // D-07: do NOT change status here — let existing status remain
          })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('error')
        }
      }, 1500)
    },
    [activePostId, updatePostMutation]
  )

  if (!platforms || platforms.length === 0) return null

  const handleCaptionChange = (platform: string, newCaption: string) => {
    const updated = {
      ...contents,
      [platform]: { ...contents[platform], caption: newCaption }
    }
    setContents(updated)
    autoSave(updated)
  }

  const syncFromMaster = (platform: string) => {
    const updated = {
      ...contents,
      [platform]: {
        ...contents[platform],
        caption: initialContent.caption,
        hashtags: initialContent.hashtags ? [...initialContent.hashtags] : []
      }
    }
    setContents(updated)
    autoSave(updated)
  }

  const handleSave = async () => {
    if (!activePostId || updatePostMutation.isPending) return
    setSaveStatus('saving')
    try {
      const platformContents = Object.entries(contents).map(([platform, content]) => ({
        platform,
        caption: content.caption,
        hashtags: content.hashtags,
      }))
      await updatePostMutation.mutateAsync({
        status: 'draft',
        platformContents,
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      onSave(contents)
    } catch {
      setSaveStatus('error')
      toastError('Something went wrong. Please try again.')
    }
  }

  const handleSchedule = async () => {
    if (!activePostId || updatePostMutation.isPending) return
    const scheduledAtUtc = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
    try {
      const platformContents = Object.entries(contents).map(([platform, content]) => ({
        platform,
        caption: content.caption,
        hashtags: content.hashtags,
      }))
      await updatePostMutation.mutateAsync({
        status: 'scheduled',   // D-07: becomes scheduled, stays editable
        scheduledAtUtc,
        platformContents,
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      onSave(contents)
    } catch {
      setSaveStatus('error')
      toastError('Something went wrong. Please try again.')
    }
  }

  const currentLimit = PLATFORM_LIMITS[activeTab] || 2200
  const currentContent = contents[activeTab]
  const isOverLimit = currentContent.caption.length > currentLimit

  return (
    <div className={styles.overlay} style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div className={`glass-card ${styles.modal}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Globe className={styles.headerIcon} size={20} />
            <div>
              <h3>Unified Multi-Platform Editor</h3>
              <p>Tùy chỉnh nội dung cho từng nền tảng</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {saveStatus !== 'idle' && (
              <div className={styles.saveStatus}>
                <span
                  className={styles.saveStatusDot}
                  data-status={saveStatus}
                />
                <span className={styles.saveStatusText}>
                  {saveStatus === 'saving' ? 'Saving…'
                   : saveStatus === 'saved' ? 'Saved'
                   : 'Save failed'}
                </span>
              </div>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Sidebar Tabs */}
          <div className={styles.sidebar}>
            {platforms.map(p => (
              <button
                key={p}
                className={`${styles.tab} ${activeTab === p ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(p)}
              >
                <span className={styles.tabDot} style={{ 
                  background: contents[p].caption.length > PLATFORM_LIMITS[p] ? '#ef4444' : 'var(--purple-500)' 
                }} />
                {p}
                {contents[p].caption.length > PLATFORM_LIMITS[p] && <AlertCircle size={14} className={styles.errorIcon} />}
              </button>
            ))}
          </div>

          {/* Editor Area */}
          <div className={styles.editorMain}>
            <div className={styles.editorHeader}>
              <div className={styles.platformBadge}>
                <Smartphone size={14} /> {activeTab} Editing
              </div>
              <button className={styles.syncBtn} onClick={() => syncFromMaster(activeTab)}>
                <RefreshCw size={14} /> Đồng bộ từ bản gốc
              </button>
            </div>

            <div className={styles.textareaWrapper}>
              <textarea
                className={`${styles.textarea} ${isOverLimit ? styles.textareaError : ''}`}
                value={currentContent.caption}
                onChange={(e) => handleCaptionChange(activeTab, e.target.value)}
                placeholder={`Nhập caption cho ${activeTab}...`}
              />
              <div className={`${styles.charCounter} ${isOverLimit ? styles.charOver : ''}`}>
                {currentContent.caption.length} / {currentLimit}
              </div>
            </div>

            <div className={styles.hashtagSection}>
              <label>Hashtags ({activeTab})</label>
              <div className={styles.hashtagList}>
                {currentContent.hashtags && currentContent.hashtags.map((h, idx) => (
                  <span key={idx} className={styles.hashtag}>{h}</span>
                ))}
                <button className={styles.addHashtag}>+ Add</button>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className={styles.scheduleSection}>
              <label>Lịch đăng bài (Scheduling)</label>
              <div className={styles.scheduleInputs}>
                <div className={styles.inputGroup}>
                  <Calendar size={16} />
                  <input 
                    type="date" 
                    value={scheduledDate} 
                    onChange={(e) => setScheduledDate(e.target.value)} 
                    className={styles.dateInput}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <Clock size={16} />
                  <input 
                    type="time" 
                    value={scheduledTime} 
                    onChange={(e) => setScheduledTime(e.target.value)} 
                    className={styles.timeInput}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <AlertCircle size={16} />
            <span>Xác nhận nội dung trước khi lưu vào Calendar</span>
          </div>
          <div className={styles.actions}>
            <button className="btn-secondary" onClick={onClose}>Hủy</button>
            <button 
              className={`btn-primary ${styles.saveBtn}`} 
              onClick={handleSchedule}
              disabled={updatePostMutation.isPending}
            >
              {updatePostMutation.isPending ? (
                <><RefreshCw size={14} className={styles.spin} /> Đang lưu...</>
              ) : (
                <><Calendar size={14} /> Schedule Post</>
              )}
            </button>
            <button 
              className={`btn-primary ${styles.saveBtn}`} 
              onClick={handleSave}
              disabled={updatePostMutation.isPending}
            >
              {updatePostMutation.isPending ? (
                <><RefreshCw size={14} className={styles.spin} /> Đang lưu...</>
              ) : (
                <><Check size={14} /> Lưu Draft</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
