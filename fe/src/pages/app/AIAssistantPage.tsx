import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Send, Clock, TrendingUp, Plus,
  Copy, Check, ChevronDown,
} from 'lucide-react'
import { getMockResults } from '../../data/mockAI'
import type { ContentIdea } from '../../data/mockAI'
import styles from './AIAssistantPage.module.css'

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

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleGenerate = () => {
    if (!topic.trim()) return
    setStep('loading')
    setTimeout(() => {
      setIdeas(getMockResults(tone))
      setStep('results')
    }, 1800)
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAddToCalendar = (id: string) => {
    setAddedId(id)
    setTimeout(() => setAddedId(null), 2500)
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
          <div className={styles.results}>
            <div className={styles.resultsMeta}>
              <span className={styles.resultsCount}>{ideas.length} ý tưởng được tạo</span>
              <span className={styles.resultsTopic}>cho chủ đề "{topic}"</span>
            </div>

            <div className={styles.ideaList}>
              {ideas.map(idea => (
                <div key={idea.id} className={`glass-card ${styles.ideaCard}`}>
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
                    onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                  >
                    <span>Caption đầy đủ</span>
                    <ChevronDown
                      size={14}
                      style={{ transform: expandedId === idea.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                    />
                  </button>

                  {expandedId === idea.id && (
                    <div className={styles.captionBox}>
                      <pre className={styles.captionText}>{idea.caption}</pre>
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
                      <span key={p} className={styles.platformTag}>{p}</span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className={styles.ideaActions}>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopy(idea.id, `${idea.hook}\n\n${idea.caption}\n\n${idea.hashtags.join(' ')}`)}
                    >
                      {copiedId === idea.id ? <><Check size={13} /> Đã copy</> : <><Copy size={13} /> Copy caption</>}
                    </button>
                    <button
                      className={`btn-primary ${styles.addBtn}`}
                      onClick={() => handleAddToCalendar(idea.id)}
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
        )}
      </div>
    </div>
  )
}
