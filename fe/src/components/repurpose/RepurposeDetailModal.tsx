import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check, Copy, Sparkles, Linkedin, Instagram, Mail, Facebook, Plus, Smile, Hash, Send, BookOpen, Loader2 } from 'lucide-react'
import type { RepurposeAtom, MediaFile } from '../../types/ai'
import { shortId } from '../../utils/shortId'
import { api } from '../../api/axios'
import { useWorkspace } from '../../context/WorkspaceContext'
import styles from './RepurposeDetailModal.module.css'

interface Props {
  atom: RepurposeAtom | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<RepurposeAtom>) => void
  onCreatePost?: (content: string, title: string) => void
}

const PLATFORM_ICONS: Record<string, any> = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  Facebook: Facebook,
  Newsletter: Mail,
}

const COMMON_EMOJIS = ['😊', '🔥', '💡', '🚀', '✅', '💬', '👇', '❤️', '🎯', '💪', '📊', '🌟', '😂', '👏', '🙌', '💼', '🎉', '✨', '📱', '💰']

export default function RepurposeDetailModal({ atom, isOpen, onClose, onSave, onCreatePost }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<MediaFile[]>([])
  const [copied, setCopied] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const { activeWorkspace } = useWorkspace()

  useEffect(() => {
    if (atom) {
      setTitle(atom.title || '')
      setContent(atom.content)
      setMedia(atom.media || [])
      setSaveSuccess(false)
    }
  }, [atom])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newMedia: MediaFile[] = Array.from(files).map(file => ({
      id: shortId(),
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      name: file.name
    }))
    setMedia(prev => [...prev, ...newMedia])
  }, [])

  if (!isOpen || !atom) return null

  const Icon = PLATFORM_ICONS[atom.platform] || Sparkles
  const platformColor = atom.platform === 'Facebook' ? '#1877F2'
    : atom.platform === 'LinkedIn' ? '#60a5fa'
    : atom.platform === 'Instagram' ? '#f472b6' : '#fbbf24'

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id)
      if (item && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
      return prev.filter(m => m.id !== id)
    })
  }

  // Save edits back to the card (local state)
  const handleLocalSave = () => {
    onSave(atom.id, { title, content, media })
  }

  // Save as Idea (unassigned) via API
  const handleSaveAsIdea = async () => {
    if (!activeWorkspace) return
    setSaving(true)
    try {
      const ideaTitle = title.trim() || atom.type + ' – ' + atom.platform
      const ideaDesc = content.trim()
      await api.post(`/workspaces/${activeWorkspace.id}/ideas`, {
        title: ideaTitle,
        description: ideaDesc,
        status: 'Draft',   // maps to 'unassigned' board column
      })
      // Also update local atom
      handleLocalSave()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save idea', err)
    } finally {
      setSaving(false)
    }
  }

  // Open CreatePost modal with current content pre-filled
  const handleCreatePost = () => {
    handleLocalSave()
    if (onCreatePost) {
      const fullContent = title.trim()
        ? `${title.trim()}\n\n${content}`
        : content
      onCreatePost(fullContent, title.trim())
    }
    onClose()
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    if (!el) { setContent(c => c + text); return }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + text.length; el.focus() }, 0)
  }

  return (
    <div className={styles.backdrop} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.platformIcon} style={{ background: platformColor }}>
            <Icon size={16} />
          </div>
          <span className={styles.headerTitle}>Chi tiết nội dung</span>
          <span className={styles.headerMeta}> — {atom.platform} · {atom.type}</span>
          <div className={styles.headerSpacer} />
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Title */}
          {atom.title !== undefined && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Tiêu đề</label>
              <input
                className={styles.titleInput}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề cho bài viết..."
              />
            </div>
          )}

          {/* Content */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nội dung</label>
            <textarea
              ref={textareaRef}
              className={styles.contentTextarea}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nội dung bài viết..."
            />
          </div>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div ref={emojiRef} style={{ position: 'relative' }}>
              <button className={styles.toolbarBtn} onClick={() => setShowEmoji(v => !v)} title="Emoji">
                <Smile size={17} />
              </button>
              {showEmoji && (
                <div className={styles.emojiPopover}>
                  {COMMON_EMOJIS.map(e => (
                    <button key={e} className={styles.emojiBtn} onClick={() => { insertAtCursor(e); setShowEmoji(false) }}>{e}</button>
                  ))}
                </div>
              )}
            </div>
            <button className={styles.toolbarBtn} title="Hashtag" onClick={() => insertAtCursor(' #')}>
              <Hash size={17} />
            </button>
            <div className={styles.toolbarSpacer} />
            <span className={styles.charCount}>{content.length} ký tự</span>
          </div>

          {/* Media */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Hình ảnh / Video</label>
            {media.length === 0 ? (
              <div
                className={`${styles.mediaZone} ${isDragOver ? styles.mediaZoneDragOver : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
              >
                <span className={styles.mediaZoneIcon}>📁</span>
                <p className={styles.mediaZoneText}>Kéo thả hoặc <span>chọn tệp media</span></p>
                <p className={styles.mediaZoneHint}>PNG, JPG, GIF, MP4</p>
              </div>
            ) : (
              <div className={styles.mediaPreviewRow}>
                {media.map(m => (
                  <div key={m.id} className={styles.thumbWrap}>
                    {m.type === 'image'
                      ? <img src={m.url} alt={m.name} className={styles.mediaThumb} />
                      : <div className={styles.mediaThumbVideo}>🎬</div>
                    }
                    <div className={styles.thumbOverlay}>
                      <button className={styles.thumbBtnDelete} onClick={() => removeMedia(m.id)} title="Xóa">
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}
                <button className={styles.addMoreBtn} onClick={() => fileInputRef.current?.click()} title="Thêm tệp">
                  <Plus size={18} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {/* Hashtags */}
          {atom.suggestedHashtags.length > 0 && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Hashtags đề xuất</label>
              <div className={styles.hashtagSection}>
                {atom.suggestedHashtags.map(tag => (
                  <span key={tag} className={styles.hashtagChip}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {/* Copy feedback */}
          {copied && (
            <div className={styles.copyFeedback}>
              <Check size={13} /><span>Đã sao chép!</span>
            </div>
          )}
          {/* Save success feedback */}
          {saveSuccess && (
            <div className={styles.saveFeedback}>
              <Check size={13} /><span>Đã lưu vào Ideas!</span>
            </div>
          )}

          <button className={styles.cancelBtn} onClick={handleCopy}>
            <Copy size={13} style={{ marginRight: 5 }} />Sao chép
          </button>

          <div className={styles.footerSpacer} />

          <button className={styles.cancelBtn} onClick={onClose}>Hủy</button>

          {/* Save to Ideas */}
          <button
            className={styles.saveIdeaBtn}
            onClick={handleSaveAsIdea}
            disabled={saving}
            title="Lưu vào Ideas để chỉnh sửa tiếp"
          >
            {saving ? <Loader2 size={13} className={styles.spinIcon} /> : <BookOpen size={13} />}
            Lưu vào Ideas
          </button>

          {/* Create Post */}
          <button
            className={styles.saveBtn}
            onClick={handleCreatePost}
            title="Đăng bài hoặc lên lịch ngay"
          >
            <Send size={13} />
            Đăng bài
          </button>
        </div>
      </div>
    </div>
  )
}
