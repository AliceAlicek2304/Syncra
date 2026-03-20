import { useState } from 'react'
import { Sparkles, Wand2, Loader2 } from 'lucide-react'
import { api } from '../api/axios'
import { useWorkspace } from '../context/WorkspaceContext'
import styles from './EditIdeaModal.module.css'

interface Props {
    title: string
    content: string
    onApply: (text: string) => void
}

type QuickAction = 'write-more' | 'rephrase' | 'shorten' | 'expand'

const QUICK_ACTIONS: { id: QuickAction; label: string; emoji: string }[] = [
    { id: 'write-more', label: 'Write more', emoji: '✍️' },
    { id: 'rephrase', label: 'Rephrase', emoji: '🔄' },
    { id: 'shorten', label: 'Shorten', emoji: '✂️' },
    { id: 'expand', label: 'Expand', emoji: '📋' },
]

interface AssistResponse {
    result: string
}

export default function IdeaAIAssistantPanel({ title, content, onApply }: Props) {
    const { activeWorkspace } = useWorkspace()
    const [prompt, setPrompt] = useState('')
    const [result, setResult] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const generate = async (overridePrompt?: string, action?: QuickAction) => {
        if (!activeWorkspace) return
        const p = overridePrompt ?? prompt
        if (!p.trim() && !action) return

        setLoading(true)
        setError('')
        try {
            const response = await api.post<AssistResponse>(`/workspaces/${activeWorkspace.id}/ai/assist`, {
                content: content || title,
                action: action || 'custom',
                instruction: action ? undefined : p,
                title: title
            })
            setResult(response.data.result)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Không thể kết nối với AI. Vui lòng thử lại.')
            console.error('AI Assistant error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleQuickAction = (action: QuickAction) => {
        const base = content || title
        if (!base.trim()) return
        generate(base, action)
    }

    return (
        <div className={styles.aiSidePanel}>
            {/* Header */}
            <div className={styles.aiSidePanelHeader}>
                <Sparkles size={15} />
                <span>AI Assistant</span>
            </div>

            <div className={styles.aiSidePanelBody}>
                {/* Prompt Section */}
                <div className={styles.aiPromptSection}>
                    <label className={styles.aiPromptLabel}>How can I help with this idea?</label>
                    <textarea
                        className={styles.aiPromptTextarea}
                        placeholder="E.g. Make this idea more engaging for Instagram, or suggest a hook for this topic..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={4}
                    />
                    <button
                        className={styles.aiGenerateBtn}
                        onClick={() => generate()}
                        disabled={!prompt.trim() || loading}
                    >
                        <Sparkles size={13} />
                        {loading ? 'Generating…' : 'Generate'}
                    </button>
                </div>

                {/* Quick Actions */}
                <div className={styles.quickActionsSection}>
                    <p className={styles.quickActionsLabel}>Quick AI Actions</p>
                    <div className={styles.quickActions}>
                        {QUICK_ACTIONS.map(a => (
                            <button
                                key={a.id}
                                className={styles.quickActionBtn}
                                onClick={() => handleQuickAction(a.id)}
                                disabled={loading || !(content || title).trim()}
                                title={`${a.label} — uses current idea content`}
                            >
                                <span>{a.emoji}</span>
                                {a.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className={styles.aiError}>
                        {error}
                    </div>
                )}

                {/* Result */}
                {result && !loading && (
                    <div className={styles.aiResultBox}>
                        <div className={styles.aiResultBoxHeader}>
                            <Wand2 size={12} />
                            <span>Suggestion</span>
                        </div>
                        <p className={styles.aiResultText}>{result}</p>
                        <button
                            className={styles.aiApplyBtn}
                            onClick={() => onApply(result)}
                        >
                            Apply to Content
                        </button>
                    </div>
                )}

                {loading && (
                    <div className={styles.aiLoading}>
                        <Loader2 className={styles.spinning} size={20} />
                        <span>AI đang xử lý...</span>
                    </div>
                )}

                {/* Helper tip */}
                <div className={styles.aiHelperTip}>
                    <span>💡</span>
                    <span>AI works best with clear, specific instructions. The more context you provide, the better the results.</span>
                </div>
            </div>
        </div>
    )
}
