import { useState } from 'react'
import { Sparkles, X, Check, ChevronRight, ChevronDown } from 'lucide-react'
import { getMockResults } from '../data/mockAI'
import type { ContentIdea, AIGenerateInput } from '../data/mockAI'
import { shortId } from '../utils/shortId'
import styles from './AIIdeaGenerator.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface GeneratedIdea {
    id: string
    title: string
    description: string
}

interface Props {
    onSelectIdea: (idea: GeneratedIdea) => void
    onClose: () => void
    presetResults?: ContentIdea[]
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TONES = [
    { value: 'default', label: 'Balanced' },
    { value: 'casual', label: 'Casual' },
    { value: 'professional', label: 'Pro' },
]

const GOALS = [
    { value: 'engagement', label: 'Engagement' },
    { value: 'followers', label: 'Followers' },
    { value: 'awareness', label: 'Awareness' },
    { value: 'sales', label: 'Sales' },
]

type Step = 'form' | 'loading' | 'results'

// ─── Component ───────────────────────────────────────────────────────────────
export default function AIIdeaGenerator({ onSelectIdea, onClose, presetResults }: Props) {
    const [step, setStep] = useState<Step>(presetResults ? 'results' : 'form')
    const [topic, setTopic] = useState('')
    const [niche, setNiche] = useState('')
    const [audience, setAudience] = useState('')
    const [goal, setGoal] = useState('')
    const [tone, setTone] = useState('default')
    const [results, setResults] = useState<ContentIdea[]>(presetResults || [])
    const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([])
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleGenerate = () => {
        if (!topic.trim()) return
        setStep('loading')
        setSelectedIdeaIds([])
        const input: AIGenerateInput = { topic, niche, audience, goal, tone }
        setTimeout(() => {
            setResults(getMockResults(input))
            setStep('results')
        }, 1600)
    }

    const toggleSelect = (idea: ContentIdea) => {
        setSelectedIdeaIds(prev =>
            prev.includes(idea.id)
                ? prev.filter(id => id !== idea.id)
                : [...prev, idea.id]
        )
    }

    const handleBulkAdd = () => {
        // If it's a preset result (e.g. from AI Coach), we join them into a single blob to feed the post editor.
        if (presetResults && selectedIdeaIds.length > 0) {
            const combinedContent = selectedIdeaIds.map(id => {
                const r = results.find(x => x.id === id)
                return r ? `[${r.title}]\n${r.hook}\n\n${r.caption}` : ''
            }).join('\n\n---\n\n')
            
            onSelectIdea({
                id: 'combined-' + Date.now(),
                title: 'Combined Ideas',
                description: combinedContent,
            })
            return
        }

        // For default mode (adding separated cards to Ideas board)
        selectedIdeaIds.forEach(id => {
            const idea = results.find(r => r.id === id)
            if (idea) {
                onSelectIdea({
                    id: idea.id + '-' + Date.now() + '-' + Math.random(),
                    title: idea.title,
                    description: idea.hook,
                })
            }
        })
        setSelectedIdeaIds([])
    }

    const handleReset = () => {
        if (presetResults) {
            onClose()
            return
        }
        setStep('form')
        setResults([])
        setSelectedIdeaIds([])
        setTopic('')
        setNiche('')
        setAudience('')
        setGoal('')
        setTone('default')
        setShowAdvanced(false)
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <Sparkles size={18} className={styles.modalTitleIcon} />
                        <span>{presetResults ? 'Trending Ideas' : 'Generate with AI'}</span>
                    </div>
                    <div className={styles.modalHeaderActions}>
                        {step === 'results' && !presetResults && (
                            <button className={styles.resetBtn} onClick={handleReset}>
                                ← Tạo lại
                            </button>
                        )}
                        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={styles.modalBody}>
                    {/* ── FORM ── */}
                    {step === 'form' && (
                        <div className={styles.formWrap}>
                            <p className={styles.formSubtitle}>What do you want to create?</p>

                            <textarea
                                className={styles.textarea}
                                placeholder="Describe your content idea…"
                                value={topic}
                                rows={2}
                                autoFocus
                                onChange={e => setTopic(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
                                }}
                            />

                            <div className={styles.chipSection}>
                                <span className={styles.chipLabel}>Tone</span>
                                <div className={styles.chipRow}>
                                    {TONES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            className={tone === t.value ? styles.chipActive : styles.chip}
                                            onClick={() => setTone(t.value)}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.chipSection}>
                                <span className={styles.chipLabel}>Goal</span>
                                <div className={styles.chipRow}>
                                    {GOALS.map(g => (
                                        <button
                                            key={g.value}
                                            type="button"
                                            className={goal === g.value ? styles.chipActive : styles.chip}
                                            onClick={() => setGoal(prev => prev === g.value ? '' : g.value)}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                className={styles.advancedToggle}
                                onClick={() => setShowAdvanced(v => !v)}
                            >
                                {showAdvanced
                                    ? <><ChevronDown size={12} /> Advanced</>
                                    : <><ChevronRight size={12} /> Advanced</>
                                }
                            </button>

                            {showAdvanced && (
                                <div className={styles.advancedRow}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Niche (e.g. Fitness, Tech…)"
                                        value={niche}
                                        onChange={e => setNiche(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Audience (e.g. Gen Z, Founders…)"
                                        value={audience}
                                        onChange={e => setAudience(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className={styles.formFooter}>
                                <span className={styles.formHint}>
                                    {topic.trim() ? '' : 'Type a topic above to get started'}
                                </span>
                                <button
                                    className={styles.generateIconBtn}
                                    onClick={handleGenerate}
                                    disabled={!topic.trim()}
                                    title="Generate (Ctrl+Enter)"
                                >
                                    <Sparkles size={14} />
                                    <span>Generate</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── LOADING ── */}
                    {step === 'loading' && (
                        <div className={styles.loadingWrap}>
                            <div className={styles.loadingOrb} />
                            <div className={styles.loadingIcon}>
                                <Sparkles size={28} />
                            </div>
                            <h3 className={styles.loadingTitle}>AI đang tạo ý tưởng…</h3>
                            <p className={styles.loadingDesc}>Phân tích chủ đề · Tối ưu nội dung</p>
                            <div className={styles.loadingDots}>
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    {/* ── RESULTS ── */}
                    {step === 'results' && (
                        <>
                            <div className={styles.resultsList}>
                                <p className={styles.resultsHint}>
                                    Chọn các ý tưởng để {presetResults ? <strong>Tạo bài viết mới</strong> : <strong>thêm vào cột Unassigned</strong>}
                                </p>
                                {results.map(idea => {
                                    const isSelected = selectedIdeaIds.includes(idea.id)
                                    return (
                                        <div
                                            key={idea.id}
                                            className={`glass-card ${styles.resultCard} ${isSelected ? styles.resultCardSelected : ''}`}
                                            onClick={() => toggleSelect(idea)}
                                        >
                                            <div className={styles.resultCardTop}>
                                                <span className={styles.resultType}>{idea.type}</span>
                                                <span className={styles.resultPlatforms}>{idea.platforms.join(' · ')}</span>
                                            </div>
                                            <h3 className={styles.resultTitle}>{idea.title}</h3>
                                            <p className={styles.resultHook}>{idea.hook}</p>
                                            <button
                                                className={`${styles.selectBtn} ${isSelected ? styles.selectBtnSelected : ''}`}
                                                onClick={e => { e.stopPropagation(); toggleSelect(idea) }}
                                            >
                                                {isSelected
                                                    ? <><Check size={13} /> Đã chọn</>
                                                    : '+ Chọn'
                                                }
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className={styles.bulkFooter}>
                                <span className={styles.bulkCount}>
                                    {selectedIdeaIds.length > 0
                                        ? `Đã chọn ${selectedIdeaIds.length} ý tưởng`
                                        : 'Chưa chọn ý tưởng nào'
                                    }
                                </span>
                                <button
                                    className={`btn-primary ${styles.bulkAddBtn}`}
                                    onClick={handleBulkAdd}
                                    disabled={selectedIdeaIds.length === 0}
                                >
                                    {presetResults ? 'Tạo bài ngay' : 'Thêm vào board'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}