import { SkeletonLoader } from '../SkeletonLoader'
import { Plus } from 'lucide-react'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import type { CalPost } from './CalendarConstants'
import { DAYS_FULL, MONTHS, getPostKey } from './CalendarConstants'
import styles from './MonthView.module.css'

interface MonthViewProps {
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
  onShowTooltip: (data: { post: CalPost; x: number; y: number } | null) => void
}

export function MonthView({
  year, month, selectedDay, today, postsByKey, isLoading,
  dragPostId, dragOverKey,
  onSelectDay, onDragStart, onDragEnd, onDragOver, onDrop, onDragLeave,
  onOpenCreateForDay, onOpenEditPost, onShowTooltip,
}: MonthViewProps) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return (
    <div className={`glass-card ${styles.calCard}`} role="grid" aria-label="Month calendar">
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
          <SkeletonLoader height="18px" />
        </div>
      )}
      <div className={styles.dayHeaders} role="row">
        {DAYS_FULL.map(d => (
          <span key={d} className={styles.dayHeader} role="columnheader" aria-label={d}>{d.slice(0, 3)}</span>
        ))}
      </div>
      <div className={styles.grid} role="rowgroup">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className={styles.cellEmpty} role="gridcell" aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = getPostKey(year, month, day)
          const posts = postsByKey[key] ?? []
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSelected = day === selectedDay
          const isDragOver = dragOverKey === key
          const isFuture = new Date(year, month, day) > today

          return (
            <div
              key={day}
              className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${isSelected ? styles.cellSelected : ''} ${isDragOver ? styles.cellDragOver : ''} ${isFuture ? styles.cellFuture : ''}`}
              onClick={() => onSelectDay(day)}
              onDragOver={e => onDragOver(e, key)}
              onDrop={e => onDrop(e, year, month, day)}
              onDragLeave={onDragLeave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectDay(day)
                }
              }}
              role="gridcell"
              tabIndex={0}
              aria-selected={isSelected}
              aria-label={`${MONTHS[month]} ${day}, ${year}, ${posts.length} posts`}
            >
              <div className={styles.cellTop}>
                <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{day}</span>
                <button
                  className={styles.cellAddBtn}
                  onClick={e => { e.stopPropagation(); onOpenCreateForDay(year, month, day) }}
                  title="Add post"
                  aria-label={`Add post on ${MONTHS[month]} ${day}`}
                >
                  <Plus size={10} />
                </button>
              </div>
              <div className={styles.cellPosts}>
                {posts.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className={`${styles.cellPostChip} ${dragPostId === p.id ? styles.postPillDragging : ''}`}
                    style={{ background: `${p.color}18`, borderLeft: `3px solid ${p.color}` }}
                    draggable
                    onDragStart={e => {
                      e.stopPropagation()
                      onDragStart(p.id)
                    }}
                    onDragEnd={onDragEnd}
                    onClick={e => { e.stopPropagation(); onOpenEditPost(p) }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      onShowTooltip({ post: p, x: rect.left + rect.width / 2, y: rect.top })
                    }}
                    onMouseLeave={() => onShowTooltip(null)}
                    title={`${p.time} · ${p.title}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.title} at ${p.time}, ${p.platform}, ${p.status}`}
                  >
                    <span className={styles.chipTime}>{p.time}</span>
                    <span className={styles.chipTitle}>{p.title}</span>
                    <ExtendedPlatformIcon platform={p.platform} size={12} />
                  </div>
                ))}
                {posts.length > 3 && (
                  <button
                    className={styles.moreCount}
                    onClick={(e) => { e.stopPropagation(); onSelectDay(day) }}
                    aria-label={`Show ${posts.length - 3} more posts`}
                  >
                    +{posts.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.legend}>
        {[
          { color: '#22c55e', label: 'Đã đăng' },
          { color: '#eab308', label: 'Scheduled' },
          { color: '#475569', label: 'Draft' },
        ].map(l => (
          <span key={l.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
