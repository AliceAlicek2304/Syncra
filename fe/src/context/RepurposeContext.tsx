import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { RepurposeContext } from './repurposeContextBase'
import type { RepurposeConfig } from './repurposeContextBase'
import type { RepurposeAtom } from './repurposeContextBase'
import { useWorkspace } from './WorkspaceContext'
import { repurposeApi } from '../api/repurpose'

export function RepurposeProvider({ children }: { children: ReactNode }) {
    const { activeWorkspace } = useWorkspace()
    const [config, setConfig] = useState<RepurposeConfig>({
        sourceText: '',
        targetPlatforms: ['linkedin', 'twitter'],
        tone: 'default',
        extractAtoms: false
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [results, setResults] = useState<RepurposeAtom[]>([])
    const [error, setError] = useState<string | null>(null)

    const generate = useCallback(async () => {
        if (!config.sourceText.trim() || !activeWorkspace) return

        setIsGenerating(true)
        setError(null)

        try {
            const response = await repurposeApi.generate(activeWorkspace.id, {
                sourceText: config.sourceText,
                platforms: config.targetPlatforms,
                tone: config.tone,
                extractAtoms: config.extractAtoms,
            })

            // Map API response to context atoms
            const atoms: RepurposeAtom[] = response.atoms.map(a => ({
                id: a.id,
                type: a.type as RepurposeAtom['type'],
                title: a.title,
                content: a.content,
                platform: a.platform as RepurposeAtom['platform'],
                suggestedHashtags: a.suggestedHashtags,
                suggestedCTA: a.suggestedCta,
            }))

            setResults(atoms)
        } catch (err) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to generate content. Please try again.'
            setError(message)
        } finally {
            setIsGenerating(false)
        }
    }, [config, activeWorkspace])

    return (
        <RepurposeContext.Provider
            value={{
                config, setConfig,
                isGenerating, setIsGenerating,
                results, setResults,
                error, setError,
                generate,
            }}
        >
            {children}
        </RepurposeContext.Provider>
    )
}
