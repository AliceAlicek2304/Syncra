import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { CalPost } from '../../types/calendar'
import { DAYS_FULL, getPostKey } from '../../types/calendar'
import PostChip from './PostChip'
import styles from '../../pages/app/CalendarPage.module.css'

interface MonthViewProps {
  year: number
  month: number
  selectedDay: number | null
  filteredPostsByKey: Record<string, CalPost[]>
  onDayClick: (day: number) => void
  onCreatePost: (year: number, month: number, day: number) => void
  onEditPost: (post: CalPost) => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDrop: (e: React.DragEvent, targetYear: number, targetMonth: number, targetDay: number) => void
  dragOverKey: string | null
  setDragOverKey: (key: string | null) => void
  dragPostId: string | null
  onTooltipData: (data: { post: CalPost; x: number; y: number } | null) => void
  compactMode?: boolean // Enable compact mode for dense calendars
}

export default function MonthView({
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
  onTooltipData,
  compactMode = false
}: MonthViewProps) {
  const [today] = useState(() => new Date())

  const firstDay = useMemo(() => new Date(year, month, 1).getDay(), [year, month])
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])

  return (
    <div className={`glass-card ${styles.calCard}`} role="grid" aria-label="Month calendar">
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
          const posts = filteredPostsByKey[key] ?? []
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSelected = day === selectedDay
          const isDragOver = dragOverKey === key
          const isFuture = new Date(year, month, day) > today

          // Limit visible posts to prevent overcrowding
          const maxVisiblePosts = 4
          const visiblePosts = posts.slice(0, maxVisiblePosts)
          const hiddenPostsCount = posts.length - maxVisiblePosts

          return (
            <div
              key={day}
              className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${isSelected ? styles.cellSelected : ''} ${isDragOver ? styles.cellDragOver : ''} ${isFuture ? styles.cellFuture : ''}`}
              onClick={() => onDayClick(day)}
              onDragOver={e => onDragOver(e, key)}
              onDrop={e => onDrop(e, year, month, day)}
              onDragLeave={() => setDragOverKey(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onDayClick(day)
                }
              }}
              role="gridcell"
              tabIndex={0}
              aria-selected={isSelected}
              aria-label={`${month + 1}/${day}/${year}, ${posts.length} posts`}
            >
              <div className={styles.cellTop}>
                <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{day}</span>
                <button
                  className={styles.cellAddBtn}
                  onClick={e => { e.stopPropagation(); onCreatePost(year, month, day) }}
                  title="Add post"
                  aria-label={`Add post on ${month + 1}/${day}/${year}`}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className={styles.cellPosts}>
                {visiblePosts.map(p => (
                  <PostChip
                    key={p.id}
                    post={p}
                    onClick={e => { e.stopPropagation(); onEditPost(p) }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      onTooltipData({ post: p, x: rect.left + rect.width / 2, y: rect.top })
                    }}
                    onMouseLeave={() => onTooltipData(null)}
                    isDragging={dragPostId === p.id}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                    compact={compactMode}
                  />
                ))}
                {hiddenPostsCount > 0 && (
                  <div
                    className={styles.morePostsIndicator}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayClick(day) // Click to open detail panel
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`+${hiddenPostsCount} more posts`}
                  >
                    +{hiddenPostsCount} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.legend}>
        {[
          { color: '#22c55e', label: 'Posted' },
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