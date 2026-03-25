import { Sparkles, Loader2, Linkedin, Instagram, Mail } from 'lucide-react'
import type { ElementType } from 'react'
import { useRepurpose } from '../../context/repurposeContextBase'
import type { RepurposePlatform } from '../../data/mockAI'
import { generateRepurpose } from '../../data/repurposeService'
import styles from './RepurposeComponents.module.css'

interface PlatformDef {
    id: RepurposePlatform
    icon?: ElementType
    xText?: string
    color: string
    bg: string
    border: string
}

const PLATFORMS: PlatformDef[] = [
    { id: 'LinkedIn', icon: Linkedin, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)' },
    { id: 'X', xText: 'X', color: '#e2e8f0', bg: 'rgba(226,232,240,0.07)', border: 'rgba(226,232,240,0.25)' },
    { id: 'Instagram', icon: Instagram, color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)' },
    { id: 'Newsletter', icon: Mail, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
]

const TONES = [
    { id: 'default', label: 'Adaptive' },
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'bold', label: 'Bold' },
    { id: 'educational', label: 'Educational' },
]

const LENGTHS = [
    { id: 'short', label: 'Ngắn' },
    { id: 'medium', label: 'Vừa' },
    { id: 'long', label: 'Dài' },
]

export default function ConfigBar() {
    const { config, setConfig, isGenerating, setIsGenerating, setResults, setError } = useRepurpose()

    const togglePlatform = (p: RepurposePlatform) => {
        setConfig(prev => {
            const active = prev.targetPlatforms.includes(p)
            const next = active
                ? prev.targetPlatforms.filter(t => t !== p)
                : [...prev.targetPlatforms, p]
            return { ...prev, targetPlatforms: next }
        })
    }

    const handleGenerate = async () => {
        if (!config.sourceText.trim()) return
        setIsGenerating(true)
        setError(null)
        try {
            const response = await generateRepurpose({
                sourceText: config.sourceText,
                platforms: config.targetPlatforms,
                tone: config.tone,
                length: config.length,
                extractAtoms: config.extractAtoms,
            })
            setResults(response.atoms)
        } catch (err) {
            console.error('Repurpose generation failed:', err)
            const details = err instanceof Error ? err.message : ''
            setError(details ? `Tạo nội dung thất bại: ${details}` : 'Tạo nội dung thất bại: Không xác định được nguyên nhân.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className={styles.configBar}>
            {/* Platforms */}
            <div className={styles.configSection}>
                <div className={styles.configSectionHeader}>
                    <span className={styles.configSectionLabel}>Nền tảng mục tiêu</span>
                    <span className={styles.configSectionHint}>
                        {config.targetPlatforms.length > 0
                            ? `${config.targetPlatforms.length} đã chọn`
                            : 'Chọn ít nhất 1'}
                    </span>
                </div>
                <div className={styles.platformGrid}>
                    {PLATFORMS.map(p => {
                        const isActive = config.targetPlatforms.includes(p.id)
                        const Icon = p.icon
                        return (
                            <button
                                key={p.id}
                                className={`${styles.platformChip} ${isActive ? styles.platformChipActive : ''}`}
                                style={isActive ? {
                                    '--p-color': p.color,
                                    '--p-bg': p.bg,
                                    '--p-border': p.border,
                                } as React.CSSProperties : {}}
                                onClick={() => togglePlatform(p.id)}
                            >
                                {Icon ? <Icon size={14} /> : <span className={styles.xIcon}>{p.xText}</span>}
                                <span>{p.id}</span>
                                {isActive && <span className={styles.platformCheck}>✓</span>}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className={styles.configDivider} />

            {/* Tone + Length + Toggle row */}
            <div className={styles.configRow}>
                <div className={styles.configGroup}>
                    <span className={styles.configLabel}>Giọng điệu</span>
                    <div className={styles.tonePills}>
                        {TONES.map(t => (
                            <button
                                key={t.id}
                                className={`${styles.tonePill} ${config.tone === t.id ? styles.tonePillActive : ''}`}
                                onClick={() => setConfig(prev => ({ ...prev, tone: t.id }))}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.configGroup}>
                    <span className={styles.configLabel}>Độ dài</span>
                    <div className={styles.tonePills}>
                        {LENGTHS.map(l => (
                            <button
                                key={l.id}
                                className={`${styles.tonePill} ${config.length === l.id ? styles.tonePillActive : ''}`}
                                onClick={() => setConfig(prev => ({ ...prev, length: l.id as 'short' | 'medium' | 'long' }))}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.configGroup} style={{ marginLeft: 'auto' }}>
                    <span className={styles.configLabel}>Insights</span>
                    <label className={styles.toggleLabel}>
                        <div
                            className={`${styles.toggle} ${config.extractAtoms ? styles.toggleOn : ''}`}
                            onClick={() => setConfig(prev => ({ ...prev, extractAtoms: !prev.extractAtoms }))}
                        >
                            <div className={styles.toggleThumb} />
                        </div>
                        <div>
                            <span className={styles.toggleText}>Trích xuất Insights</span>
                            <span className={styles.toggleSubtext}>Tips, quotes, key insights</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Generate button */}
            <div className={styles.generateRow}>
                <button
                    className={styles.generateBtn}
                    onClick={handleGenerate}
                    disabled={!config.sourceText.trim() || isGenerating || config.targetPlatforms.length === 0}
                >
                    <div className={styles.generateBtnShimmer} />
                    {isGenerating ? <Loader2 className={styles.spinning} size={16} /> : <Sparkles size={16} />}
                    <span>{isGenerating ? 'Đang phân tích & tạo nội dung...' : 'Start Repurpose Engine'}</span>
                </button>
                {config.targetPlatforms.length === 0 && (
                    <p className={styles.generateHint}>Hãy chọn ít nhất 1 nền tảng</p>
                )}
            </div>
        </div>
    )
}