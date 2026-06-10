import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export type RepurposePlatform =
  | 'bluesky'
  | 'facebook'
  | 'googlebusiness'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'reddit'
  | 'snapchat'
  | 'telegram'
  | 'threads'
  | 'tiktok'
  | 'twitter'
  | 'whatsapp'
  | 'youtube'
export type AtomType = 'POST' | 'THREAD' | 'CAROUSEL' | 'INSIGHT' | 'TIP' | 'QUOTE'

export type SourceStatus = 'processing' | 'ready' | 'error'

export interface SupportingSource {
  id: string
  type: 'url' | 'file'
  label: string
  url?: string
  fileName?: string
  status: SourceStatus
  error?: string
}

export interface RepurposeAtom {
  id: string
  type: AtomType
  title?: string
  content: string
  platform: RepurposePlatform
  suggestedHashtags: string[]
  suggestedCTA?: string
}

export interface RepurposeConfig {
    sourceText: string
    targetPlatforms: RepurposePlatform[]
    tone: string
    contentLength: string
    extractAtoms: boolean
    language: string
    sources: SupportingSource[]
}

export interface RepurposeStreamState {
    platformResults: Record<string, RepurposeAtom[]>
    progress: number
    isStreaming: boolean
    error: string | null
    metadata: Record<string, string>
    partialResults: Record<string, RepurposeAtom[]>
    liveTokenText: string
    currentPlatform: string | null
}

export interface RepurposeSessionSummary {
  id: string
  sourceText: string
  targetPlatforms: string
  tone: string
  status: string
  language: string
  contentLength: string
  extractAtoms: boolean
  createdAtUtc: string
  supportingSourcesJson?: string
}

export interface RepurposeContextValue {
    config: RepurposeConfig
    setConfig: Dispatch<SetStateAction<RepurposeConfig>>
    isGenerating: boolean
    setIsGenerating: Dispatch<SetStateAction<boolean>>
    results: RepurposeAtom[]
    setResults: Dispatch<SetStateAction<RepurposeAtom[]>>
    error: string | null
    setError: Dispatch<SetStateAction<string | null>>
    streamState: RepurposeStreamState
    generate: () => Promise<void>
    sessions: RepurposeSessionSummary[]
    activeSessionId: string | null
    switchSession: (sessionId: string) => Promise<void>
    deleteSession: (sessionId: string) => Promise<void>
    addSource: (source: SupportingSource) => void
    removeSource: (id: string) => void
    updateSource: (id: string, updates: Partial<SupportingSource>) => void
}

export const RepurposeContext = createContext<RepurposeContextValue | null>(null)

export function useRepurpose() {
    const ctx = useContext(RepurposeContext)
    if (!ctx) throw new Error('useRepurpose must be used inside <RepurposeProvider>')
    return ctx
}
