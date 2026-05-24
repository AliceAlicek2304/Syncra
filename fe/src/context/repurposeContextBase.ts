import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/**
 * All 14 Zernio platform IDs available for repurpose content generation.
 * Uses lowercase Zernio API IDs for consistency across the frontend.
 */
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
