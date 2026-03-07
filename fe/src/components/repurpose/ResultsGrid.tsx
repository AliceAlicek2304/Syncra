import { useState } from 'react'
import { Download, Sparkles, Linkedin, Instagram, Mail } from 'lucide-react'
import type { ElementType } from 'react'
import { useRepurpose } from '../../context/repurposeContextBase'
import type { RepurposePlatform } from '../../data/mockAI'
import AtomCard from './AtomCard.tsx'
import styles from './RepurposeComponents.module.css'

interface PlatformMeta { icon?: ElementType; color: string }

const PLATFORM_META: Record<string, PlatformMeta> = {
    All: { color: '#a78bfa' },
    LinkedIn: { icon: Linkedin, color: '#60a5fa' },
    X: { color: '#e2e8f0' },
    Instagram: { icon: Instagram, color: '#f472b6' },
    Newsletter: { icon: Mail, color: '#fbbf24' },
}

function SkeletonCard() {
    return (
        <div className={styles.skeletonCard}>
            <div className={styles.skeletonHeader}>
                <div className={styles.skeletonBadge} />
                <div className={styles.skeletonBadge} style={{ width: 54 }} />
            </div>
            <div className={styles.skeletonLine} style={{ width: '65%' }} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ width: '80%' }} />
            <div className={styles.skeletonLine} style={{ width: '45%' }} />
        </div>
    )
}

export default function ResultsGrid() {
    const { results, isGenerating } = useRepurpose()
    const [activeFilter, setActiveFilter] = useState<RepurposePlatform | 'All'>('All')

    const usedPlatforms = Array.from(new Set(results.map(r => r.platform))) as RepurposePlatform[]
    const filterTabs = ['All', ...usedPlatforms] as (RepurposePlatform | 'All')[]

    const filtered = activeFilter === 'All' ? results : results.filter(r => r.platform === activeFilter)

    const handleExport = () => {
        const text = results.map(a =>
            `[${a.platform} – ${a.type}]${a.title ? '\n' + a.title : ''}\n${a.content}\n${a.suggestedHashtags.join(' ')}`
        ).join('\n\n---\n\n')
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'repurposed-content.txt'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
                <div className={styles.resultsInfo}>
                    <Sparkles size={14} className={styles.sparkleIcon} />
                    {isGenerating ? (
                        <span className={styles.generatingText}>AI đang phân tích nội dung...</span>
                    ) : (
                        <span className={styles.resultsCount}>
                            <strong>{results.length}</strong> nội dung được tạo
                        </span>
                    )}
                </div>

                {results.length > 0 && (
                    <div className={styles.platformTabs}>
                        {filterTabs.map(p => {
                            const meta = PLATFORM_META[p] ?? { color: '#a78bfa' }
                            const Icon = meta.icon
                            const count = p === 'All' ? results.length : results.filter(r => r.platform === p).length
                            return (
                                <button
                                    key={p}
                                    className={`${styles.platformTab} ${activeFilter === p ? styles.platformTabActive : ''}`}
                                    style={activeFilter === p ? { '--tab-color': meta.color } as React.CSSProperties : {}}
                                    onClick={() => setActiveFilter(p)}
                                >
                                    {Icon && <Icon size={12} />}
                                    <span>{p} ({count})</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {results.length > 0 && (
                    <button className={styles.exportBtn} onClick={handleExport}>
                        <Download size={13} />
                        Xuất tất cả
                    </button>
                )}
            </div>

            {isGenerating ? (
                <div className={styles.resultsGrid}>
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : (
                <div className={styles.resultsGrid}>
                    {filtered.map((atom, i) => (
                        <AtomCard key={atom.id} atom={atom} index={i} />
                    ))}
                </div>
            )}
        </div>
    )
}
