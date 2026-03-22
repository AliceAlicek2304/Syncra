import React, { useMemo, useState } from 'react'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import type { CalPost } from '../../types/calendar'
import { HOURS, DAYS_SHORT, getPostKey, getWeekDays, timeToSlot } from '../../types/calendar'
import VisualCard from './VisualCard'
import styles from '../../pages/app/CalendarPage.module.css'

interface WeekViewProps {
  year: number
  month: number
  selectedDay: number | null
  filteredPostsByKey: Record<string, CalPost[]>
  onDayClick: (year: number, month: number, day: number) => void
  onCreatePost: (year: number, month: number, day: number) => void
  onEditPost: (post: CalPost) => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDrop: (e: React.DragEvent, targetYear: number, targetMonth: number, targetDay: number) => void
  dragOverKey: string | null
  setDragOverKey: (key: string | null) => void
  dragPostId: string | null
  currentTimePosition: number | null
  selectedPosts: CalPost[]
  onShowDetailPanel: (show: boolean) => void
}

export default function WeekView({
  year,
  month,
  selectedDay,
  filteredPostsByKey,
  onDayClick,
  onCreatePost,
  onEditPost,
  onDragOver,
  onDrop,
  dragOverKey,
  setDragOverKey,
  dragPostId,
  currentTimePosition,
  selectedPosts,
  onShowDetailPanel
}: WeekViewProps) {
  const [today] = useState(() => new Date())
  const [now] = useState(() => new Date())

  const weekDays = useMemo(() =>
    getWeekDays(year, month, selectedDay ?? today.getDate()),
    [year, month, selectedDay, today])

  const isCurrentWeek = weekDays.some(
    ({ y, m, d }) => y === now.getFullYear() && m === now.getMonth() && d === now.getDate()
  )

  return (
    <div className={`glass-card ${styles.calCard} ${styles.weekCard}`} role="grid" aria-label="Week calendar">
      <div className={styles.weekViewHeader}>
        <h3 className={styles.weekViewTitle}>
          Week of {new Date(year, month, selectedDay ?? new Date().getDate()).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </h3>
        <button
          className={styles.detailPanelToggle}
          onClick={() => onShowDetailPanel(!selectedPosts.length)}
          title="Toggle detail panel"
        >
          {selectedPosts.length ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <div className={styles.weekHeader} role="row">
        <div className={styles.weekTimeGutter} />
        {weekDays.map(({ y, m, d }) => {
          const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
          const isSelected = d === selectedDay && m === month && y === year
          return (
            <div
              key={`${y}-${m}-${d}`}
              className={`${styles.weekColHeader} ${isToday ? styles.weekColToday : ''} ${isSelected ? styles.weekColSelected : ''}`}
              onClick={() => onDayClick(y, m, d)}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${DAYS_SHORT[new Date(y, m, d).getDay()]}, ${m + 1}/${d}/${y}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onDayClick(y, m, d)
                }
              }}
            >
              <span className={styles.weekColDay}>{DAYS_SHORT[new Date(y, m, d).getDay()]}</span>
              <span className={styles.weekColNum}>{d}</span>
            </div>
          )
        })}
      </div>

      <div className={styles.weekBody} role="rowgroup">
        {HOURS.map(hour => (
          <div key={hour} className={styles.weekRow} role="row">
            <div className={styles.weekTimeLabel} aria-label={`${hour}:00`}>{String(hour).padStart(2, '0')}:00</div>
            {weekDays.map(({ y, m, d }) => {
              const key = getPostKey(y, m, d)
              const postsInSlot = (filteredPostsByKey[key] ?? []).filter(p => {
                const slot = timeToSlot(p.time)
                return slot >= 0 && slot >= (hour - 6) * 60 && slot < (hour - 6 + 1) * 60
              })
              const isDragOver = dragOverKey === key
              const isTodayCell = y === today.getFullYear() && m === today.getMonth() && d === today.getDate()
              const isCurrentHour = isTodayCell && hour === now.getHours()

              return (
                <div
                  key={`${key}-${hour}`}
                  className={`${styles.weekCell} ${isDragOver ? styles.cellDragOver : ''} ${isCurrentHour ? styles.weekCellCurrentHour : ''}`}
                  onClick={() => onCreatePost(y, m, d)}
                  onDragOver={e => onDragOver(e, key)}
                  onDrop={e => onDrop(e, y, m, d)}
                  onDragLeave={() => setDragOverKey(null)}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${m + 1}/${d}/${y}, ${hour}:00 - ${postsInSlot.length} posts`}
                >
                  {postsInSlot.slice(0, 2).map(p => (
                    <VisualCard
                      key={p.id}
                      post={p}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (p.isMock) return
                        onEditPost(p)
                      }}
                      isDragging={dragPostId === p.id}
                      onDragStart={() => !p.isMock && (() => {})()}
                      onDragEnd={() => {}}
                      compact={true}
                      showTime={false}
                    />
                  ))}
                  {postsInSlot.length > 2 && (
                    <div className={styles.morePostsInSlot}>
                      +{postsInSlot.length - 2} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {isCurrentWeek && currentTimePosition !== null && (
          <div
            className={styles.currentTimeLine}
            style={{ top: `${(currentTimePosition / 60) * 60 + 8}px` }}
            aria-label={`Current time: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`}
          >
            <span className={styles.currentTimeDot} />
          </div>
        )}
      </div>
    </div>
  )
}