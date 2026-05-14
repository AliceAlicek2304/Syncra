import { SkeletonLoader } from '../SkeletonLoader'
import { VisualCard } from './VisualCard'
import type { CalPost } from './CalendarConstants'
import { DAYS_SHORT, DAYS_FULL, MONTHS, HOURS, getPostKey, timeToSlot, getWeekDays } from './CalendarConstants'
import styles from './WeekView.module.css'

interface WeekViewProps {
  year: number
  month: number
  selectedDay: number | null
  today: Date
  postsByKey: Record<string, CalPost[]>
  isLoading: boolean
  dragPostId: string | null
  dragOverKey: string | null
  onSelectDay: (day: number) => void
  onDragStart: (postId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDrop: (e: React.DragEvent, targetYear: number, targetMonth: number, targetDay: number) => void
  onDragLeave: () => void
  onOpenCreateForDay: (y: number, m: number, d: number) => void
  onOpenEditPost: (post: CalPost) => void
}

export function WeekView({
  year, month, selectedDay, today, postsByKey, isLoading,
  dragPostId, dragOverKey,
  onSelectDay, onDragStart, onDragEnd, onDragOver, onDrop, onDragLeave,
  onOpenCreateForDay, onOpenEditPost,
}: WeekViewProps) {
  const now = new Date()
  const weekDays = getWeekDays(year, month, selectedDay ?? today.getDate())

  const currentTimePosition = (() => {
    const hours = now.getHours()
    const minutes = now.getMinutes()
    if (hours < 6 || hours >= 24) return null
    return ((hours - 6) * 60 + minutes)
  })()

  const isCurrentWeek = weekDays.some(
    ({ y, m, d }) => y === now.getFullYear() && m === now.getMonth() && d === now.getDate()
  )

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
    <div className={`glass-card ${styles.weekCard}`} role="grid" aria-label="Week calendar">
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
        </div>
      )}
      <div className={styles.weekHeader} role="row">
        <div className={styles.weekTimeGutter} />
        {weekDays.map(({ y, m, d }) => {
          const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
          const isSelected = d === selectedDay && m === month && y === year
          return (
            <div
              key={`${y}-${m}-${d}`}
              className={`${styles.weekColHeader} ${isToday ? styles.weekColToday : ''} ${isSelected ? styles.weekColSelected : ''}`}
              onClick={() => { onSelectDay(d); /* parent manages year/month */ }}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${DAYS_FULL[new Date(y, m, d).getDay()]}, ${MONTHS[m]} ${d}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectDay(d)
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
              const postsInSlot = (postsByKey[key] ?? []).filter(p => {
                const slot = timeToSlot(p.time)
                return slot >= (hour - 6) * 60 && slot < (hour - 6 + 1) * 60
              })
              const isDragOver = dragOverKey === `${key}-${hour}`
              const isTodayCell = y === today.getFullYear() && m === today.getMonth() && d === today.getDate()
              const isCurrentHour = isTodayCell && hour === now.getHours()

              return (
                <div
                  key={`${key}-${hour}`}
                  className={`${styles.weekCell} ${isDragOver ? styles.cellDragOver : ''} ${isCurrentHour ? styles.weekCellCurrentHour : ''}`}
                  onClick={() => onOpenCreateForDay(y, m, d)}
                  onDragOver={e => onDragOver(e, `${key}-${hour}`)}
                  onDrop={e => onDrop(e, y, m, d)}
                  onDragLeave={onDragLeave}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${MONTHS[m]} ${d}, ${hour}:00 - ${postsInSlot.length} posts`}
                >
                  {postsInSlot.map(p => renderPostPill(p))}
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
