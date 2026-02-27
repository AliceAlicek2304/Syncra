import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
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

function simulateAI(prompt: string, action?: QuickAction, base?: string): string {
    if (action === 'write-more') return (base || '') + '\n\nBuilding on this idea further, there are several compelling angles to explore and develop into actionable content that resonates with your target audience...'
    if (action === 'rephrase') return `Here is a fresh take on your idea: ${(base || prompt).split('').reverse().slice(0, 60).join('')}...`
    if (action === 'shorten') return (base || prompt).split(' ').slice(0, 20).join(' ') + '...'
    if (action === 'expand') return (base || prompt) + '\n\nExpanded context: This idea opens the door to deeper exploration of the subject matter, bringing in diverse perspectives and concrete examples to make your content more impactful and shareable across platforms.'
    return `AI-generated content based on your prompt:\n\n"${prompt}"\n\nHere's a compelling angle: This topic has tremendous potential for engagement. Consider leading with a hook that challenges conventional wisdom, then backing it up with relatable examples.`
}

export default function IdeaAIAssistantPanel({ title, content, onApply }: Props) {
    const [prompt, setPrompt] = useState('')
    const [result, setResult] = useState('')
    const [loading, setLoading] = useState(false)

    const generate = (overridePrompt?: string, action?: QuickAction) => {
        const p = overridePrompt ?? prompt
        if (!p.trim() && !action) return
        setLoading(true)
        setTimeout(() => {
            setResult(simulateAI(p, action, content || title))
            setLoading(false)
        }, 700)
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

                {/* Result */}
                {result && (
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

                {/* Helper tip */}
                <div className={styles.aiHelperTip}>
                    <span>💡</span>
                    <span>AI works best with clear, specific instructions. The more context you provide, the better the results.</span>
                </div>
            </div>
        </div>
    )
}
