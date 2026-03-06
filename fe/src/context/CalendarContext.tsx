import { useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { shortId } from '../utils/shortId'
import { CalendarContext } from './calendarContextBase'
import type { ScheduledPost } from './calendarContextBase'

const LOCALSTORAGE_KEY = 'syncra_posts'

function loadPostsFromStorage(): ScheduledPost[] {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load posts from localStorage', e)
  }
  return []
}

function savePostsToStorage(posts: ScheduledPost[]) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(posts))
  } catch (e) {
    console.error('Failed to save posts to localStorage', e)
  }
}

export type { ScheduledPost, CalendarContextValue } from './calendarContextBase'

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ScheduledPost[]>(loadPostsFromStorage)

  useEffect(() => {
    savePostsToStorage(posts)
  }, [posts])

  const addPost = useCallback((post: Omit<ScheduledPost, 'id'>) => {
    setPosts(prev => [...prev, { ...post, id: shortId() }])
  }, [])

  const updatePost = useCallback((id: string, changes: Partial<Omit<ScheduledPost, 'id'>>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  }, [])

  const removePost = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <CalendarContext.Provider value={{ posts, addPost, updatePost, removePost }}>
      {children}
    </CalendarContext.Provider>
  )
}
