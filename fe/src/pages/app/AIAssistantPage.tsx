import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Sparkles, Send, Clock, TrendingUp, Plus,
  Copy, Check, ChevronDown,
} from 'lucide-react'
import { getMockResults } from '../../data/mockAI'
import type { ContentIdea } from '../../data/mockAI'
import SocialPreviewer from '../../components/SocialPreviewer'
import AIToolbar from '../../components/AIToolbar'
import MultiPlatformEditor from '../../components/MultiPlatformEditor'
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

export default function AIAssistantPage() {
  const [step, setStep] = useState<Step>('form')
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('default')
  const [goal, setGoal] = useState(GOALS[0])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['TikTok', 'Instagram'])
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewIdea, setPreviewIdea] = useState<ContentIdea | null>(null)
  const [previewPlatform, setPreviewPlatform] = useState<string>('TikTok')
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null)
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const location = useLocation()

  useEffect(() => {
    const state = location.state as { repurposedContent?: string }
    if (state?.repurposedContent) {
      const content = state.repurposedContent
      const newIdea: ContentIdea = {
        id: 'repurposed-' + Date.now(),
        type: 'Photo',
        hook: 'Nội dung tái bản từ "Source" của bạn',
        title: 'Tái bản đa kênh',
        caption: content,
        hashtags: ['#repurposed', '#ai', '#technest'],
        platforms: ['LinkedIn', 'X', 'Instagram'],
        bestTime: 'Giờ vàng (Phân tích từ source)',
        estimatedReach: 'Tối ưu cho Platform',
        platformCaptions: {
          LinkedIn: content,
          X: content.substring(0, 280),
          Instagram: content
        }
      }

      // We use a small timeout to move the state updates out of the synchronous effect body
      // This satisfies the 'react-hooks/set-state-in-effect' lint rule which prefers
      // that effects don't immediately trigger a re-render during the commit phase.
      const timer = setTimeout(() => {
        setIdeas([newIdea])
        setPreviewIdea(newIdea)
        setPreviewPlatform('LinkedIn')
        setStep('results')
        setExpandedId(newIdea.id)
        
        // Clean up state after consumption to prevent re-triggering on future renders 
        // if the component re-mounts but the location state persists.
        window.history.replaceState({}, document.title)
      }, 0)

      return () => clearTimeout(timer)
    }
  }, [location])

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
      // Initialize platform-specific captions for each idea
      const enhancedResults = results.map(idea => ({
        ...idea,
        platformCaptions: idea.platforms.reduce((acc, p) => ({ ...acc, [p]: idea.caption }), {} as Record<string, string>)
      }))
      setIdeas(enhancedResults)
      setPreviewIdea(enhancedResults[0])
      setPreviewPlatform(enhancedResults[0].platforms[0])
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

    const currentCaption = idea.platformCaptions?.[previewPlatform] || idea.caption
    const newCaption = currentCaption.substring(0, start) + transformed + currentCaption.substring(end)
    
    const newIdeas = ideas.map(i => {
      if (i.id !== idea.id) return i
      return {
        ...i,
        platformCaptions: {
          ...i.platformCaptions,
          [previewPlatform]: newCaption
        }
      }
    })
    setIdeas(newIdeas)
    if (previewIdea?.id === idea.id) setPreviewIdea(newIdeas.find(i => i.id === idea.id) || null)
  }


  const handleSelectVariation = (ideaId: string, variation: string) => {
    const newIdeas = ideas.map(i => {
      if (i.id !== ideaId) return i
      return {
        ...i,
        platformCaptions: {
          ...i.platformCaptions,
          [previewPlatform]: variation
        }
      }
    })
    setIdeas(newIdeas)
    if (previewIdea?.id === ideaId) {
      setPreviewIdea(newIdeas.find(i => i.id === ideaId) || null)
    }
  }

  const handleAddToCalendar = (idea: ContentIdea) => {
    setEditingIdea(idea)
  }

  const handleFinishMultiEdit = (contents: Record<string, { caption: string; hashtags: string[] }>) => {
    const ideaId = editingIdea?.id
    if (!ideaId) return
    
    console.log('Saved multi-platform content for idea:', ideaId, contents)
    setAddedId(ideaId)
    setEditingIdea(null)
    setTimeout(() => setAddedId(null), 3000)
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
                        {idea.variations && idea.variations.length > 0 && (
                          <div className={styles.variationSection}>
                            <span className={styles.variationLabel}>✨ Bản biến thể (Variations)</span>
                            <div className={styles.variationList}>
                              {idea.variations.map((v, idx) => {
                                const isSelected = (idea.platformCaptions?.[previewPlatform] || idea.caption) === v
                                return (
                                  <button 
                                    key={idx}
                                    className={`${styles.variationBtn} ${isSelected ? styles.variationBtnActive : ''}`}
                                    onClick={() => handleSelectVariation(idea.id, v)}
                                  >
                                    Bản #{idx + 1}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div className={styles.editArea}>
                          <textarea
                            ref={textareaRef}
                            className={styles.captionText}
                            value={idea.platformCaptions?.[previewPlatform] || idea.caption}
                            onChange={(e) => {
                              const newVal = e.target.value
                              const newIdeas = ideas.map(i => {
                                if (i.id !== idea.id) return i
                                return {
                                  ...i,
                                  platformCaptions: {
                                    ...i.platformCaptions,
                                    [previewPlatform]: newVal
                                  }
                                }
                              })
                              setIdeas(newIdeas)
                              if (previewIdea?.id === idea.id) setPreviewIdea(newIdeas.find(i => i.id === idea.id) || null)
                            }}
                            onMouseUp={handleSelection}
                            onKeyUp={handleSelection}
                            rows={6}
                          />
                          <div className={`${styles.charCounter} ${(idea.platformCaptions?.[previewPlatform] || idea.caption).length > (PLATFORM_LIMITS[previewIdea?.id === idea.id ? previewPlatform : idea.platforms[0]] || 2200) ? styles.charOver : ''}`}>
                            {(idea.platformCaptions?.[previewPlatform] || idea.caption).length} / {PLATFORM_LIMITS[previewIdea?.id === idea.id ? previewPlatform : idea.platforms[0]] || '—'}
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
                        {addedId === idea.id
                          ? <><Check size={13} /> Đã thêm!</>
                          : <><Plus size={13} /> Thêm vào Calendar</>}
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
                      caption: previewIdea.platformCaptions?.[previewPlatform] || previewIdea.caption,
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

      {editingIdea && (
        <MultiPlatformEditor
          initialContent={{
            hook: editingIdea.hook,
            caption: editingIdea.platformCaptions?.[previewPlatform] || editingIdea.caption,
            hashtags: editingIdea.hashtags
          }}
          platforms={editingIdea.platforms}
          onClose={() => setEditingIdea(null)}
          onSave={handleFinishMultiEdit}
        />
      )}
    </div>
  )
}