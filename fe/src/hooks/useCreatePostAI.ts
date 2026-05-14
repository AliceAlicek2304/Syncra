import { useState, useCallback } from 'react'
import { aiApi } from '../api/ai'
import { useWorkspace } from '../context/WorkspaceContext'

export interface UseCreatePostAIReturn {
  showAI: boolean
  setShowAI: (v: boolean) => void
  aiPrompt: string
  setAiPrompt: (v: string) => void
  aiResults: Array<{ id: string; type: string; caption: string }>
  setAiResults: (v: Array<{ id: string; type: string; caption: string }>) => void
  aiIsGenerating: boolean
  setAiIsGenerating: (v: boolean) => void
  handleGenerateAI: () => Promise<void>
  applyAISuggestion: () => void
  resetAI: () => void
}

export function useCreatePostAI(): UseCreatePostAIReturn {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const [showAI, setShowAI] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResults, setAiResults] = useState<Array<{ id: string; type: string; caption: string }>>([])
  const [aiIsGenerating, setAiIsGenerating] = useState(false)

  const handleGenerateAI = useCallback(async () => {
    if (!aiPrompt.trim() || !workspaceId) return
    setAiIsGenerating(true)
    try {
      const result = await aiApi.generateIdeas(workspaceId, {
        topic: aiPrompt,
        niche: '',
        audience: '',
        goal: '',
        tone: 'default',
      })
      setAiResults(result.ideas.slice(0, 4))
    } catch {
      setAiResults([])
    } finally {
      setAiIsGenerating(false)
    }
  }, [aiPrompt, workspaceId])

  const applyAISuggestion = () => {
    setAiPrompt('')
  }

  const resetAI = useCallback(() => {
    setShowAI(false)
    setAiPrompt('')
    setAiResults([])
    setAiIsGenerating(false)
  }, [])

  return {
    showAI,
    setShowAI,
    aiPrompt,
    setAiPrompt,
    aiResults,
    setAiResults,
    aiIsGenerating,
    setAiIsGenerating,
    handleGenerateAI,
    applyAISuggestion,
    resetAI,
  }
}
