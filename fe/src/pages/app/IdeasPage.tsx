import { useState, useRef, useEffect } from 'react'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent } from '@dnd-kit/core'
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Sparkles, Plus, X, Lightbulb, PlusCircle, Check, MoreHorizontal } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '../../context/WorkspaceContext'
import { groupsApi } from '../../api/groups'
import type { Group } from '../../api/groups'
import { ideasApi } from '../../api/ideas'
import type { Idea } from '../../api/ideas'
import Skeleton from '../../components/Skeleton'

import AIIdeaGenerator from '../../components/AIIdeaGenerator'
import type { GeneratedIdea } from '../../components/AIIdeaGenerator'
import EditIdeaModal from '../../components/EditIdeaModal'
import DropdownPortal from '../../components/DropdownPortal'
import styles from './IdeasPage.module.css'

// ─── Idea Card ──────────────────────────────────────────────────────────────
interface IdeaCardProps {
    idea: Idea
    groups: Group[]
    onEdit: (idea: Idea) => void
    onDelete: (id: string) => void
    onMove: (id: string, groupId: string) => void
}

function IdeaCard({ idea, groups, onEdit, onDelete, onMove }: IdeaCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({
            id: idea.id,
            data: {
                type: 'Idea',
                idea
            }
        })

    const [openMenu, setOpenMenu] = useState(false)
    const [showMoveMenu, setShowMoveMenu] = useState(false)
    const btnRef = useRef<HTMLButtonElement>(null)
    const moveItemRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const subMenuRef = useRef<HTMLDivElement>(null)

    // Close on outside click — must watch portal content too
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
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.ideaCard} ${isDragging ? styles.ideaCardDragging : ''}`}
            onClick={handleClick}
            {...attributes}
            {...listeners}
        >
            <div className={styles.ideaCardContent}>
                <p className={styles.ideaCardTitle}>{idea.title}</p>
                {idea.description && (
                    <p className={styles.ideaCardDesc}>{idea.description}</p>
                )}
            </div>

            {/* 3-dot menu button — stays in card for hover detection */}
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

            {/* Main dropdown — rendered via portal at body level */}
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

            {/* Submenu — also via portal, anchored to move item */}
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
        </div>
    )
}

// ─── Overlay Card (ghost during drag) ──────────────────────────────────────
function OverlayCard({ idea }: { idea: Idea }) {
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

// ─── Column ────────────────────────────────────────────────────────────────
interface ColumnProps {
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

function Column({ group, ideas, groups, onAddIdea, onEditIdea, onDeleteIdea, onMoveIdea, onRenameGroup, onDeleteGroup, isDefault }: ColumnProps) {
    const [renaming, setRenaming] = useState(false)
    const [renameVal, setRenameVal] = useState(group.name)

    const { setNodeRef } = useDroppable({
        id: group.id,
        data: {
            type: 'Column',
            group
        }
    })

    const handleRenameSubmit = () => {
        if (renameVal.trim()) onRenameGroup(group.id, renameVal.trim())
        setRenaming(false)
    }

    const ideaIds = ideas.map(i => i.id)

    return (
        <div className={styles.column} ref={setNodeRef}>
            {/* Column header */}
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

            {/* Cards */}
            <SortableContext items={ideaIds} strategy={verticalListSortingStrategy}>
                <div className={styles.cardList}>
                    {ideas.map(idea => (
                        <IdeaCard key={idea.id} idea={idea} groups={groups} onEdit={onEditIdea} onDelete={onDeleteIdea} onMove={onMoveIdea} />
                    ))}
                </div>
            </SortableContext>

            {/* Add idea button */}
            <button className={styles.addIdeaBtn} onClick={() => onAddIdea(group.id)}>
                <Plus size={14} />
                <span>New Idea</span>
            </button>
        </div>
    )
}


// ─── Quick Add Modal ────────────────────────────────────────────────────────
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
        <div className={styles.editOverlay} onClick={onClose}>
            <div className={styles.editModal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
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
            </div>
        </div>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function IdeasPage() {
    const { activeWorkspace } = useWorkspace()
    const workspaceId = activeWorkspace?.id ?? ''
    const queryClient = useQueryClient()

    // Fetch groups (board columns) from backend (D-13)
    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ['groups', workspaceId],
        queryFn: () => groupsApi.getGroups(workspaceId),
        enabled: !!workspaceId,
    })

    // Fetch ideas from backend
    const { data: ideas = [], isLoading: ideasLoading } = useQuery({
        queryKey: ['ideas', workspaceId],
        queryFn: () => ideasApi.getIdeas(workspaceId),
        enabled: !!workspaceId,
    })

    const isLoading = groupsLoading || ideasLoading

    const [activeId, setActiveId] = useState<string | null>(null)
    const [showAIModal, setShowAIModal] = useState(false)
    const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
    const [quickAddGroupId, setQuickAddGroupId] = useState<string | null>(null)
    const [newGroupName, setNewGroupName] = useState('')
    const [addingGroup, setAddingGroup] = useState(false)

    // Create idea mutation
    const createIdeaMutation = useMutation({
        mutationFn: (data: { groupId: string; title: string; description?: string }) =>
            ideasApi.createIdea(workspaceId, { ...data, status: 'idea' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    // Update idea mutation
    const updateIdeaMutation = useMutation({
        mutationFn: ({ ideaId, data }: { ideaId: string; data: Parameters<typeof ideasApi.updateIdea>[2] }) =>
            ideasApi.updateIdea(workspaceId, ideaId, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    // Delete idea mutation
    const deleteIdeaMutation = useMutation({
        mutationFn: (ideaId: string) => ideasApi.deleteIdea(workspaceId, ideaId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    // Reorder mutation
    const reorderMutation = useMutation({
        mutationFn: (orderedIds: string[]) => ideasApi.reorderIdeas(workspaceId, orderedIds),
        onError: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    const createGroupMutation = useMutation({
        mutationFn: (name: string) => groupsApi.createGroup(workspaceId, { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', workspaceId] }),
    })

    const updateGroupMutation = useMutation({
        mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
            groupsApi.updateGroup(workspaceId, groupId, { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', workspaceId] }),
    })

    const deleteGroupMutation = useMutation({
        mutationFn: (groupId: string) => groupsApi.deleteGroup(workspaceId, groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups', workspaceId] })
            queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] })
        },
    })

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(String(active.id))
    }

    const handleDragOver = ({ active, over }: DragOverEvent) => {
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const isActiveIdea = active.data.current?.type === 'Idea'
        const isOverIdea = over.data.current?.type === 'Idea'
        const isOverColumn = over.data.current?.type === 'Column'

        if (!isActiveIdea) return

        queryClient.setQueryData<Idea[]>(['ideas', workspaceId], prev => {
            if (!prev) return prev
            const activeIndex = prev.findIndex(i => i.id === activeId)
            const activeIdea = prev[activeIndex]

            if (!activeIdea) return prev

            // Hovering over another Idea
            if (isOverIdea) {
                const overIndex = prev.findIndex(i => i.id === overId)
                const overIdea = prev[overIndex]

                if (activeIdea.groupId !== overIdea.groupId) {
                    // Moving idea to a different column
                    const newIdeas = [...prev]
                    newIdeas[activeIndex] = { ...activeIdea, groupId: overIdea.groupId }
                    return arrayMove(newIdeas, activeIndex, overIndex)
                } else {
                    // Reordering within the same column
                    return arrayMove(prev, activeIndex, overIndex)
                }
            }

            // Hovering over an empty Column
            if (isOverColumn) {
                const overGroupId = String(overId)
                if (activeIdea.groupId !== overGroupId) {
                    const newIdeas = [...prev]
                    newIdeas[activeIndex] = { ...activeIdea, groupId: overGroupId }
                    // Move it to the very end of the array, effectively putting it at the bottom of the column
                    return arrayMove(newIdeas, activeIndex, newIdeas.length - 1)
                }
            }

            return prev
        })
    }

    const handleDragEnd = () => {
        setActiveId(null)
        if (workspaceId) {
            reorderMutation.mutate(ideas.map(i => i.id))
        }
    }

    const addIdea = (groupId: string, title: string) => {
        createIdeaMutation.mutate({ groupId, title })
    }

    const handleSelectAIIdea = (generated: GeneratedIdea) => {
        // D-01: ideas stay in memory until user explicitly adds to board
        createIdeaMutation.mutate({
            groupId: groups[0]?.id || 'unassigned',
            title: generated.title,
            description: generated.description,
        })
        setShowAIModal(false)
    }

    const saveIdea = (updated: Idea) => {
        updateIdeaMutation.mutate({ ideaId: updated.id, data: { title: updated.title, description: updated.description } })
    }

    const deleteIdea = (id: string) => {
        deleteIdeaMutation.mutate(id)
    }

    const moveIdea = (id: string, groupId: string) => {
        updateIdeaMutation.mutate({ ideaId: id, data: { groupId } })
    }

    const addGroup = () => {
        if (!newGroupName.trim()) return
        createGroupMutation.mutate(newGroupName.trim())
        setNewGroupName('')
        setAddingGroup(false)
    }

    const renameGroup = (id: string, name: string) => {
        updateGroupMutation.mutate({ groupId: id, name })
    }

    const deleteGroup = (id: string) => {
        deleteGroupMutation.mutate(id)
    }

    const defaultGroupIds = ['unassigned', 'todo', 'inprogress', 'done']
    const activeIdea = activeId ? ideas.find(i => i.id === activeId) ?? null : null

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
                    <button
                        className={styles.newGroupBtn}
                        onClick={() => setAddingGroup(true)}
                    >
                        <PlusCircle size={14} />
                        <span>New Group</span>
                    </button>
                    <button
                        className={`btn-primary ${styles.aiBtn}`}
                        onClick={() => setShowAIModal(true)}
                    >
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
                            <div key={i} className={styles.column}>
                                <Skeleton height="40px"  />
                                <Skeleton height="120px" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.board}>
                        {groups.map(group => {
                            const groupIdeas = ideas.filter(i => i.groupId === group.id)
                            return (
                                <Column
                                    key={group.id}
                                    group={group}
                                    ideas={groupIdeas}
                                    groups={groups}
                                    onAddIdea={id => setQuickAddGroupId(id)}
                                    onEditIdea={setEditingIdea}
                                    onDeleteIdea={deleteIdea}
                                    onMoveIdea={moveIdea}
                                    onRenameGroup={renameGroup}
                                    onDeleteGroup={deleteGroup}
                                    isDefault={defaultGroupIds.includes(group.id)}
                                />
                            )
                        })}

                        {/* Add group column */}
                        {addingGroup ? (
                            <div className={styles.newGroupColumn}>
                                <input
                                    autoFocus
                                    className={styles.newGroupInput}
                                    placeholder="Group name…"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') addGroup()
                                        if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
                                    }}
                                />
                                <div className={styles.newGroupActions}>
                                    <button className="btn-primary" onClick={addGroup} disabled={!newGroupName.trim()} style={{ fontSize: 13, padding: '8px 16px' }}>Add</button>
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
            {showAIModal && (
                <AIIdeaGenerator
                    workspaceId={workspaceId}
                    onSelectIdea={handleSelectAIIdea}
                    onClose={() => setShowAIModal(false)}
                />
            )}

            {/* Edit Idea Modal */}
            {editingIdea && (
                <EditIdeaModal
                    idea={editingIdea}
                    groups={groups}
                    onSave={saveIdea}
                    onDelete={deleteIdea}
                    onClose={() => setEditingIdea(null)}
                />
            )}

            {/* Quick Add Modal */}
            {quickAddGroupId && (
                <QuickAddModal
                    groupId={quickAddGroupId}
                    onAdd={addIdea}
                    onClose={() => setQuickAddGroupId(null)}
                />
            )}
        </div>
    )
}
