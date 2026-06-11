import { useState, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { RepurposeContext } from './repurposeContextBase'
import type { RepurposeConfig, RepurposeStreamState, RepurposeAtom, RepurposeSessionSummary, SupportingSource } from './repurposeContextBase'
import { useWorkspace } from './WorkspaceContext'
import { repurposeApi } from '../api/repurpose'

export const MAX_COMBINED_CHARS = 100_000

const INITIAL_STREAM_STATE: RepurposeStreamState = {
    platformResults: {},
    progress: 0,
    isStreaming: false,
    error: null,
    metadata: {},
    partialResults: {},
    liveTokenText: '',
    currentPlatform: null,
}

export function RepurposeProvider({ children }: { children: ReactNode }) {
    const { activeWorkspace } = useWorkspace()
    const [config, setConfig] = useState<RepurposeConfig>({
        sourceText: '',
        targetPlatforms: ['linkedin', 'twitter'],
        tone: 'default',
        contentLength: 'medium',
        extractAtoms: false,
        language: 'en',
        sources: [],
        generateMedia: false,
        mediaType: null,
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [results, setResults] = useState<RepurposeAtom[]>([])
    const [error, setError] = useState<string | null>(null)
    const [streamState, setStreamState] = useState<RepurposeStreamState>(INITIAL_STREAM_STATE)
    const [sessions, setSessions] = useState<RepurposeSessionSummary[]>([])
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)
    const initialLoadDone = useRef(false)

    const loadSessions = useCallback(async (workspaceId: string) => {
        try {
            const list = await repurposeApi.listSessions(workspaceId)
            setSessions(list)
            return list
        } catch (err) {
            console.error('Failed to load session list:', err)
            return [] as RepurposeSessionSummary[]
        }
    }, [])

    const loadSessionById = useCallback(async (sessionId: string) => {
        if (!activeWorkspace) return
        try {
            const data = await repurposeApi.getSession(activeWorkspace.id, sessionId)
            const mappedAtoms = data.atoms.map(a => ({
                ...a,
                platform: a.platform.toLowerCase() as RepurposeAtom['platform'],
                type: a.type as RepurposeAtom['type'],
                suggestedCTA: a.suggestedCta || (a as any).suggestedCTA,
                mediaUrl: a.mediaUrl,
                mediaType: a.mediaType as RepurposeAtom['mediaType'],
            }))
            setResults(mappedAtoms)
            setActiveSessionId(sessionId)
            setError(null)
        } catch (err) {
            console.error('Failed to load session:', err)
            setError('Không thể nạp lại lịch sử. Có thể kết quả đã cũ hoặc không tồn tại.')
        }
    }, [activeWorkspace])

    // Auto-load sessions list on mount + auto-load most recent if no sessionId in URL
    useEffect(() => {
        if (!activeWorkspace || initialLoadDone.current) return
        initialLoadDone.current = true

        const params = new URLSearchParams(window.location.search)
        const urlSessionId = params.get('sessionId')

        loadSessions(activeWorkspace.id)
            .then(list => {
                // Auto-load most recent session if no sessionId in URL
                if (!urlSessionId && list.length > 0) {
                    const latest = list[0]
                    const url = new URL(window.location.href)
                    url.searchParams.set('sessionId', latest.id)
                    window.history.replaceState({}, '', url)
                    loadSessionById(latest.id)
                } else if (urlSessionId) {
                    setActiveSessionId(urlSessionId)
                }
            })
    }, [activeWorkspace, loadSessionById, loadSessions])

    const generate = useCallback(async () => {
        if (!activeWorkspace) return

        const abortController = new AbortController()
        abortRef.current = abortController

        setIsGenerating(true)
        setResults([])
        setError(null)
        setStreamState({ ...INITIAL_STREAM_STATE, isStreaming: true })

        // Clear sessionId from URL on new generation
        const url = new URL(window.location.href)
        url.searchParams.delete('sessionId')
        window.history.replaceState({}, '', url)

        // Build combined text from sourceText + all ready supporting sources
        const selectedPostIds = config.sources
            .filter(s => s.status === 'ready' && s.type === 'post')
            .map(s => s.postId)
            .filter(Boolean) as string[]

        const readySourceTexts = config.sources
            .filter(s => s.status === 'ready' && (s.type === 'file' || s.type === 'url'))
            .map(s => {
                const prefix = s.type === 'file' ? `[File: ${s.fileName ?? s.label}]` : `[URL: ${s.url ?? s.label}]`
                return `${prefix}\n${s.label}`
            })
            .join('\n\n---\n\n')

        const combinedText = config.sourceText.trim()
            ? (readySourceTexts ? `${config.sourceText}\n\n---\n\n${readySourceTexts}` : config.sourceText)
            : readySourceTexts

        if (!combinedText.trim() && selectedPostIds.length === 0) {
            setError('Please add source content (paste text, upload files, fetch from URL, or select existing posts).')
            setIsGenerating(false)
            setStreamState(prev => ({ ...prev, isStreaming: false }))
            return
        }

        if (combinedText.length > MAX_COMBINED_CHARS) {
            setError(`Input content exceeds the ${MAX_COMBINED_CHARS.toLocaleString()}-character limit. The text will be truncated; consider pasting only the most relevant parts.`)
        }

        // Build supporting sources metadata for the request (excluding posts)
        const supportingSources = config.sources
            .filter(s => s.status === 'ready' && s.type !== 'post')
            .map(s => ({
                id: s.id,
                type: s.type as 'url' | 'file',
                label: s.label,
                url: s.url,
                fileName: s.fileName,
            }))

        const truncatedText = combinedText.length > MAX_COMBINED_CHARS
            ? combinedText.slice(0, MAX_COMBINED_CHARS)
            : combinedText

        try {
            const streamResults = await repurposeApi.generateStream(
                activeWorkspace.id,
                {
                    sourceText: truncatedText,
                    platforms: config.targetPlatforms,
                    tone: config.tone,
                    contentLength: config.contentLength,
                    extractAtoms: config.extractAtoms,
                    language: config.language,
                    supportingSources: supportingSources.length > 0 ? supportingSources : undefined,
                    selectedPostIds: selectedPostIds.length > 0 ? selectedPostIds : undefined,
                    generateMedia: config.generateMedia,
                    mediaType: config.generateMedia ? config.mediaType : undefined,
                },
                abortController.signal,
                (event) => {
                    switch (event.type) {
                        case 'token': {
                            const data = event.data as { text: string }
                            setStreamState(prev => ({
                                ...prev,
                                liveTokenText: prev.liveTokenText + data.text,
                            }))
                            break
                        }
                        case 'partial_json': {
                            const data = event.data as { atoms: any[]; progress: number }
                            const partialMap: Record<string, RepurposeAtom[]> = {}
                            for (const atom of data.atoms) {
                                const platform = atom.platform.toLowerCase()
                                if (!partialMap[platform]) partialMap[platform] = []
                                partialMap[platform].push({
                                    ...atom,
                                    platform: platform as RepurposeAtom['platform'],
                                    type: atom.type as RepurposeAtom['type'],
                                    suggestedCTA: atom.suggestedCta || atom.suggestedCTA,
                                    mediaUrl: atom.mediaUrl,
                                    mediaType: atom.mediaType as RepurposeAtom['mediaType'],
                                })
                            }
                            setStreamState(prev => ({
                                ...prev,
                                partialResults: partialMap,
                                progress: data.progress,
                                currentPlatform: Object.keys(partialMap).length > 0
                                    ? Object.keys(partialMap)[Object.keys(partialMap).length - 1]
                                    : null,
                            }))
                            break
                        }
                        case 'metadata': {
                            const data = event.data as { key: string; value: string }
                            setStreamState(prev => ({
                                ...prev,
                                metadata: { ...prev.metadata, [data.key]: data.value },
                            }))

                            if (data.key === 'session_id') {
                                const url = new URL(window.location.href)
                                url.searchParams.set('sessionId', data.value)
                                window.history.replaceState({}, '', url)
                            }
                            break;
                        }
                        case 'platform_complete': {
                            const data = event.data as { platform: string; atoms: any[]; progress: number }
                            const platformKey = data.platform.toLowerCase()
                            const mappedAtoms = data.atoms.map(a => ({
                                ...a,
                                platform: a.platform.toLowerCase() as RepurposeAtom['platform'],
                                type: a.type as RepurposeAtom['type'],
                                suggestedCTA: a.suggestedCta || a.suggestedCTA,
                                mediaUrl: a.mediaUrl,
                                mediaType: a.mediaType as RepurposeAtom['mediaType'],
                            }))
                            setStreamState(prev => {
                                const { [platformKey]: _, ...restPartial } = prev.partialResults
                                return {
                                    ...prev,
                                    platformResults: {
                                        ...prev.platformResults,
                                        [platformKey]: mappedAtoms,
                                    },
                                    partialResults: restPartial,
                                    progress: data.progress,
                                }
                            })
                            setResults(prev => {
                                const existing = prev.filter(a => a.platform !== platformKey)
                                return [...existing, ...mappedAtoms]
                            })
                            break
                        }
                        case 'complete': {
                            const data = event.data as { atoms: any[] }
                            const allAtoms = data.atoms.map(a => ({
                                ...a,
                                platform: a.platform.toLowerCase() as RepurposeAtom['platform'],
                                type: a.type as RepurposeAtom['type'],
                                suggestedCTA: a.suggestedCta || a.suggestedCTA,
                                mediaUrl: a.mediaUrl,
                                mediaType: a.mediaType as RepurposeAtom['mediaType'],
                            }))
                            setResults(allAtoms)
                            setStreamState(prev => ({
                                ...prev,
                                isStreaming: false,
                                progress: 1,
                            }))
                            setIsGenerating(false)
                            loadSessions(activeWorkspace.id)
                            break
                        }
                        case 'error': {
                            const data = event.data as { code: string; message: string }
                            setError(data.message)
                            setStreamState(prev => ({ ...prev, isStreaming: false, error: data.message }))
                            setIsGenerating(false)
                            break
                        }
                    }
                }
            )

            if (streamResults) {
                const allAtoms = streamResults.map(a => ({
                    ...a,
                    platform: a.platform.toLowerCase() as RepurposeAtom['platform'],
                    type: a.type as RepurposeAtom['type'],
                    suggestedCTA: a.suggestedCta || (a as any).suggestedCTA,
                    mediaUrl: a.mediaUrl,
                    mediaType: a.mediaType as RepurposeAtom['mediaType'],
                }))
                setResults(allAtoms)
                setStreamState(prev => ({ ...prev, isStreaming: false, progress: 1 }))
            }

            const currentResults = streamResults ?? []
            const generatedPlatforms = new Set(currentResults.map(r => r.platform.toLowerCase()))
            const missingPlatforms = config.targetPlatforms.filter(p => !generatedPlatforms.has(p.toLowerCase()))
            if (missingPlatforms.length > 0 && currentResults.length > 0) {
                setError(`AI không thể tạo nội dung cho: ${missingPlatforms.join(', ')}. Thử nhập nội dung chi tiết hơn.`)
            }
        } catch (err) {
            if ((err as Error)?.name === 'AbortError') return
            const axiosError = err as { response?: { status?: number } }
            if (axiosError?.response?.status === 401) {
                localStorage.removeItem('syncra_access_token')
                localStorage.removeItem('syncra_workspace_id')
                window.location.href = '/login'
                return
            }
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to generate content. Please try again.'
            setError(message)
            setStreamState(prev => ({ ...prev, isStreaming: false, error: message }))
        } finally {
            setIsGenerating(false)
            setStreamState(prev => ({ ...prev, isStreaming: false }))
            abortRef.current = null
        }
    }, [config, activeWorkspace])

    const switchSession = useCallback(async (sessionId: string) => {
        if (!activeWorkspace) return
        const url = new URL(window.location.href)
        url.searchParams.set('sessionId', sessionId)
        window.history.replaceState({}, '', url)
        await loadSessionById(sessionId)
    }, [activeWorkspace, loadSessionById])

    const deleteSession = useCallback(async (sessionId: string) => {
        if (!activeWorkspace) return
        try {
            await repurposeApi.deleteSession(activeWorkspace.id, sessionId)
            setSessions(prev => prev.filter(s => s.id !== sessionId))
            if (activeSessionId === sessionId) {
                setResults([])
                setActiveSessionId(null)
                const url = new URL(window.location.href)
                url.searchParams.delete('sessionId')
                window.history.replaceState({}, '', url)
            }
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Failed to delete session'
            setError(message)
        }
    }, [activeWorkspace, activeSessionId])

    const addSource = useCallback((source: SupportingSource) => {
        setConfig(prev => ({
            ...prev,
            sources: [...prev.sources, source],
        }))
    }, [])

    const removeSource = useCallback((id: string) => {
        setConfig(prev => ({
            ...prev,
            sources: prev.sources.filter(s => s.id !== id),
        }))
    }, [])

    const updateSource = useCallback((id: string, updates: Partial<SupportingSource>) => {
        setConfig(prev => ({
            ...prev,
            sources: prev.sources.map(s => (s.id === id ? { ...s, ...updates } : s)),
        }))
    }, [])

    return (
        <RepurposeContext.Provider
            value={{
                config, setConfig,
                isGenerating, setIsGenerating,
                results, setResults,
                error, setError,
                streamState,
                generate,
                sessions,
                activeSessionId,
                switchSession,
                deleteSession,
                addSource,
                removeSource,
                updateSource,
            }}
        >
            {children}
        </RepurposeContext.Provider>
    )
}
