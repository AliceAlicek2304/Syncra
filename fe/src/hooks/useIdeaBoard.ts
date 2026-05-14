import { useState, useMemo } from 'react'
import {
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent } from '@dnd-kit/core'
import {
    arrayMove,
} from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups'
import type { Group } from '../api/groups'
import { ideasApi } from '../api/ideas'
import type { Idea } from '../api/ideas'

export { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'

export interface UseIdeaBoardReturn {
    sensors: ReturnType<typeof useSensors>
    activeId: string | null
    activeIdea: Idea | null
    handleDragStart: (event: DragStartEvent) => void
    handleDragOver: (event: DragOverEvent) => void
    handleDragEnd: () => void
    groups: Group[]
    ideas: Idea[]
    isLoading: boolean
    createIdea: (data: { groupId: string; title: string; description?: string }) => void
    saveIdea: (idea: Idea) => void
    deleteIdea: (id: string) => void
    moveIdea: (id: string, groupId: string) => void
    addGroup: (name: string) => void
    renameGroup: (id: string, name: string) => void
    deleteGroup: (id: string) => void
}

export const defaultGroupIds = ['unassigned', 'todo', 'inprogress', 'done']

export function useIdeaBoard(workspaceId?: string): UseIdeaBoardReturn {
    const queryClient = useQueryClient()

    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ['groups', workspaceId],
        queryFn: () => groupsApi.getGroups(workspaceId!),
        enabled: !!workspaceId,
    })

    const { data: ideas = [], isLoading: ideasLoading } = useQuery({
        queryKey: ['ideas', workspaceId],
        queryFn: () => ideasApi.getIdeas(workspaceId!),
        enabled: !!workspaceId,
    })

    const isLoading = groupsLoading || ideasLoading

    const createIdeaMutation = useMutation({
        mutationFn: (data: { groupId: string; title: string; description?: string }) =>
            ideasApi.createIdea(workspaceId!, { ...data, status: 'idea' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    const updateIdeaMutation = useMutation({
        mutationFn: ({ ideaId, data }: { ideaId: string; data: Parameters<typeof ideasApi.updateIdea>[2] }) =>
            ideasApi.updateIdea(workspaceId!, ideaId, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    const deleteIdeaMutation = useMutation({
        mutationFn: (ideaId: string) => ideasApi.deleteIdea(workspaceId!, ideaId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: string[]) => ideasApi.reorderIdeas(workspaceId!, orderedIds),
        onError: () => queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] }),
    })

    const createGroupMutation = useMutation({
        mutationFn: (name: string) => groupsApi.createGroup(workspaceId!, { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', workspaceId] }),
    })

    const updateGroupMutation = useMutation({
        mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
            groupsApi.updateGroup(workspaceId!, groupId, { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', workspaceId] }),
    })

    const deleteGroupMutation = useMutation({
        mutationFn: (groupId: string) => groupsApi.deleteGroup(workspaceId!, groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups', workspaceId] })
            queryClient.invalidateQueries({ queryKey: ['ideas', workspaceId] })
        },
    })

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

    const [activeId, setActiveId] = useState<string | null>(null)

    const activeIdea = useMemo(
        () => (activeId ? ideas.find(i => i.id === activeId) ?? null : null),
        [activeId, ideas])

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

            if (isOverIdea) {
                const overIndex = prev.findIndex(i => i.id === overId)
                const overIdea = prev[overIndex]
                if (activeIdea.groupId !== overIdea.groupId) {
                    const newIdeas = [...prev]
                    newIdeas[activeIndex] = { ...activeIdea, groupId: overIdea.groupId }
                    return arrayMove(newIdeas, activeIndex, overIndex)
                } else {
                    return arrayMove(prev, activeIndex, overIndex)
                }
            }

            if (isOverColumn) {
                const overGroupId = String(overId)
                if (activeIdea.groupId !== overGroupId) {
                    const newIdeas = [...prev]
                    newIdeas[activeIndex] = { ...activeIdea, groupId: overGroupId }
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

    const createIdea = (data: { groupId: string; title: string; description?: string }) => {
        createIdeaMutation.mutate(data)
    }

    const saveIdea = (updated: Idea) => {
        updateIdeaMutation.mutate({
            ideaId: updated.id,
            data: { title: updated.title, description: updated.description },
        })
    }

    const deleteIdea = (id: string) => {
        deleteIdeaMutation.mutate(id)
    }

    const moveIdea = (id: string, groupId: string) => {
        updateIdeaMutation.mutate({ ideaId: id, data: { groupId } })
    }

    const addGroup = (name: string) => {
        createGroupMutation.mutate(name)
    }

    const renameGroup = (id: string, name: string) => {
        updateGroupMutation.mutate({ groupId: id, name })
    }

    const deleteGroup = (id: string) => {
        deleteGroupMutation.mutate(id)
    }

    return {
        sensors,
        activeId,
        activeIdea,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        groups,
        ideas,
        isLoading,
        createIdea,
        saveIdea,
        deleteIdea,
        moveIdea,
        addGroup,
        renameGroup,
        deleteGroup,
    }
}
