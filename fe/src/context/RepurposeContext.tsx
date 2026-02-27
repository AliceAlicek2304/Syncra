import { useState } from 'react'
import type { ReactNode } from 'react'
import { RepurposeContext } from './repurposeContextBase'
import type { RepurposeConfig } from './repurposeContextBase'
import type { RepurposeAtom } from '../data/mockAI'

export * from './repurposeContextBase'

export function RepurposeProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<RepurposeConfig>({
        sourceText: '',
        targetPlatforms: ['LinkedIn', 'X'],
        tone: 'default',
        extractAtoms: false
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [results, setResults] = useState<RepurposeAtom[]>([])
    const [error, setError] = useState<string | null>(null)

    return (
        <RepurposeContext.Provider
            value={{
                config, setConfig,
                isGenerating, setIsGenerating,
                results, setResults,
                error, setError
            }}
        >
            {children}
        </RepurposeContext.Provider>
    )
}
