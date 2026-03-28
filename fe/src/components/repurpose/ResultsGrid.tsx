import { useState } from 'react'
import { Download, Sparkles, Linkedin, Instagram, Mail, Facebook } from 'lucide-react'
import type { ElementType } from 'react'
import { useRepurpose } from '../../context/repurposeContextBase'
import { useCreatePostModal } from '../../context/createPostModalContext'
import type { RepurposePlatform, RepurposeAtom } from '../../types/ai'
import AtomCard from './AtomCard.tsx'
import RepurposeDetailModal from './RepurposeDetailModal.tsx'
import { buildRepurposeCardItems } from './cardBuilder'
import styles from './RepurposeComponents.module.css'

interface PlatformMeta { icon?: ElementType; color: string }

const PLATFORM_META: Record<string, PlatformMeta> = {
    All: { color: '#a78bfa' },
    LinkedIn: { icon: Linkedin, color: '#60a5fa' },
    X: { color: '#e2e8f0' },
    Instagram: { icon: Instagram, color: '#f472b6' },
    Facebook: { icon: Facebook, color: '#1877F2' },
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
    const { results, setResults, isGenerating, error, config } = useRepurpose()
    const { openCreatePost } = useCreatePostModal()
    const [activeFilter, setActiveFilter] = useState<RepurposePlatform | 'All'>('All')
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [viewingAtom, setViewingAtom] = useState<RepurposeAtom | null>(null)

    const selectedPlatforms = config.targetPlatforms
    const filterTabs = ['All', ...selectedPlatforms] as (RepurposePlatform | 'All')[]
    const effectiveFilter = activeFilter !== 'All' && !selectedPlatforms.includes(activeFilter) ? 'All' : activeFilter
    const filtered = buildRepurposeCardItems(results, effectiveFilter)
    const selectedCount = results.filter((atom) => selectedIds.includes(atom.id)).length

    const handleUpdateAtom = (id: string, updates: Partial<RepurposeAtom>) => {
        setResults((prev) => prev.map((atom) => 
            atom.id === id ? { ...atom, ...updates } : atom
        ))
    }

    const toggleCardSelection = (atomId: string) => {
        setSelectedIds((prev) => prev.includes(atomId) ? prev.filter(id => id !== atomId) : [...prev, atomId])
    }

    const exportAtoms = (atomsToExport: typeof results, fileName: string) => {
        const text = atomsToExport.map(a =>
            `[${a.platform} – ${a.type}]${a.title ? '\n' + a.title : ''}\n${a.content}\n${a.suggestedHashtags.join(' ')}`
        ).join('\n\n---\n\n')
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleExportSelected = () => {
        const selectedAtoms = results.filter(atom => selectedIds.includes(atom.id))
        if (selectedAtoms.length === 0) return
        exportAtoms(selectedAtoms, 'repurposed-selected-content.txt')
    }

    const handleExportAll = () => {
        exportAtoms(results, 'repurposed-content.txt')
    }

    const handleExportFile = () => {
        if (!selectionMode) {
            setSelectionMode(true)
            return
        }
        handleExportSelected()
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
                                    className={`${styles.platformTab} ${effectiveFilter === p ? styles.platformTabActive : ''}`}
                                    style={effectiveFilter === p ? { '--tab-color': meta.color } as React.CSSProperties : {}}
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
                    <div className={styles.exportActions}>
                        {selectionMode && (
                            <>
                                <span className={styles.selectedCounter}>Đã chọn {selectedCount}</span>
                                <button
                                    className={styles.exportBtn}
                                    onClick={handleExportAll}
                                >
                                    <Download size={13} />
                                    Xuất tất cả
                                </button>
                            </>
                        )}
                        <button
                            className={styles.exportBtn}
                            onClick={handleExportFile}
                            disabled={selectionMode && selectedCount === 0}
                        >
                            <Download size={13} />
                            Xuất file
                        </button>
                    </div>
                )}
            </div>

            {isGenerating ? (
                <div className={styles.resultsGrid}>
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : error ? (
                <div className={styles.repurposeError}>{error}</div>
            ) : (
                <div className={styles.resultsGrid}>
                    {filtered.map((atom, i) => (
                        <AtomCard
                            key={atom.id}
                            atom={atom}
                            index={i}
                            selectionMode={selectionMode}
                            selected={selectedIds.includes(atom.id)}
                            onToggleSelect={toggleCardSelection}
                            onView={() => setViewingAtom(atom)}
                        />
                    ))}
                </div>
            )}

            <RepurposeDetailModal
                atom={viewingAtom}
                isOpen={!!viewingAtom}
                onClose={() => setViewingAtom(null)}
                onSave={handleUpdateAtom}
                onCreatePost={(content, _title) => {
                    openCreatePost({ initialContent: content, source: 'repurpose' })
                }}
            />
        </div>
    )
}
