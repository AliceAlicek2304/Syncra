import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { shortId } from '../utils/shortId'
import { CalendarContext } from './calendarContextBase'
import type { ScheduledPost } from './calendarContextBase'

export type { ScheduledPost, CalendarContextValue } from './calendarContextBase'

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
