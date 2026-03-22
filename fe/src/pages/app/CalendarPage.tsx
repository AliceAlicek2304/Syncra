import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useCalendar } from '../../context/calendarContextBase'
import { useCreatePostModal } from '../../context/createPostModalContext'
import { useCalendarNavigation, useCalendarView } from '../../hooks/useCalendarNavigation'
import Toast from '../../components/Toast'
import CalendarHeader from '../../components/calendar/CalendarHeader'
import CalendarToolbar from '../../components/calendar/CalendarToolbar'
import MonthView from '../../components/calendar/MonthView'
import WeekView from '../../components/calendar/WeekView'
import DayView from '../../components/calendar/DayView'
import CalendarDetailPanel from '../../components/calendar/CalendarDetailPanel'
import CalendarTooltip from '../../components/calendar/CalendarTooltip'
import type { CalPost } from '../../types/calendar'
import { getPostKey } from '../../types/calendar'
import styles from './CalendarPage.module.css'












export default function CalendarPage() {
  const { posts: contextPosts, updatePost } = useCalendar()
  const { openCreatePost, openEditPost } = useCreatePostModal()

  // Use custom hooks for state management
  const navigation = useCalendarNavigation()
  const view = useCalendarView()

  const [compactMode, setCompactMode] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(true)

  // Update today every minute to handle midnight crossover
  useEffect(() => {
    const interval = setInterval(() => {
      // Update logic can be added later if needed
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    post: CalPost
    x: number
    y: number
  } | null>(null)

  // Drag state
  const [dragPostId, setDragPostId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)






  const allPostsByKey = useMemo(() => {
    const merged: Record<string, CalPost[]> = {}
    contextPosts.forEach(p => {
      const key = getPostKey(p.year, p.month, p.day)
      const cp: CalPost = {
        id: p.id, title: p.title, platform: p.platform,
        status: p.status, time: p.time, color: p.color,
        caption: p.caption, hashtags: p.hashtags, image: p.image,
        mediaIds: p.mediaIds, integrationId: p.integrationId,
        isMock: false
      }
      merged[key] = [...(merged[key] ?? []), cp]
    })
    return merged
  }, [contextPosts])


  const filteredPostsByKey = useMemo(() => {
    if (view.platformFilter === 'all') return allPostsByKey
    const result: Record<string, CalPost[]> = {}
    Object.entries(allPostsByKey).forEach(([key, posts]) => {
      const filtered = posts.filter(p => p.platform === view.platformFilter)
      if (filtered.length > 0) result[key] = filtered
    })
    return result
  }, [allPostsByKey, view.platformFilter])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      if (view.viewMode === 'month') navigation.prevMonth()
      else if (view.viewMode === 'week') navigation.prevWeek()
      else navigation.prevDay()
    } else if (e.key === 'ArrowRight') {
      if (view.viewMode === 'month') navigation.nextMonth()
      else if (view.viewMode === 'week') navigation.nextWeek()
      else navigation.nextDay()
    } else if (e.key === 't' || e.key === 'T') {
      navigation.goToday()
    }
  }, [view.viewMode, navigation])

  // Current time position for week/day view - updates every minute
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(() => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    if (hours < 6 || hours >= 24) return null
    return ((hours - 6) * 60 + minutes)
  })

  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      if (hours < 6 || hours >= 24) {
        setCurrentTimePosition(null)
      } else {
        setCurrentTimePosition((hours - 6) * 60 + minutes)
      }
    }
    updateCurrentTime()
    const interval = setInterval(updateCurrentTime, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])



  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault(); setDragOverKey(key)
  }
  const handleDrop = (e: React.DragEvent, targetYear: number, targetMonth: number, targetDay: number) => {
    e.preventDefault()
    if (!dragPostId) return
    // Only move context posts (not mock)
    updatePost(dragPostId, { year: targetYear, month: targetMonth, day: targetDay })
    setDragPostId(null); setDragOverKey(null)
  }


  const openCreateForDay = (y: number, m: number, d: number) => {
    openCreatePost({ source: 'calendar', initialDate: { year: y, month: m, day: d } })
  }

  const handleOpenEditPost = (post: CalPost) => {
    if (post.isMock) return
    const sp = contextPosts.find(p => p.id === post.id)
    if (sp) { openEditPost(sp) }
  }




  const selectedPosts = useMemo(() => {
    if (!navigation.selectedDay) return []
    return filteredPostsByKey[getPostKey(navigation.year, navigation.month, navigation.selectedDay)] ?? []
  }, [filteredPostsByKey, navigation.year, navigation.month, navigation.selectedDay])







  return (
    <div className={styles.page} onKeyDown={handleKeyDown} tabIndex={-1}>
      <CalendarHeader onNewPost={() => openCreatePost({ source: 'calendar' })} />

      <CalendarToolbar
        viewMode={view.viewMode}
        onViewModeChange={view.setViewMode}
        year={navigation.year}
        month={navigation.month}
        platformFilter={view.platformFilter}
        onPlatformFilterChange={view.setPlatformFilter}
        onPrev={navigation.prevMonth}
        onNext={navigation.nextMonth}
        onToday={navigation.goToday}
        onMonthChange={navigation.setMonth}
        onYearChange={navigation.setYear}
        onSelectedDayChange={navigation.setSelectedDay}
        compactMode={compactMode}
        onCompactModeChange={setCompactMode}
      />

      <div className={`${styles.body} ${view.viewMode !== 'month' ? styles.bodyFull : ''}`}>
        {view.viewMode === 'month' && (
          <MonthView
            year={navigation.year}
            month={navigation.month}
            selectedDay={navigation.selectedDay}
            filteredPostsByKey={filteredPostsByKey}
            onDayClick={navigation.setSelectedDay}
            onCreatePost={openCreateForDay}
            onEditPost={handleOpenEditPost}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverKey={dragOverKey}
            setDragOverKey={setDragOverKey}
            dragPostId={dragPostId}
            onTooltipData={setTooltipData}
            compactMode={compactMode}
          />
        )}
        {view.viewMode === 'week' && (
          <WeekView
            year={navigation.year}
            month={navigation.month}
            selectedDay={navigation.selectedDay}
            filteredPostsByKey={filteredPostsByKey}
            onDayClick={navigation.goToDate}
            onCreatePost={openCreateForDay}
            onEditPost={handleOpenEditPost}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverKey={dragOverKey}
            setDragOverKey={setDragOverKey}
            dragPostId={dragPostId}
            currentTimePosition={currentTimePosition}
          />
        )}
        {view.viewMode === 'day' && (
          <DayView
            year={navigation.year}
            month={navigation.month}
            selectedDay={navigation.selectedDay}
            filteredPostsByKey={filteredPostsByKey}
            onCreatePost={openCreateForDay}
            onEditPost={handleOpenEditPost}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverKey={dragOverKey}
            setDragOverKey={setDragOverKey}
            dragPostId={dragPostId}
            currentTimePosition={currentTimePosition}
          />
        )}

        {view.viewMode === 'month' && (
          <CalendarDetailPanel
            selectedDay={navigation.selectedDay}
            month={navigation.month}
            year={navigation.year}
            selectedPosts={selectedPosts}
            onCreatePost={openCreateForDay}
            onEditPost={handleOpenEditPost}
          />
        )}
      </div>

      {tooltipData && (
        <CalendarTooltip
          post={tooltipData.post}
          x={tooltipData.x}
          y={tooltipData.y}
        />
      )}

      <Toast />
    </div>
  )
}