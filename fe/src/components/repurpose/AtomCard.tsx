import { useState, type ElementType } from 'react'
import {
    Copy, Check, Calendar, RefreshCw, ChevronDown, ChevronUp,
    FileText, AlignLeft, LayoutGrid, Lightbulb, Zap, Quote,
} from 'lucide-react'
import type { RepurposeAtom, AtomType } from '../../data/mockAI'
import { getPlatformById } from '../../data/platforms'
import styles from './RepurposeComponents.module.css'

interface Props {
    atom: RepurposeAtom
    index?: number
}

const TYPE_CFG: Record<AtomType, { icon: ElementType; label: string }> = {
    POST:     { icon: FileText,    label: 'Post' },
    THREAD:   { icon: AlignLeft,   label: 'Thread' },
    CAROUSEL: { icon: LayoutGrid,  label: 'Carousel' },
    INSIGHT:  { icon: Lightbulb,   label: 'Insight' },
    TIP:      { icon: Zap,         label: 'Tip' },
    QUOTE:    { icon: Quote,       label: 'Quote' },
}

export default function AtomCard({ atom, index = 0 }: Props) {
    const [copied, setCopied] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const platformDef = getPlatformById(atom.platform) ?? getPlatformById('linkedin')!
    const platform = {
        color: platformDef.color,
        bg: platformDef.bg,
        border: platformDef.border,
        xText: platformDef.xText,
    }
    const typeInfo = TYPE_CFG[atom.type]
    const TypeIcon = typeInfo.icon
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

    return (
        <div
            className={styles.atomCard}
            style={{
                '--card-color': platform.color,
                '--card-border': platform.border,
                animationDelay: `${index * 0.06}s`,
            } as React.CSSProperties}
        >
            {/* Left accent bar */}
            <div className={styles.cardAccent} style={{ background: platform.color }} />

            {/* Header */}
            <div className={styles.cardHeader}>
                <div className={styles.cardBadges}>
                    <span
                        className={styles.platformBadge}
                        style={{ color: platform.color, background: platform.bg, borderColor: platform.border }}
                    >
                        <span className={styles.xBadgeText}>{platform.xText}</span>
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
                    <button className={styles.cardActionBtn} title="Tạo lại">
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
                <button className={styles.expandBtn} onClick={() => setExpanded(e => !e)}>
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
