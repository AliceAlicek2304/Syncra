import { useState, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { aiApi } from '../api/ai'
import type { GeneratedIdea as ApiGeneratedIdea, AIGenerateRequest } from '../api/ai'
import { useR2Upload } from '../hooks/useR2Upload'
import { useToast } from '../context/ToastContext'
import { motion } from 'framer-motion'
import { AIIdeaForm } from './ai/AIIdeaForm'
import { AIIdeaResults } from './ai/AIIdeaResults'
import styles from './AIIdeaGenerator.module.css'

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

type Step = 'form' | 'loading' | 'results'

export default function AIIdeaGenerator({ onSelectIdea, onClose, workspaceId, presetResults }: Props) {
  const [step, setStep] = useState<Step>(presetResults ? 'results' : 'form')
  const [results, setResults] = useState<ApiGeneratedIdea[]>(presetResults || [])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

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

  const handleGenerate = async (data: AIGenerateRequest) => {
    setStep('loading')

    if (uploadedFiles.length > 0) {
      try {
        const referenceAssetIds = await Promise.all(
          uploadedFiles.map((f) => uploadToR2(f.file, workspaceId, f.id))
        )
        data.referenceAssetIds = referenceAssetIds
      } catch {
        toastError('Upload failed. Check your connection and try again.')
        setStep('form')
        return
      }
    }

    generateMutation.mutate(data)
  }

  const handleReset = () => {
    if (presetResults) {
      onClose()
      return
    }
    setStep('form')
    setResults([])
    uploadedFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setUploadedFiles([])
  }

  const handleSelectIdea = (idea: GeneratedIdea) => {
    onSelectIdea(idea)
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Sparkles size={18} className={styles.modalTitleIcon} />
            <span>{presetResults ? 'Trending Ideas' : 'Generate with AI'}</span>
          </div>
          <div className={styles.modalHeaderActions}>
            {step === 'results' && !presetResults && (
              <button className={styles.resetBtn} onClick={handleReset}>
                ← Regenerate
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {step === 'form' && (
            <AIIdeaForm
              onSubmit={handleGenerate}
              isGenerating={generateMutation.isPending}
              cooldownRemaining={remainingSeconds}
              uploadedFiles={uploadedFiles}
              uploadProgress={uploadProgress}
              onFilesChange={setUploadedFiles}
            />
          )}

          {step === 'loading' && (
            <div className={styles.loadingWrap}>
              <div className={styles.loadingOrb} />
              <div className={styles.loadingIcon}>
                <Sparkles size={28} />
              </div>
              <h3 className={styles.loadingTitle}>AI is generating ideas…</h3>
              <p className={styles.loadingDesc}>Analyzing topic · Optimizing content</p>
              <div className={styles.loadingDots}>
                <span /><span /><span />
              </div>
            </div>
          )}

          {step === 'results' && (
            <AIIdeaResults
              ideas={results}
              presetResults={presetResults}
              onSelectIdea={handleSelectIdea}
              onRegenerate={() => generateMutation.mutate}
              cooldownRemaining={remainingSeconds}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
