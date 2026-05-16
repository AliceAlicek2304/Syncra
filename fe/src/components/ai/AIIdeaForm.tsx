import { useState, useRef, useCallback } from 'react'
import { ChevronRight, ChevronDown, Upload, FileText, Trash2, Sparkles } from 'lucide-react'
import type { AIGenerateRequest } from '../../api/ai'
import { shortId } from '../../utils/shortId'
import styles from './AIIdeaForm.module.css'

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

interface UploadedFile {
  id: string
  file: File
  preview: string
  caption: string
  type: 'image' | 'document'
}

interface AIIdeaFormProps {
  onSubmit: (data: AIGenerateRequest) => void
  isGenerating: boolean
  cooldownRemaining: number
  uploadedFiles: UploadedFile[]
  uploadProgress: Record<string, number>
  onFilesChange: (files: UploadedFile[]) => void
}

export function AIIdeaForm({ onSubmit, isGenerating, cooldownRemaining, uploadedFiles, uploadProgress, onFilesChange }: AIIdeaFormProps) {
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState('')
  const [audience, setAudience] = useState('')
  const [goal, setGoal] = useState('')
  const [tone, setTone] = useState('default')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCoolingDown = cooldownRemaining > 0

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles: UploadedFile[] = []
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/')
      const preview = isImage ? URL.createObjectURL(file) : ''
      const type = isImage ? 'image' : 'document'
      newFiles.push({ id: shortId(), file, preview, caption: '', type })
    })
    onFilesChange([...uploadedFiles, ...newFiles])
  }, [uploadedFiles, onFilesChange])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (id: string) => {
    const item = uploadedFiles.find(f => f.id === id)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    onFilesChange(uploadedFiles.filter(f => f.id !== id))
  }

  const handleSubmit = () => {
    if (!topic.trim() || isCoolingDown || isGenerating) return
    onSubmit({
      topic,
      niche: niche || undefined,
      audience: audience || undefined,
      goal: goal || undefined,
      tone: tone !== 'default' ? tone : undefined,
    })
  }

  return (
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
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
      />

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
                <button type="button" className={styles.removeFileBtn} onClick={() => removeFile(file.id)}>
                  <Trash2 size={14} />
                </button>
                {uploadProgress[file.id] !== undefined && uploadProgress[file.id] < 100 && (
                  <div className={styles.uploadProgressOverlay}>
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
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
          <span className={styles.uploadText}>Drag & drop or <span>browse</span></span>
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

      <button type="button" className={styles.advancedToggle} onClick={() => setShowAdvanced(v => !v)}>
        {showAdvanced ? <><ChevronDown size={12} /> Advanced</> : <><ChevronRight size={12} /> Advanced</>}
      </button>

      {showAdvanced && (
        <div className={styles.advancedRow}>
          <input type="text" className={styles.input} placeholder="Niche (e.g. Fitness, Tech…)" value={niche} onChange={e => setNiche(e.target.value)} />
          <input type="text" className={styles.input} placeholder="Audience (e.g. Gen Z, Founders…)" value={audience} onChange={e => setAudience(e.target.value)} />
        </div>
      )}

      <div className={styles.formFooter}>
        <span className={styles.formHint}>{topic.trim() ? '' : 'Type a topic above to get started'}</span>
        <button className={styles.generateIconBtn} onClick={handleSubmit} disabled={!topic.trim() || isCoolingDown || isGenerating} title="Generate (Ctrl+Enter)">
          <Sparkles size={14} />
          <span>
            {isCoolingDown ? `Wait ${cooldownRemaining}s` : isGenerating ? 'Generating…' : 'Generate'}
          </span>
        </button>
      </div>
    </div>
  )
}
