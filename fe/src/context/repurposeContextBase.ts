import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export type RepurposePlatform = 'LinkedIn' | 'X' | 'Instagram' | 'Newsletter'
export type AtomType = 'POST' | 'THREAD' | 'CAROUSEL' | 'INSIGHT' | 'TIP' | 'QUOTE'

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
    extractAtoms: boolean
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
}

export const RepurposeContext = createContext<RepurposeContextValue | null>(null)

export function useRepurpose() {
    const ctx = useContext(RepurposeContext)
    if (!ctx) throw new Error('useRepurpose must be used inside <RepurposeProvider>')
    return ctx
}
