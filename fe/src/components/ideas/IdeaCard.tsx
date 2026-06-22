import { useState, useRef, useEffect, memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Group } from '../../api/groups'
import type { Idea } from '../../api/ideas'
import DropdownPortal from '../DropdownPortal'
import styles from './IdeaCard.module.css'

export interface IdeaCardProps {
    idea: Idea
    groups: Group[]
    onEdit: (idea: Idea) => void
    onDelete: (id: string) => void
    onMove: (id: string, groupId: string) => void
}

export const IdeaCard = memo(function IdeaCardFn({ idea, groups, onEdit, onDelete, onMove }: IdeaCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({
            id: idea.id,
            data: { type: 'Idea', idea },
        })

    const [openMenu, setOpenMenu] = useState(false)
    const [showMoveMenu, setShowMoveMenu] = useState(false)
    const btnRef = useRef<HTMLButtonElement>(null)
    const moveItemRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const subMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!openMenu) return
        const handler = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                btnRef.current?.contains(target) ||
                dropdownRef.current?.contains(target) ||
                subMenuRef.current?.contains(target)
            ) return
            setOpenMenu(false)
            setShowMoveMenu(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [openMenu])

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    }

    const handleClick = () => {
        if (!isDragging) onEdit(idea)
    }

    const handleMenuBtn = (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpenMenu(v => {
            if (v) setShowMoveMenu(false)
            return !v
        })
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpenMenu(false)
        onDelete(idea.id)
    }

    const handleMoveClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowMoveMenu(v => !v)
    }

    const handleMoveTo = (e: React.MouseEvent, groupId: string) => {
        e.stopPropagation()
        onMove(idea.id, groupId)
        setOpenMenu(false)
        setShowMoveMenu(false)
    }

    const otherGroups = groups.filter(g => g.id !== idea.groupId)

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className={`${styles.ideaCard} ${isDragging ? styles.ideaCardDragging : ''}`}
            onClick={handleClick}
            {...attributes}
            {...listeners}
            whileHover={{ y: -2, borderColor: 'var(--clr-primary)', boxShadow: '0 8px 24px rgba(168, 85, 247, 0.08)' }}
            transition={{ duration: 0.2 }}
        >
            <div className={styles.ideaCardContent}>
                <p className={styles.ideaCardTitle}>{idea.title}</p>
                {idea.description && (
                    <p className={styles.ideaCardDesc}>{idea.description}</p>
                )}
            </div>

            <div
                className={styles.cardMenuWrapper}
                onMouseDown={e => e.stopPropagation()}
            >
                <button
                    ref={btnRef}
                    className={styles.cardMenuBtn}
                    onClick={handleMenuBtn}
                    title="More options"
                >
                    <MoreHorizontal size={14} />
                </button>
            </div>

            <DropdownPortal anchorRef={btnRef} isOpen={openMenu} width={160}>
                <div ref={dropdownRef} className={styles.cardDropdown}>
                    <div className={styles.cardDropdownItem} onClick={handleMoveClick} ref={moveItemRef}>
                        <span>Move to group</span>
                        <span className={styles.cardDropdownChevron}>›</span>
                    </div>
                    <div
                        className={`${styles.cardDropdownItem} ${styles.cardDropdownItemDanger}`}
                        onClick={handleDelete}
                    >
                        Delete
                    </div>
                </div>
            </DropdownPortal>

            <DropdownPortal anchorRef={moveItemRef} isOpen={openMenu && showMoveMenu} width={150}>
                <div ref={subMenuRef} className={styles.cardDropdown}>
                    {otherGroups.length === 0 ? (
                        <div className={`${styles.cardDropdownItem} ${styles.cardDropdownItemMuted}`}>
                            No other groups
                        </div>
                    ) : otherGroups.map(g => (
                        <div
                            key={g.id}
                            className={styles.cardDropdownItem}
                            onClick={e => handleMoveTo(e, g.id)}
                        >
                            {g.name}
                        </div>
                    ))}
                </div>
            </DropdownPortal>
        </motion.div>
    )
})

export function OverlayCard({ idea }: { idea: Idea }) {
    return (
        <div className={`${styles.ideaCard} ${styles.ideaCardOverlay}`} style={{ cursor: 'grabbing' }}>
            <div className={styles.ideaCardContent}>
                <p className={styles.ideaCardTitle}>{idea.title}</p>
                {idea.description && (
                    <p className={styles.ideaCardDesc}>{idea.description}</p>
                )}
            </div>
        </div>
    )
}
