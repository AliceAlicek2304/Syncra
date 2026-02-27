import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { RepurposePlatform, RepurposeAtom } from '../data/mockAI'

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
