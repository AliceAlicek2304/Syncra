import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { shortId } from '../utils/shortId'

export interface ScheduledPost {
  id: string
  year: number
  month: number   // 0-indexed (same as Date.getMonth())
  day: number
  title: string
  platform: string
  status: 'scheduled' | 'draft'
  time: string    // "HH:MM"
  color: string
  caption: string
  hashtags: string[]
}

interface CalendarContextValue {
  posts: ScheduledPost[]
  addPost: (post: Omit<ScheduledPost, 'id'>) => void
  removePost: (id: string) => void
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([])

  const addPost = useCallback((post: Omit<ScheduledPost, 'id'>) => {
    setPosts(prev => [...prev, { ...post, id: shortId() }])
  }, [])

  const removePost = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <CalendarContext.Provider value={{ posts, addPost, removePost }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used inside <CalendarProvider>')
  return ctx
}
