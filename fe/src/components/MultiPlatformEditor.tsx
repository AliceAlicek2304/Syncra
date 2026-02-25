import { useState } from 'react'
import { X, RefreshCw, Smartphone, Globe, AlertCircle, Check, Calendar, Clock } from 'lucide-react'
import styles from './MultiPlatformEditor.module.css'

interface PlatformContent {
  caption: string
  hashtags: string[]
}

interface MultiPlatformEditorProps {
  initialContent: {
    hook: string
    caption: string
    hashtags: string[]
  }
  platforms: string[]
  onClose: () => void
  onSave: (contents: Record<string, PlatformContent>) => void
}

const PLATFORM_LIMITS: Record<string, number> = {
  TikTok: 4000,
  Instagram: 2200,
  YouTube: 5000,
  X: 280,
  LinkedIn: 3000,
  Facebook: 63206,
}

export default function MultiPlatformEditor({ initialContent, platforms, onClose, onSave }: MultiPlatformEditorProps) {
  const [activeTab, setActiveTab] = useState(platforms ? platforms[0] : '')
  const [contents, setContents] = useState<Record<string, PlatformContent>>(() => {
    const initial: Record<string, PlatformContent> = {}
    if (platforms) {
      platforms.forEach(p => {
        initial[p] = {
          caption: initialContent?.caption || '',
          hashtags: initialContent?.hashtags ? [...initialContent.hashtags] : []
        }
      })
    }
    return initial
  })
  const [isSaving, setIsSaving] = useState(false)
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduledTime, setScheduledTime] = useState('10:00')

  if (!platforms || platforms.length === 0) return null

  const handleCaptionChange = (platform: string, newCaption: string) => {
    setContents(prev => ({
      ...prev,
      [platform]: { ...prev[platform], caption: newCaption }
    }))
  }

  const syncFromMaster = (platform: string) => {
    setContents(prev => ({
      ...prev,
      [platform]: {
        caption: initialContent.caption,
        hashtags: [...initialContent.hashtags]
      }
    }))
  }

  const handleSave = () => {
    if (isSaving) return
    setIsSaving(true)
    // Giả lập lưu dữ liệu
    setTimeout(() => {
      onSave(contents)
      // Chú ý: onSave trong AIAssistantPage sẽ gọi setEditingIdea(null) để đóng modal
    }, 1000)
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
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
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
                {currentContent.hashtags.map((h, idx) => (
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
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <><RefreshCw size={14} className={styles.spin} /> Đang lưu...</>
              ) : (
                <><Check size={14} /> Lưu vào Calendar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
