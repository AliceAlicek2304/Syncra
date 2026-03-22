import { useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { CalendarContext } from './calendarContextBase'
import type { ScheduledPost } from './calendarContextBase'
import { api } from '../api/axios'
import { useWorkspace } from './WorkspaceContext'
import { useIntegrations } from '../hooks/useIntegrations'

export type { ScheduledPost, CalendarContextValue } from './calendarContextBase'

// Platform color and label mappings
const PLATFORM_INFO: Record<string, { color: string; label: string }> = {
  tiktok: { color: '#8b5cf6', label: 'TikTok' },
  instagram: { color: '#ec4899', label: 'Instagram' },
  facebook: { color: '#3b82f6', label: 'Facebook' },
  x: { color: '#f59e0b', label: 'X' },
  twitter: { color: '#f59e0b', label: 'X' },
  linkedin: { color: '#22d3ee', label: 'LinkedIn' },
  youtube: { color: '#ef4444', label: 'YouTube' },
}

function mapPostToScheduled(dto: any, integrations: Array<{ id: string; platform: string; isActive: boolean }>): ScheduledPost {
  // Use scheduledAtUtc for scheduled posts, publishedAtUtc for published posts
  const dateUtc = dto.status === 'Scheduled' ? dto.scheduledAtUtc : dto.publishedAtUtc
  const d = new Date(dateUtc || Date.now())
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')

  // Map platform from integrationId
  let platform = 'TikTok'
  
  if (dto.integrationId) {
    const integration = integrations.find(i => i.id === dto.integrationId)
    if (integration) {
      const info = PLATFORM_INFO[integration.platform.toLowerCase()] || PLATFORM_INFO.tiktok
      platform = info.label
    }
  }

  // Color based on status
  const statusColor: Record<string, string> = {
    published: '#22c55e',
    scheduled: '#eab308',
    draft: '#475569',
  }

  return {
    id: dto.id,
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    title: dto.title,
    platform,
    status: dto.status?.toLowerCase() as 'scheduled' | 'draft' | 'published' || 'draft',
    time: `${h}:${m}`,
    color: statusColor[dto.status?.toLowerCase() || 'draft'] || '#8b5cf6',
    caption: dto.content || '',
    hashtags: [],
    mediaIds: dto.mediaIds || [],
    integrationId: dto.integrationId,
    // Note: image URL is loaded on-demand in edit modal from mediaIds
  }
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const { activeWorkspace } = useWorkspace()
  const { integrations } = useIntegrations()

  const refreshPosts = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/posts`)
      const mapped = res.data.map((dto: any) => mapPostToScheduled(dto, integrations))
      setPosts(mapped)
    } catch (e) {
      console.error('Failed to load scheduled posts', e)
    }
  }, [activeWorkspace, integrations])

  useEffect(() => {
    refreshPosts()
  }, [refreshPosts])

  const addPost = useCallback(async (post: Omit<ScheduledPost, 'id'>) => {
    if (!activeWorkspace) return
    const d = new Date(post.year, post.month, post.day)
    const [h, m] = post.time.split(':').map(Number)
    d.setHours(h, m, 0)
    
    try {
      const normalizedContent = (post.caption || post.title || '').trim()
      await api.post(`/workspaces/${activeWorkspace.id}/posts`, {
        title: post.title,
        content: normalizedContent,
        status: post.status,
        scheduledAtUtc: d.toISOString()
      })
      await refreshPosts()
    } catch (e) {
      console.error('Failed to add post', e)
    }
  }, [activeWorkspace, refreshPosts])

  const updatePost = useCallback(async (id: string, changes: Partial<Omit<ScheduledPost, 'id'>>) => {
    if (!activeWorkspace) return
    const current = posts.find(p => p.id === id)
    if (!current) return
    
    const merged = { ...current, ...changes }
    const d = new Date(merged.year, merged.month, merged.day)
    const [h, m] = merged.time.split(':').map(Number)
    d.setHours(h, m, 0)

    try {
      const normalizedContent = (merged.caption || merged.title || '').trim()
      await api.put(`/workspaces/${activeWorkspace.id}/posts/${id}`, {
        title: merged.title,
        content: normalizedContent,
        status: merged.status,
        scheduledAtUtc: d.toISOString()
      })
      await refreshPosts()
    } catch (e) {
      console.error('Failed to update post', e)
    }
  }, [activeWorkspace, posts, refreshPosts])

  const removePost = useCallback(async (id: string) => {
    if (!activeWorkspace) return
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/posts/${id}`)
      await refreshPosts()
    } catch (e) {
      console.error('Failed to remove post', e)
    }
  }, [activeWorkspace, refreshPosts])

  return (
    <CalendarContext.Provider value={{ posts, addPost, updatePost, removePost, refreshPosts }}>
      {children}
    </CalendarContext.Provider>
  )
}
