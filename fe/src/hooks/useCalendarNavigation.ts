import { useState, useCallback } from 'react'
import type { ViewMode } from '../types/calendar'

export function useCalendarNavigation() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate())

  const prevMonth = useCallback(() => {
    setMonth(m => {
      if (m === 0) {
        setYear(y => y - 1)
        return 11
      }
      return m - 1
    })
    setSelectedDay(null)
  }, [])

  const nextMonth = useCallback(() => {
    setMonth(m => {
      if (m === 11) {
        setYear(y => y + 1)
        return 0
      }
      return m + 1
    })
    setSelectedDay(null)
  }, [])

  const prevWeek = () => {
    const d = new Date(year, month, (selectedDay ?? new Date().getDate()) - 7)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelectedDay(d.getDate())
  }

  const nextWeek = () => {
    const d = new Date(year, month, (selectedDay ?? new Date().getDate()) + 7)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelectedDay(d.getDate())
  }

  const prevDay = () => {
    const d = new Date(year, month, (selectedDay ?? new Date().getDate()) - 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelectedDay(d.getDate())
  }

  const nextDay = () => {
    const d = new Date(year, month, (selectedDay ?? new Date().getDate()) + 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelectedDay(d.getDate())
  }

  const goToday = useCallback(() => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelectedDay(now.getDate())
  }, [])

  const goToDate = useCallback((y: number, m: number, d?: number) => {
    setYear(y)
    setMonth(m)
    setSelectedDay(d ?? null)
  }, [])

  return {
    year,
    month,
    selectedDay,
    setSelectedDay,
    setMonth,
    setYear,
    prevMonth,
    nextMonth,
    prevWeek,
    nextWeek,
    prevDay,
    nextDay,
    goToday,
    goToDate
  }
}

export function useCalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [platformFilter, setPlatformFilter] = useState('all')

  return {
    viewMode,
    setViewMode,
    platformFilter,
    setPlatformFilter
  }
}