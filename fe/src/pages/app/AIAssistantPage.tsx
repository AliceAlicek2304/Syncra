import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Send, Clock, TrendingUp, Plus,
  Copy, Check, ChevronDown, X,
} from 'lucide-react'
import { getMockResults } from '../../data/mockAI'
import type { ContentIdea } from '../../data/mockAI'
import SocialPreviewer from '../../components/SocialPreviewer'
import AIToolbar from '../../components/AIToolbar'
import { useCalendar } from '../../context/CalendarContext'
import styles from './AIAssistantPage.module.css'

const PLATFORM_LIMITS: Record<string, number> = {
  TikTok: 4000,
  Instagram: 2200,
  YouTube: 5000,
  X: 280,
  LinkedIn: 3000,
  Facebook: 63206,
}

interface SelectOption { value: string; label: string }
function CustomSelect({ options, value, onChange }: {
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={styles.customSelect}>
      <button
        type="button"
        className={`${styles.customSelectTrigger} ${open ? styles.customSelectOpen : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={14} className={`${styles.customSelectChevron} ${open ? styles.customSelectChevronOpen : ''}`} />
      </button>
      {open && (
        <div className={styles.customSelectDropdown}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`${styles.customSelectOption} ${o.value === value ? styles.customSelectOptionActive : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'X', 'Facebook']
const TONES = [
  { value: 'default', label: 'Balanced' },
  { value: 'casual', label: 'Casual & Fun' },
  { value: 'professional', label: 'Professional' },
]
const GOALS = [
  'Tăng follower',
  'Tăng engagement',
  'Quảng bá sản phẩm',
  'Xây dựng thương hiệu cá nhân',
  'Giáo dục / Chia sẻ kiến thức',
]

type Step = 'form' | 'loading' | 'results'

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: '#8b5cf6',
  Instagram: '#ec4899',
  YouTube: '#ef4444',
  LinkedIn: '#22d3ee',
  X: '#f59e0b',
  Facebook: '#3b82f6',
}

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const { addPost } = useCalendar()
  const [step, setStep] = useState<Step>('form')
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('default')
  const [goal, setGoal] = useState(GOALS[0])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['TikTok', 'Instagram'])
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Add-to-calendar modal
  const [modalIdea, setModalIdea] = useState<ContentIdea | null>(null)
  const [modalDate, setModalDate] = useState('')
  const [modalTime, setModalTime] = useState('')
  const [modalStatus, setModalStatus] = useState<'scheduled' | 'draft'>('scheduled')
  const [previewIdea, setPreviewIdea] = useState<ContentIdea | null>(null)
  const [previewPlatform, setPreviewPlatform] = useState<string>('TikTok')
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleGenerate = () => {
    if (!topic.trim()) return
    setStep('loading')
    setTimeout(() => {
      const results = getMockResults(tone)
      setIdeas(results)
      setPreviewIdea(results[0])
      setPreviewPlatform(results[0].platforms[0])
      setStep('results')
    }, 1800)
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSelection = () => {
    if (!textareaRef.current) return
    const { selectionStart, selectionEnd, value } = textareaRef.current
    const selectedText = value.substring(selectionStart, selectionEnd)

    if (selectedText.trim().length > 0) {
      const rect = textareaRef.current.getBoundingClientRect()
      // Approximate position: center of textarea, slightly above
      setSelection({ text: selectedText, start: selectionStart, end: selectionEnd })
      setToolbarPos({ 
        top: rect.top - 10, 
        left: rect.left + rect.width / 2 
      })
    } else {
      setSelection(null)
    }
  }

  const handleToolbarAction = (transformed: string) => {
    if (!selection || !textareaRef.current) return
    const { start, end } = selection
    const idea = ideas.find(i => i.id === expandedId)
    if (!idea) return

    const newCaption = idea.caption.substring(0, start) + transformed + idea.caption.substring(end)
    const newIdeas = ideas.map(i => i.id === idea.id ? { ...i, caption: newCaption } : i)
    setIdeas(newIdeas)
    if (previewIdea?.id === idea.id) setPreviewIdea({ ...idea, caption: newCaption })
  }

  const handleAddToCalendar = (idea: ContentIdea) => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    setModalDate(
      `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    )
    const timeMatch = idea.bestTime.match(/\d{2}:\d{2}/)
    setModalTime(timeMatch ? timeMatch[0] : '19:00')
    setModalStatus('scheduled')
    setModalIdea(idea)
  }

  const handleModalConfirm = () => {
    if (!modalIdea || !modalDate) return
    const [year, month, day] = modalDate.split('-').map(Number)
    const platform = modalIdea.platforms[0]
    addPost({
      year,
      month: month - 1, // convert to 0-indexed
      day,
      title: modalIdea.hook.slice(0, 50),
      platform,
      status: modalStatus,
      time: modalTime,
      color: PLATFORM_COLORS[platform] ?? '#8b5cf6',
      caption: modalIdea.caption,
      hashtags: modalIdea.hashtags,
    })
    setModalIdea(null)
    navigate('/app/calendar')
  }

  const handleReset = () => {
    setStep('form')
    setIdeas([])
    setTopic('')
  }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className={styles.title}>AI Content Assistant</h1>
            <p className={styles.subtitle}>Nhập chủ đề, nhận ngay ý tưởng + caption cho mọi nền tảng</p>
          </div>
        </div>
        {step === 'results' && (
          <button className="btn-secondary" onClick={handleReset} style={{ fontSize: 13 }}>
            ← Tạo lại
          </button>
        )}
      </div>

      <div className={styles.body}>
        {/* ── FORM ── */}
        {step === 'form' && (
          <div className={styles.formWrap}>
            <div className={`glass-card ${styles.formCard}`}>
              <h2 className={styles.formTitle}>Kể cho AI nghe về nội dung bạn muốn tạo</h2>

              <div className={styles.field}>
                <label className={styles.label}>Chủ đề / Ý tưởng chính <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  placeholder="VD: Tips làm content cho người mới bắt đầu…"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Lĩnh vực / Niche của bạn</label>
                <input
                  className={styles.input}
                  placeholder="VD: Lifestyle, Tech, Food, Fitness, Education…"
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                />
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Tone giọng văn</label>
                  <CustomSelect options={TONES} value={tone} onChange={setTone} />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Mục tiêu</label>
                  <CustomSelect
                    options={GOALS.map(g => ({ value: g, label: g }))}
                    value={goal}
                    onChange={setGoal}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Nền tảng đăng bài</label>
                <div className={styles.platformGrid}>
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      className={`${styles.platformBtn} ${selectedPlatforms.includes(p) ? styles.platformBtnActive : ''}`}
                      onClick={() => togglePlatform(p)}
                      type="button"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={`btn-primary ${styles.generateBtn}`}
                onClick={handleGenerate}
                disabled={!topic.trim()}
              >
                <Sparkles size={16} />
                Tạo ý tưởng ngay
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingCard}>
              <div className={styles.loadingOrb} />
              <div className={styles.loadingIcon}>
                <Sparkles size={32} />
              </div>
              <h2 className={styles.loadingTitle}>AI đang tạo ý tưởng cho bạn…</h2>
              <p className={styles.loadingDesc}>Phân tích chủ đề · Tối ưu cho từng nền tảng · Viết caption</p>
              <div className={styles.loadingDots}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === 'results' && (
          <div className={styles.resultsContainer}>
            <div className={styles.results}>
              <div className={styles.resultsMeta}>
                <span className={styles.resultsCount}>{ideas.length} ý tưởng được tạo</span>
                <span className={styles.resultsTopic}>cho chủ đề "{topic}"</span>
              </div>

              <div className={styles.ideaList}>
                {ideas.map(idea => (
                  <div
                    key={idea.id}
                    className={`glass-card ${styles.ideaCard} ${previewIdea?.id === idea.id ? styles.ideaCardActive : ''}`}
                    onClick={() => {
                      setPreviewIdea(idea)
                      if (!idea.platforms.includes(previewPlatform)) {
                        setPreviewPlatform(idea.platforms[0])
                      }
                    }}
                  >
                    {/* Card header */}
                    <div className={styles.ideaHeader}>
                      <span className={styles.ideaType}>{idea.type}</span>
                      <div className={styles.ideaMeta}>
                        <span className={styles.ideaMetaItem}>
                          <Clock size={12} /> {idea.bestTime}
                        </span>
                        <span className={styles.ideaMetaItem}>
                          <TrendingUp size={12} /> {idea.estimatedReach} reach
                        </span>
                      </div>
                    </div>

                    {/* Hook */}
                    <div className={styles.hookBox}>
                      <span className={styles.hookLabel}>🪝 Hook</span>
                      <p className={styles.hookText}>{idea.hook}</p>
                    </div>

                    {/* Expandable caption */}
                    <button
                      className={styles.captionToggle}
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(expandedId === idea.id ? null : idea.id)
                      }}
                    >
                      <span>Caption đầy đủ</span>
                      <ChevronDown
                        size={14}
                        style={{ transform: expandedId === idea.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                      />
                    </button>

                    {expandedId === idea.id && (
                      <div className={styles.captionBox}>
                        <div className={styles.editArea}>
                          <textarea
                            ref={textareaRef}
                            className={styles.captionText}
                            value={idea.caption}
                            onChange={(e) => {
                              const newIdeas = ideas.map(i => i.id === idea.id ? { ...i, caption: e.target.value } : i)
                              setIdeas(newIdeas)
                              if (previewIdea?.id === idea.id) setPreviewIdea({ ...idea, caption: e.target.value })
                            }}
                            onMouseUp={handleSelection}
                            onKeyUp={handleSelection}
                            rows={6}
                          />
                          <div className={`${styles.charCounter} ${idea.caption.length > (PLATFORM_LIMITS[previewIdea?.id === idea.id ? previewPlatform : idea.platforms[0]] || 2200) ? styles.charOver : ''}`}>
                            {idea.caption.length} / {PLATFORM_LIMITS[previewIdea?.id === idea.id ? previewPlatform : idea.platforms[0]] || '—'}
                          </div>
                        </div>
                        {selection && expandedId === idea.id && (
                          <AIToolbar 
                            selection={selection}
                            position={toolbarPos}
                            onAction={handleToolbarAction}
                            onClose={() => setSelection(null)}
                          />
                        )}
                      </div>
                    )}

                    {/* Hashtags */}
                    <div className={styles.hashtagRow}>
                      {idea.hashtags.map(h => (
                        <span key={h} className={styles.hashtag}>{h}</span>
                      ))}
                    </div>

                    {/* Platforms */}
                    <div className={styles.platformRow}>
                      {idea.platforms.map(p => (
                        <button
                          key={p}
                          className={`${styles.platformTag} ${previewIdea?.id === idea.id && previewPlatform === p ? styles.platformTagActive : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewIdea(idea)
                            setPreviewPlatform(p)
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className={styles.ideaActions}>
                      <button
                        className={styles.copyBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(idea.id, `${idea.hook}\n\n${idea.caption}\n\n${idea.hashtags.join(' ')}`)
                        }}
                      >
                        {copiedId === idea.id ? <><Check size={13} /> Đã copy</> : <><Copy size={13} /> Copy caption</>}
                      </button>
                      <button
                        className={`btn-primary ${styles.addBtn}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCalendar(idea)
                        }}
                      >
                        <Plus size={13} /> Thêm vào Calendar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PREVIEW PANEL ── */}
            <div className={styles.previewPanel}>
              <div className={styles.previewPanelHeader}>
                <h3 className={styles.previewTitle}>Live Preview</h3>
                <p className={styles.previewSubtitle}>Xem trước bài đăng trên giao diện mobile</p>
              </div>
              <div className={styles.previewContent}>
                {previewIdea ? (
                  <SocialPreviewer
                    platform={previewPlatform}
                    type={previewIdea.type}
                    content={{
                      hook: previewIdea.hook,
                      caption: previewIdea.caption,
                      hashtags: previewIdea.hashtags,
                    }}
                  />
                ) : (
                  <div className={styles.previewEmpty}>
                    <div className={styles.previewEmptyIcon}>📱</div>
                    <p>Chọn một ý tưởng để xem trước bài đăng</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD TO CALENDAR MODAL ── */}
      {modalIdea && (
        <div className={styles.modalOverlay} onClick={() => setModalIdea(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📅 Lên lịch đăng bài</h3>
              <button className={styles.modalClose} onClick={() => setModalIdea(null)}>
                <X size={16} />
              </button>
            </div>

            <p className={styles.modalIdeaTitle}>
              "{modalIdea.hook.length > 60 ? modalIdea.hook.slice(0, 60) + '…' : modalIdea.hook}"
            </p>

            <div className={styles.modalFields}>
              <div className={styles.modalRow2}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Ngày đăng</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Giờ đăng</label>
                  <input
                    type="time"
                    className={styles.modalInput}
                    value={modalTime}
                    onChange={e => setModalTime(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Trạng thái</label>
                <div className={styles.modalStatusRow}>
                  {(['scheduled', 'draft'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.modalStatusBtn} ${
                        modalStatus === s ? styles.modalStatusBtnActive : ''
                      }`}
                      onClick={() => setModalStatus(s)}
                    >
                      {s === 'scheduled' ? '📅 Scheduled' : '📝 Draft'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nền tảng</label>
                <div className={styles.modalPlatformRow}>
                  {modalIdea.platforms.map(p => (
                    <span
                      key={p}
                      className={styles.modalPlatformTag}
                      style={{ background: PLATFORM_COLORS[p] + '22', borderColor: PLATFORM_COLORS[p] + '55', color: PLATFORM_COLORS[p] }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setModalIdea(null)}>
                Huỷ
              </button>
              <button
                className="btn-primary"
                onClick={handleModalConfirm}
                disabled={!modalDate || !modalTime}
              >
                <Check size={14} /> Xác nhận & Xem Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
