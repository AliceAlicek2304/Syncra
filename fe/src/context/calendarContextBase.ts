import { createContext, useContext } from 'react'

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

export interface CalendarContextValue {
    posts: ScheduledPost[]
    addPost: (post: Omit<ScheduledPost, 'id'>) => void
    removePost: (id: string) => void
}

export const CalendarContext = createContext<CalendarContextValue | null>(null)

export function useCalendar() {
    const ctx = useContext(CalendarContext)
    if (!ctx) throw new Error('useCalendar must be used inside <CalendarProvider>')
    return ctx
}
