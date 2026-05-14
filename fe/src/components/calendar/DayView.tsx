import { SkeletonLoader } from '../SkeletonLoader'
import { VisualCard } from './VisualCard'
import type { CalPost } from './CalendarConstants'
import { DAYS_FULL, MONTHS, HOURS, getPostKey, timeToSlot } from './CalendarConstants'
import styles from './DayView.module.css'

interface DayViewProps {
  year: number
  month: number
  selectedDay: number | null
  today: Date
  postsByKey: Record<string, CalPost[]>
  isLoading: boolean
  dragPostId: string | null
  dragOverKey: string | null
  onDragStart: (postId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDrop: (e: React.DragEvent, targetYear: number, targetMonth: number, targetDay: number) => void
  onDragLeave: () => void
  onOpenCreateForDay: (y: number, m: number, d: number) => void
  onOpenEditPost: (post: CalPost) => void
}

export function DayView({
  year, month, selectedDay, today, postsByKey, isLoading,
  dragPostId, dragOverKey,
  onDragStart, onDragEnd, onDragOver, onDrop, onDragLeave,
  onOpenCreateForDay, onOpenEditPost,
}: DayViewProps) {
  const now = new Date()
  const d = selectedDay ?? today.getDate()
  const dayKey = getPostKey(year, month, d)
  const dayPosts = postsByKey[dayKey] ?? []
  const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  const currentTimePosition = (() => {
    const hours = now.getHours()
    const minutes = now.getMinutes()
    if (hours < 6 || hours >= 24) return null
    return ((hours - 6) * 60 + minutes)
  })()

  const renderPostPill = (p: CalPost) => (
    <VisualCard
      key={p.id}
      post={p}
      onClick={(e) => { e.stopPropagation(); onOpenEditPost(p) }}
      isDragging={dragPostId === p.id}
      onDragStart={() => onDragStart(p.id)}
      onDragEnd={onDragEnd}
    />
  )

  return (
    <div className={`glass-card ${styles.dayViewCard}`} role="grid" aria-label="Day calendar">
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
        </div>
      )}
      <div className={styles.dayViewTitle}>
        {DAYS_FULL[new Date(year, month, d).getDay()]}, {MONTHS[month]} {d}, {year}
      </div>
      <div className={styles.dayBody} role="rowgroup">
        {HOURS.map(hour => {
          const postsInSlot = dayPosts.filter(p => {
            const slot = timeToSlot(p.time)
            return slot >= (hour - 6) * 60 && slot < (hour - 6 + 1) * 60
          })
          const isDragOver = dragOverKey === `day-${hour}`
          const isCurrentHour = isToday && hour === now.getHours()
          return (
            <div key={hour} className={styles.dayRow} role="row">
              <div className={styles.dayTimeLabel} aria-label={`${hour}:00`}>{String(hour).padStart(2, '0')}:00</div>
              <div
                className={`${styles.daySlot} ${isDragOver ? styles.cellDragOver : ''} ${isCurrentHour ? styles.daySlotCurrentHour : ''}`}
                onClick={() => onOpenCreateForDay(year, month, d)}
                onDragOver={e => onDragOver(e, `day-${hour}`)}
                onDrop={e => onDrop(e, year, month, d)}
                onDragLeave={onDragLeave}
                role="gridcell"
                tabIndex={0}
                aria-label={`${hour}:00 - ${postsInSlot.length} posts`}
              >
                {postsInSlot.map(p => renderPostPill(p))}
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
