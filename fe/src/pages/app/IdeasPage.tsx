import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Lightbulb, PlusCircle, X } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import type { Idea } from '../../api/ideas'
import type { GeneratedIdea } from '../../components/AIIdeaGenerator'
import { useIdeaBoard, DndContext, DragOverlay, closestCorners } from '../../hooks/useIdeaBoard'
import Skeleton from '../../components/Skeleton'
import AIIdeaGenerator from '../../components/AIIdeaGenerator'
import EditIdeaModal from '../../components/EditIdeaModal'
import { GroupCard } from '../../components/ideas/GroupCard'
import { OverlayCard } from '../../components/ideas/IdeaCard'
import styles from './IdeasPage.module.css'

const defaultGroupIds = ['unassigned', 'todo', 'inprogress', 'done']

// ─── Quick Add Modal ──────────────────────────────────────────────
interface QuickAddProps {
    groupId: string
    onAdd: (groupId: string, title: string) => void
    onClose: () => void
}

function QuickAddModal({ groupId, onAdd, onClose }: QuickAddProps) {
    const [title, setTitle] = useState('')
    const handleAdd = () => {
        if (title.trim()) { onAdd(groupId, title.trim()); onClose() }
    }
    return (
        <motion.div
            className={styles.editOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.editModal}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: 420 }}
            >
                <div className={styles.editModalHeader}>
                    <h3 className={styles.editModalTitle}>New Idea</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
                </div>
                <div className={styles.editModalBody}>
                    <div className={styles.editField}>
                        <label className={styles.editLabel}>Title</label>
                        <input
                            autoFocus
                            className={styles.editInput}
                            placeholder="Enter idea title…"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onClose() }}
                        />
                    </div>
                </div>
                <div className={styles.editModalFooter}>
                    <button className="btn-secondary" onClick={onClose} style={{ fontSize: 13 }}>Cancel</button>
                    <button className="btn-primary" onClick={handleAdd} disabled={!title.trim()}>Add Idea</button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function IdeasPage() {
    const { activeWorkspace } = useWorkspace()
    const workspaceId = activeWorkspace?.id ?? ''

    const {
        sensors, activeIdea,
        handleDragStart, handleDragOver, handleDragEnd,
        groups, ideas, isLoading,
        createIdea, saveIdea, deleteIdea, moveIdea,
        addGroup, renameGroup, deleteGroup,
    } = useIdeaBoard(workspaceId)

    const [showAIModal, setShowAIModal] = useState(false)
    const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
    const [quickAddGroupId, setQuickAddGroupId] = useState<string | null>(null)
    const [newGroupName, setNewGroupName] = useState('')
    const [addingGroup, setAddingGroup] = useState(false)

    const handleSelectAIIdea = (generated: GeneratedIdea) => {
        createIdea({
            groupId: groups[0]?.id || 'unassigned',
            title: generated.title,
            description: generated.description,
        })
        setShowAIModal(false)
    }

    const handleAddGroup = () => {
        if (!newGroupName.trim()) return
        addGroup(newGroupName.trim())
        setNewGroupName('')
        setAddingGroup(false)
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}><Lightbulb size={20} /></div>
                    <div>
                        <h1 className={styles.title}>Ideas</h1>
                        <p className={styles.subtitle}>Organize and track your content ideas</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.newGroupBtn} onClick={() => setAddingGroup(true)}>
                        <PlusCircle size={14} />
                        <span>New Group</span>
                    </button>
                    <button className={`btn-primary ${styles.aiBtn}`} onClick={() => setShowAIModal(true)}>
                        <Sparkles size={15} />
                        Generate with AI
                    </button>
                </div>
            </div>

            {/* Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                {isLoading ? (
                    <div className={styles.board}>
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} style={{
                                background: 'rgba(13, 17, 28, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: 16,
                                width: 280,
                                minWidth: 280,
                                padding: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                flexShrink: 0,
                            }}>
                                <Skeleton height="40px" />
                                <Skeleton height="120px" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.board}>
                        {groups.map(group => {
                            const groupIdeas = ideas.filter(i => i.groupId === group.id)
                            return (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    ideas={groupIdeas}
                                    groups={groups}
                                    onAddIdea={setQuickAddGroupId}
                                    onEditIdea={setEditingIdea}
                                    onDeleteIdea={deleteIdea}
                                    onMoveIdea={moveIdea}
                                    onRenameGroup={renameGroup}
                                    onDeleteGroup={deleteGroup}
                                    isDefault={defaultGroupIds.includes(group.id)}
                                />
                            )
                        })}

                        {addingGroup ? (
                            <div className={styles.newGroupColumn}>
                                <input
                                    autoFocus
                                    className={styles.newGroupInput}
                                    placeholder="Group name…"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddGroup()
                                        if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
                                    }}
                                />
                                <div className={styles.newGroupActions}>
                                    <button className="btn-primary" onClick={handleAddGroup} disabled={!newGroupName.trim()} style={{ fontSize: 13, padding: '8px 16px' }}>Add</button>
                                    <button className="btn-secondary" onClick={() => { setAddingGroup(false); setNewGroupName('') }} style={{ fontSize: 13, padding: '8px 16px' }}>Cancel</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <DragOverlay>
                    {activeIdea ? <OverlayCard idea={activeIdea} /> : null}
                </DragOverlay>
            </DndContext>

            {/* AI Generator Modal */}
            <AnimatePresence>
                {showAIModal && (
                    <AIIdeaGenerator
                        workspaceId={workspaceId}
                        onSelectIdea={handleSelectAIIdea}
                        onClose={() => setShowAIModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* Edit Idea Modal */}
            <AnimatePresence>
                {editingIdea && (
                    <EditIdeaModal
                        idea={editingIdea}
                        groups={groups}
                        onSave={saveIdea}
                        onDelete={deleteIdea}
                        onClose={() => setEditingIdea(null)}
                    />
                )}
            </AnimatePresence>

            {/* Quick Add Modal */}
            <AnimatePresence>
                {quickAddGroupId && (
                    <QuickAddModal
                        groupId={quickAddGroupId}
                        onAdd={(gid, title) => createIdea({ groupId: gid, title })}
                        onClose={() => setQuickAddGroupId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
