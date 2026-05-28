import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useRepurpose } from '../../context/repurposeContextBase'
import type { RepurposePlatform } from '../../context/repurposeContextBase'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import styles from './RepurposeComponents.module.css'

interface PlatformDef {
    id: RepurposePlatform
    xText?: string
    color: string
    bg: string
    border: string
}

export const REPURPOSE_PLATFORM_COLORS: Record<string, { color: string; bg: string; border: string }> = {
    linkedin:  { color: '#0a66c2', bg: 'rgba(10,102,194,0.08)', border: 'rgba(10,102,194,0.22)' },
    twitter:   { color: '#201515', bg: 'rgba(32,21,21,0.06)', border: 'rgba(32,21,21,0.15)' },
    instagram: { color: '#d62976', bg: 'rgba(214,41,118,0.08)', border: 'rgba(214,41,118,0.22)' },
    tiktok:    { color: '#ef2950', bg: 'rgba(239,41,80,0.08)', border: 'rgba(239,41,80,0.22)' },
    facebook:  { color: '#1877f2', bg: 'rgba(24,119,242,0.08)', border: 'rgba(24,119,242,0.22)' },
    youtube:   { color: '#c20000', bg: 'rgba(194,0,0,0.06)', border: 'rgba(194,0,0,0.22)' },
    pinterest: { color: '#bd081c', bg: 'rgba(189,8,28,0.08)', border: 'rgba(189,8,28,0.22)' },
    bluesky:   { color: '#0085ff', bg: 'rgba(0,133,255,0.08)', border: 'rgba(0,133,255,0.22)' },
    threads:   { color: '#201515', bg: 'rgba(32,21,21,0.06)', border: 'rgba(32,21,21,0.15)' },
    googlebusiness: { color: '#0f9d58', bg: 'rgba(15,157,88,0.08)', border: 'rgba(15,157,88,0.22)' },
    telegram:  { color: '#0088cc', bg: 'rgba(0,136,204,0.08)', border: 'rgba(0,136,204,0.22)' },
    snapchat:  { color: '#a68000', bg: 'rgba(166,128,0,0.08)', border: 'rgba(166,128,0,0.22)' },
    whatsapp:  { color: '#075e54', bg: 'rgba(7,94,84,0.08)', border: 'rgba(7,94,84,0.22)' },
    reddit:    { color: '#ff4500', bg: 'rgba(255,69,0,0.08)', border: 'rgba(255,69,0,0.22)' },
}

const PLATFORMS: PlatformDef[] = ZERNIO_PLATFORMS.map(p => {
    const colors = REPURPOSE_PLATFORM_COLORS[p.id] ?? { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' }
    return {
        id: p.id as RepurposePlatform,
        xText: p.id === 'twitter' ? 'X' : p.label.charAt(0),
        color: colors.color,
        bg: colors.bg,
        border: colors.border,
    }
})

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
    const { config, setConfig, isGenerating, generate } = useRepurpose()
    const [contentLength, setContentLength] = useState('medium')

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
        await generate()
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
                                <ExtendedPlatformIcon platform={p.id} size={16} />
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
                                className={`${styles.tonePill} ${contentLength === l.id ? styles.tonePillActive : ''}`}
                                onClick={() => setContentLength(l.id)}
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
