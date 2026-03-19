import { useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { CalendarContext } from './calendarContextBase'
import type { ScheduledPost } from './calendarContextBase'
import { api } from '../api/axios'
import { useWorkspace } from './WorkspaceContext'

export type { ScheduledPost, CalendarContextValue } from './calendarContextBase'


const mapPostToScheduled = (dto: any): ScheduledPost => {
  const d = new Date(dto.scheduledAtUtc || dto.publishedAtUtc || Date.now())
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')

  return {
    id: dto.id,
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    title: dto.title,
    platform: dto.title.includes('Instagram') ? 'Instagram' 
            : dto.title.includes('YouTube') ? 'YouTube'
            : dto.title.includes('X') ? 'X'
            : dto.title.includes('LinkedIn') ? 'LinkedIn'
            : dto.title.includes('Facebook') ? 'Facebook'
            : 'TikTok',
    status: dto.status?.toLowerCase() || 'draft',
    time: `${h}:${m}`,
    color: '#8b5cf6',
    caption: dto.content || '',
    hashtags: [],
  }
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const { activeWorkspace } = useWorkspace()

  const refreshPosts = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/posts`)
      const mapped = res.data.map(mapPostToScheduled)
      setPosts(mapped)
    } catch (e) {
      console.error('Failed to load scheduled posts', e)
    }
  }, [activeWorkspace])

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
