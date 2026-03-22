import React, { useState } from 'react'
import type { CalPost } from '../../types/calendar'
import { HOURS, DAYS_FULL, MONTHS, getPostKey, timeToSlot } from '../../types/calendar'
import VisualCard from './VisualCard'
import styles from '../../pages/app/CalendarPage.module.css'

interface DayViewProps {
  year: number
  month: number
  selectedDay: number | null
  filteredPostsByKey: Record<string, CalPost[]>
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

export default function DayView({
  year,
  month,
  selectedDay,
  filteredPostsByKey,
  onCreatePost,
  onEditPost,
  onDragOver,
  onDrop,
  dragOverKey,
  setDragOverKey,
  dragPostId,
  currentTimePosition
}: DayViewProps) {
  const [now] = useState(() => new Date())
  const d = selectedDay ?? now.getDate()
  const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear()
  const dayKey = getPostKey(year, month, d)

  return (
    <div className={`glass-card ${styles.calCard} ${styles.dayViewCard}`} role="grid" aria-label="Day calendar">
      <div className={styles.dayViewTitle}>
        {DAYS_FULL[new Date(year, month, d).getDay()]}, {MONTHS[month]} {d}, {year}
      </div>
      <div className={styles.dayBody} role="rowgroup">
        {HOURS.map(hour => {
          const postsInSlot = (filteredPostsByKey[dayKey] ?? []).filter(p => {
            const slot = timeToSlot(p.time)
            return slot >= 0 && slot >= (hour - 6) * 60 && slot < (hour - 6 + 1) * 60
          })
          const isDragOver = dragOverKey === dayKey
          const isCurrentHour = isToday && hour === now.getHours()
          return (
            <div key={hour} className={styles.dayRow} role="row">
              <div className={styles.dayTimeLabel} aria-label={`${hour}:00`}>{String(hour).padStart(2, '0')}:00</div>
              <div
                className={`${styles.daySlot} ${isDragOver ? styles.cellDragOver : ''} ${isCurrentHour ? styles.daySlotCurrentHour : ''}`}
                onClick={() => onCreatePost(year, month, d)}
                onDragOver={e => onDragOver(e, dayKey)}
                onDrop={e => onDrop(e, year, month, d)}
                onDragLeave={() => setDragOverKey(null)}
                role="gridcell"
                tabIndex={0}
                aria-label={`${hour}:00 - ${postsInSlot.length} posts`}
                >
                  {postsInSlot.slice(0, 3).map(p => (
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
                    />
                  ))}
                  {postsInSlot.length > 3 && (
                    <div className={styles.morePostsInSlot}>
                      +{postsInSlot.length - 3} more
                    </div>
                  )}
                </div>
            </div>
          )
        })}

        {isToday && currentTimePosition !== null && (
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