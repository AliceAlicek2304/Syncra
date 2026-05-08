import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, X, Check, ChevronRight, ChevronDown, Upload, FileText, Trash2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { aiApi } from '../api/ai'
import type { GeneratedIdea as ApiGeneratedIdea, AIGenerateRequest } from '../api/ai'
import { useR2Upload } from '../hooks/useR2Upload'
import { useToast } from '../context/ToastContext'
import { motion } from 'framer-motion'
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
    workspaceId: string
    presetResults?: ApiGeneratedIdea[]
}

interface UploadedFile {
    id: string
    file: File
    preview: string
    caption: string
    type: 'image' | 'document'
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
export default function AIIdeaGenerator({ onSelectIdea, onClose, workspaceId, presetResults }: Props) {
    const [step, setStep] = useState<Step>(presetResults ? 'results' : 'form')
    const [topic, setTopic] = useState('')
    const [niche, setNiche] = useState('')
    const [audience, setAudience] = useState('')
    const [goal, setGoal] = useState('')
    const [tone, setTone] = useState('default')
    const [results, setResults] = useState<ApiGeneratedIdea[]>(presetResults || [])
    const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([])
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [dragOver, setDragOver] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const { error: toastError } = useToast()
    const { upload: uploadToR2, progress: uploadProgress } = useR2Upload()
    const [cooldownUntil, setCooldownUntil] = useState(0)
    const [remainingSeconds, setRemainingSeconds] = useState(0)

    useEffect(() => {
        if (cooldownUntil <= Date.now()) return
        const interval = setInterval(() => {
            const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000)
            if (remaining <= 0) {
                setRemainingSeconds(0)
                clearInterval(interval)
            } else {
                setRemainingSeconds(remaining)
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [cooldownUntil])

    const isCoolingDown = remainingSeconds > 0

    const generateMutation = useMutation({
        mutationFn: (req: AIGenerateRequest) => aiApi.generateIdeas(workspaceId, req),
        onSuccess: (data) => {
            setResults(data.ideas)
            if (data.cooldownSeconds && data.cooldownSeconds > 0) {
                setCooldownUntil(Date.now() + data.cooldownSeconds * 1000)
                setRemainingSeconds(data.cooldownSeconds)
            }
            setStep('results')
        },
        onError: () => {
            setStep('form')
            toastError('Failed to generate ideas. Please try again.')
        },
    })

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return
        Array.from(files).forEach(file => {
            const isImage = file.type.startsWith('image/')
            const preview = isImage ? URL.createObjectURL(file) : ''
            const type = isImage ? 'image' : 'document'
            setUploadedFiles(prev => [...prev, {
                id: shortId(),
                file,
                preview,
                caption: '',
                type
            }])
        })
    }, [])

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    const removeFile = (id: string) => {
        setUploadedFiles(prev => {
            const item = prev.find(f => f.id === id)
            if (item?.preview) URL.revokeObjectURL(item.preview)
            return prev.filter(f => f.id !== id)
        })
    }

    const handleGenerate = async () => {
        if (!topic.trim() || isCoolingDown || generateMutation.isPending) return
        setStep('loading')
        setSelectedIdeaIds([])

        // D-02: Upload reference files to R2 before generating
        let referenceAssetIds: string[] = []
        if (uploadedFiles.length > 0) {
            try {
                referenceAssetIds = await Promise.all(
                    uploadedFiles.map((f) => uploadToR2(f.file, workspaceId, f.id))
                )
            } catch {
                toastError('Upload failed. Check your connection and try again.')
                setStep('form')
                return
            }
        }

        // D-01: Only trigger generation — ideas stay in memory until user adds to board
        generateMutation.mutate({
            topic,
            niche: niche || undefined,
            audience: audience || undefined,
            goal: goal || undefined,
            tone: tone !== 'default' ? tone : undefined,
            referenceAssetIds: referenceAssetIds.length > 0 ? referenceAssetIds : undefined,
        })
    }

    const toggleSelect = (idea: ApiGeneratedIdea) => {
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
        uploadedFiles.forEach(f => {
            if (f.preview) URL.revokeObjectURL(f.preview)
        })
        setUploadedFiles([])
    }

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}
            >
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

                            {/* Reference Files Upload */}
                            <div className={styles.uploadSection}>
                                <p className={styles.uploadLabel}>Reference files (optional)</p>
                                <p className={styles.uploadHint}>Upload images or documents to help AI understand your vision better</p>
                                
                                {uploadedFiles.length > 0 && (
                                    <div className={styles.uploadedFiles}>
                                        {uploadedFiles.map(file => (
                                            <div key={file.id} className={styles.uploadedFile}>
                                                {file.type === 'image' ? (
                                                    <img src={file.preview} alt={file.file.name} className={styles.fileThumb} />
                                                ) : (
                                                    <div className={styles.fileThumbDoc}>
                                                        <FileText size={20} />
                                                    </div>
                                                )}
                                                <div className={styles.fileInfo}>
                                                    <span className={styles.fileName}>{file.file.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.removeFileBtn}
                                                    onClick={() => removeFile(file.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                {uploadProgress[file.id] !== undefined && uploadProgress[file.id] < 100 && (
                                                    <div className={styles.uploadProgressOverlay}>
                                                        <svg width="32" height="32" viewBox="0 0 32 32">
                                                            <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
                                                            <circle
                                                                cx="16" cy="16" r="12" fill="none"
                                                                stroke="var(--purple-500)" strokeWidth="2"
                                                                strokeDasharray={`${2 * Math.PI * 12}`}
                                                                strokeDashoffset={`${2 * Math.PI * 12 * (1 - (uploadProgress[file.id] ?? 0) / 100)}`}
                                                                strokeLinecap="round"
                                                                transform="rotate(-90 16 16)"
                                                                style={{ transition: 'stroke-dashoffset 200ms ease' }}
                                                            />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div
                                    className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneDragOver : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={onDrop}
                                >
                                    <Upload size={18} className={styles.uploadIcon} />
                                    <span className={styles.uploadText}>
                                        Drag & drop or <span>browse</span>
                                    </span>
                                    <span className={styles.uploadFormats}>PNG, JPG, PDF, DOC</span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={e => handleFiles(e.target.files)}
                                />
                            </div>

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
                                    disabled={!topic.trim() || isCoolingDown || generateMutation.isPending}
                                    title="Generate (Ctrl+Enter)"
                                >
                                    <Sparkles size={14} />
                                    <span>
                                        {isCoolingDown
                                            ? `Wait ${remainingSeconds}s`
                                            : generateMutation.isPending
                                                ? 'Generating…'
                                                : 'Generate'}
                                    </span>
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
                                        <motion.div
                                            key={idea.id}
                                            className={`glass-card ${styles.resultCard} ${isSelected ? styles.resultCardSelected : ''}`}
                                            whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(139, 92, 246, 0.2)' }}
                                            whileTap={{ scale: 0.97 }}
                                            transition={{ duration: 0.15 }}
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
                                        </motion.div>
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
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ duration: 0.1 }}
                                    className={`btn-primary ${styles.bulkAddBtn}`}
                                    onClick={handleBulkAdd}
                                    disabled={selectedIdeaIds.length === 0}
                                >
                                    {presetResults ? 'Tạo bài ngay' : 'Thêm vào board'}
                                </motion.button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}