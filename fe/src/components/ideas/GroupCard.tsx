import { useState, memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Idea } from '../../api/ideas'
import type { Group } from '../../api/groups'
import { IdeaCard } from './IdeaCard'
import styles from './GroupCard.module.css'

export interface GroupCardProps {
    group: Group
    ideas: Idea[]
    groups: Group[]
    onAddIdea: (groupId: string) => void
    onEditIdea: (idea: Idea) => void
    onDeleteIdea: (id: string) => void
    onMoveIdea: (id: string, groupId: string) => void
    onRenameGroup: (groupId: string, name: string) => void
    onDeleteGroup: (groupId: string) => void
    isDefault: boolean
}

export const GroupCard = memo(function GroupCardFn({
    group, ideas, groups, onAddIdea, onEditIdea, onDeleteIdea, onMoveIdea,
    onRenameGroup, onDeleteGroup, isDefault,
}: GroupCardProps) {
    const [renaming, setRenaming] = useState(false)
    const [renameVal, setRenameVal] = useState(group.name)

    const { setNodeRef } = useDroppable({
        id: group.id,
        data: { type: 'Column', group },
    })

    const handleRenameSubmit = () => {
        if (renameVal.trim()) onRenameGroup(group.id, renameVal.trim())
        setRenaming(false)
    }

    const ideaIds = ideas.map(i => i.id)

    return (
        <div className={styles.column} ref={setNodeRef}>
            <div className={styles.columnHeader}>
                {renaming ? (
                    <div className={styles.renameRow}>
                        <input
                            className={styles.renameInput}
                            value={renameVal}
                            autoFocus
                            onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameSubmit()
                                if (e.key === 'Escape') setRenaming(false)
                            }}
                            onBlur={handleRenameSubmit}
                        />
                        <button className={styles.renameOk} onClick={handleRenameSubmit}><Check size={12} /></button>
                    </div>
                ) : (
                    <button className={styles.columnTitleBtn} onDoubleClick={() => !isDefault && setRenaming(true)}>
                        <span className={styles.columnTitle}>{group.name}</span>
                    </button>
                )}
                <div className={styles.columnHeaderRow}>
                    <span className={styles.columnBadge}>{ideas.length}</span>
                    {!isDefault && (
                        <button
                            className={styles.deleteColBtn}
                            onClick={() => onDeleteGroup(group.id)}
                            title="Delete group"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            <SortableContext items={ideaIds} strategy={verticalListSortingStrategy}>
                <motion.div layout className={styles.cardList}>
                    <AnimatePresence>
                        {ideas.map(idea => (
                            <motion.div
                                key={idea.id}
                                layout
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            >
                                <IdeaCard
                                    idea={idea}
                                    groups={groups}
                                    onEdit={onEditIdea}
                                    onDelete={onDeleteIdea}
                                    onMove={onMoveIdea}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </SortableContext>

            <motion.button
                whileTap={{ scale: 0.97 }}
                className={styles.addIdeaBtn}
                onClick={() => onAddIdea(group.id)}
            >
                <Plus size={14} />
                <span>New Idea</span>
            </motion.button>
        </div>
    )
})
