import { useState } from 'react'
import type { ElementType } from 'react'
import {
    Copy, Check, Calendar, RefreshCw, ChevronDown, ChevronUp,
    Linkedin, Instagram, Mail, FileText, AlignLeft,
    LayoutGrid, Lightbulb, Zap, Quote,
} from 'lucide-react'
import type { RepurposeAtom, AtomType } from '../../data/mockAI'
import styles from './RepurposeComponents.module.css'

interface Props {
    atom: RepurposeAtom
    index?: number
    selectionMode?: boolean
    selected?: boolean
    onToggleSelect?: (atomId: string) => void
}

interface PlatformCfg { icon?: ElementType; xText?: string; color: string; bg: string; border: string }

const PLATFORM_CFG: Record<string, PlatformCfg> = {
    LinkedIn:   { icon: Linkedin,   color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)' },
    X:          { xText: 'X',       color: '#e2e8f0', bg: 'rgba(226,232,240,0.05)',  border: 'rgba(226,232,240,0.12)' },
    Instagram:  { icon: Instagram,  color: '#f472b6', bg: 'rgba(244,114,182,0.08)',  border: 'rgba(244,114,182,0.2)' },
    Newsletter: { icon: Mail,       color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.2)' },
}

const TYPE_CFG: Record<AtomType, { icon: ElementType; label: string }> = {
    POST:     { icon: FileText,    label: 'Post' },
    THREAD:   { icon: AlignLeft,   label: 'Thread' },
    CAROUSEL: { icon: LayoutGrid,  label: 'Carousel' },
    INSIGHT:  { icon: Lightbulb,   label: 'Insight' },
    TIP:      { icon: Zap,         label: 'Tip' },
    QUOTE:    { icon: Quote,       label: 'Quote' },
}

export default function AtomCard({ atom, index = 0, selectionMode = false, selected = false, onToggleSelect }: Props) {
    const [copied, setCopied] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const platform = PLATFORM_CFG[atom.platform] ?? PLATFORM_CFG.LinkedIn
    const typeInfo = TYPE_CFG[atom.type]
    const TypeIcon = typeInfo.icon
    const PlatformIcon = platform.icon
    const isLong = atom.content.length > 300

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await navigator.clipboard.writeText(atom.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSchedule = (e: React.MouseEvent) => {
        e.stopPropagation()
        alert(`Lên lịch đăng trên ${atom.platform}:\n\n${atom.content.slice(0, 80)}...`)
    }

    const handleCardClick = () => {
        if (!selectionMode || !onToggleSelect) return
        onToggleSelect(atom.id)
    }

    return (
        <div
            className={`${styles.atomCard} ${selectionMode ? styles.atomCardSelectable : ''} ${selected ? styles.atomCardSelected : ''}`}
            style={{
                '--card-color': platform.color,
                '--card-border': platform.border,
                animationDelay: `${index * 0.06}s`,
            } as React.CSSProperties}
            onClick={handleCardClick}
        >
            {selectionMode && (
                <span className={`${styles.selectionCheckbox} ${selected ? styles.selectionCheckboxActive : ''}`} aria-hidden="true">
                    {selected ? '✓' : ''}
                </span>
            )}
            {/* Left accent bar */}
            <div className={styles.cardAccent} style={{ background: platform.color }} />

            {/* Header */}
            <div className={styles.cardHeader}>
                <div className={styles.cardBadges}>
                    <span
                        className={styles.platformBadge}
                        style={{ color: platform.color, background: platform.bg, borderColor: platform.border }}
                    >
                        {PlatformIcon ? <PlatformIcon size={11} /> : <span className={styles.xBadgeText}>{platform.xText}</span>}
                        {atom.platform}
                    </span>
                    <span className={styles.typeBadge}>
                        <TypeIcon size={11} />
                        {typeInfo.label}
                    </span>
                </div>
                <div className={styles.cardActions}>
                    <button className={styles.cardActionBtn} onClick={handleSchedule} title="Lên lịch đăng">
                        <Calendar size={13} />
                    </button>
                    <button className={styles.cardActionBtn} title="Tạo lại" onClick={(e) => e.stopPropagation()}>
                        <RefreshCw size={13} />
                    </button>
                    <button
                        className={`${styles.cardActionBtn} ${copied ? styles.cardActionCopied : ''}`}
                        onClick={handleCopy}
                        title={copied ? 'Đã sao chép!' : 'Sao chép nội dung'}
                    >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                </div>
            </div>

            {/* Title */}
            {atom.title && <h3 className={styles.cardTitle}>{atom.title}</h3>}

            {/* Content */}
            <p className={`${styles.cardContent} ${expanded ? styles.cardContentExpanded : ''}`}>
                {atom.content}
            </p>

            {isLong && (
                <button className={styles.expandBtn} onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev) }}>
                    {expanded ? <><ChevronUp size={12} /> Thu gọn</> : <><ChevronDown size={12} /> Xem thêm</>}
                </button>
            )}

            {/* Footer */}
            <div className={styles.cardFooter}>
                <div className={styles.cardHashtags}>
                    {atom.suggestedCTA && (
                        <span className={styles.ctaBadge}>↗ {atom.suggestedCTA}</span>
                    )}
                    {atom.suggestedHashtags.slice(0, 3).map(tag => (
                        <span key={tag} className={styles.hashtagBadge}>{tag}</span>
                    ))}
                </div>
                <span className={styles.charCount}>{atom.content.length} ký tự</span>
            </div>
        </div>
    )
}
