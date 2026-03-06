import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Clock,
  MoreHorizontal, CalendarDays, List, LayoutGrid,
  ChevronDown, X,
} from 'lucide-react'
import { useCalendar } from '../../context/calendarContextBase'
import { useCreatePostModal } from '../../context/createPostModalContext'
import type { ToastItem } from '../../components/Toast'
import Toast from '../../components/Toast'
import styles from './CalendarPage.module.css'

// ── Constants ─────────────────────────────────────────
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

type ViewMode = 'month' | 'week' | 'day'
type PostStatus = 'published' | 'scheduled' | 'draft'

interface CalPost {
  id: string
  title: string
  platform: string
  status: PostStatus
  time: string
  color: string
  caption: string
  hashtags: string[]
  image?: string
  isMock?: boolean
}

// ── Platform config ───────────────────────────────────
const PLATFORMS = [
  { id: 'all', label: 'All', color: '#8b5cf6' },
  { id: 'TikTok', label: 'TikTok', color: '#8b5cf6' },
  { id: 'Instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'Facebook', label: 'Facebook', color: '#3b82f6' },
  { id: 'X', label: 'X', color: '#f59e0b' },
  { id: 'LinkedIn', label: 'LinkedIn', color: '#22d3ee' },
  { id: 'YouTube', label: 'YouTube', color: '#ef4444' },
]

// ── Mock data ─────────────────────────────────────────
const MOCK_POSTS: Record<string, CalPost[]> = {
  '2026-2-18': [{ id: 'a1', title: 'Tips làm content', platform: 'TikTok', status: 'published', time: '19:00', color: '#8b5cf6', caption: '', hashtags: [], isMock: true }],
  '2026-2-19': [
    { id: 'a2', title: 'AI Tools 2026', platform: 'Instagram', status: 'published', time: '08:00', color: '#ec4899', caption: '', hashtags: [], isMock: true },
    { id: 'a3', title: 'Day in my life', platform: 'TikTok', status: 'published', time: '20:00', color: '#8b5cf6', caption: '', hashtags: [], isMock: true },
  ],
  '2026-2-22': [{ id: 'a4', title: 'Workspace setup', platform: 'Instagram', status: 'published', time: '09:00', color: '#ec4899', caption: '', hashtags: [], isMock: true }],
  '2026-2-24': [
    { id: 'a5', title: 'Multi-platform tips', platform: 'LinkedIn', status: 'published', time: '10:00', color: '#22d3ee', caption: '', hashtags: [], isMock: true },
    { id: 'a6', title: 'Creator growth thread', platform: 'X', status: 'scheduled', time: '20:00', color: '#f59e0b', caption: '', hashtags: [], isMock: true },
  ],
  '2026-2-25': [{ id: 'a7', title: 'Behind the scenes', platform: 'Instagram', status: 'scheduled', time: '08:00', color: '#ec4899', caption: '', hashtags: [], isMock: true }],
  '2026-2-27': [
    { id: 'a8', title: '5 lỗi mới làm YouTube', platform: 'YouTube', status: 'scheduled', time: '15:00', color: '#ef4444', caption: '', hashtags: [], isMock: true },
    { id: 'a9', title: 'Productivity hacks', platform: 'TikTok', status: 'draft', time: '—', color: '#8b5cf6', caption: '', hashtags: [], isMock: true },
  ],
  '2026-2-28': [{ id: 'a10', title: 'Q&A với followers', platform: 'Instagram', status: 'scheduled', time: '19:00', color: '#ec4899', caption: '', hashtags: [], isMock: true }],
}

// ── Helpers ───────────────────────────────────────────
function getPostKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`
}

function getStatusLabel(s: PostStatus) {
  if (s === 'published') return 'Đã đăng'
  if (s === 'scheduled') return 'Scheduled'
  return 'Draft'
}

function getWeekDays(year: number, month: number, day: number): { y: number; m: number; d: number }[] {
  const date = new Date(year, month, day)
  const dow = date.getDay()
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(year, month, day - dow + i)
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }
  })
}

// ── Hour slots for week/day view ─────────────────────
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6:00 – 23:00

function timeToSlot(time: string): number {
  if (!time || time === '—') return 0
  const [h, m] = time.split(':').map(Number)
  return (h - 6) * 60 + (m || 0)
}

// ── Main Component ────────────────────────────────────
export default function CalendarPage() {
  const { posts: contextPosts, updatePost } = useCalendar()
  const { openCreatePost, openEditPost } = useCreatePostModal()
  
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [platformFilter, setPlatformFilter] = useState('all')
  
  // Picker dropdown state
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const monthPickerRef = useRef<HTMLDivElement>(null)
  const yearPickerRef = useRef<HTMLDivElement>(null)

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    post: CalPost
    x: number
    y: number
  } | null>(null)

  // Drag state
  const [dragPostId, setDragPostId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false)
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(e.target as Node)) {
        setShowYearPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Merge mock + context posts ─────────────────────
  const allPostsByKey = useMemo(() => {
    const merged: Record<string, CalPost[]> = {}
    // Add mock posts
    Object.entries(MOCK_POSTS).forEach(([key, ps]) => {
      merged[key] = [...ps]
    })
    // Add context posts
    contextPosts.forEach(p => {
      const key = getPostKey(p.year, p.month, p.day)
      const cp: CalPost = {
        id: p.id, title: p.title, platform: p.platform,
        status: p.status, time: p.time, color: p.color,
        caption: p.caption, hashtags: p.hashtags, image: p.image,
      }
      merged[key] = [...(merged[key] ?? []), cp]
    })
    return merged
  }, [contextPosts])

  // ── Filter by platform ─────────────────────────────
  const filteredPostsByKey = useMemo(() => {
    if (platformFilter === 'all') return allPostsByKey
    const result: Record<string, CalPost[]> = {}
    Object.entries(allPostsByKey).forEach(([key, posts]) => {
      const filtered = posts.filter(p => p.platform === platformFilter)
      if (filtered.length > 0) result[key] = filtered
    })
    return result
  }, [allPostsByKey, platformFilter])

  // ── Navigation ─────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  const prevWeek = () => {
    const d = new Date(year, month, (selectedDay ?? today.getDate()) - 7)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(d.getDate())
  }
  const nextWeek = () => {
    const d = new Date(year, month, (selectedDay ?? today.getDate()) + 7)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(d.getDate())
  }
  const prevDay = () => {
    const d = new Date(year, month, (selectedDay ?? today.getDate()) - 1)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(d.getDate())
  }
  const nextDay = () => {
    const d = new Date(year, month, (selectedDay ?? today.getDate()) + 1)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(d.getDate())
  }
  const goToday = () => {
    setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate())
  }

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      if (viewMode === 'month') prevMonth()
      else if (viewMode === 'week') prevWeek()
      else prevDay()
    } else if (e.key === 'ArrowRight') {
      if (viewMode === 'month') nextMonth()
      else if (viewMode === 'week') nextWeek()
      else nextDay()
    } else if (e.key === 't' || e.key === 'T') {
      goToday()
    }
  }, [viewMode, month, year, selectedDay])

  // Current time position for week/day view
  const currentTimePosition = useMemo(() => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    if (hours < 6 || hours >= 24) return null
    return ((hours - 6) * 60 + minutes)
  }, [])

  // ── Drag & drop handlers ───────────────────────────
  const handleDragStart = (postId: string) => setDragPostId(postId)
  const handleDragEnd = () => { setDragPostId(null); setDragOverKey(null) }
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

  // ── Open create modal with date ────────────────────
  const openCreateForDay = (y: number, m: number, d: number) => {
    openCreatePost({ source: 'calendar', initialDate: { year: y, month: m, day: d } })
  }

  // ── Open edit modal ────────────────────────────────
  const handleOpenEditPost = (post: CalPost) => {
    if (post.isMock) return // mock posts are read-only for now
    const sp = contextPosts.find(p => p.id === post.id)
    if (sp) { openEditPost(sp) }
  }

  // ── Calendar grid data ─────────────────────────────
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const selectedPosts = useMemo(() => {
    if (!selectedDay) return []
    return filteredPostsByKey[getPostKey(year, month, selectedDay)] ?? []
  }, [filteredPostsByKey, year, month, selectedDay])

  const weekDays = useMemo(() =>
    getWeekDays(year, month, selectedDay ?? today.getDate()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, selectedDay])

  // ── Visual content card component (handles broken image state) ───────
  const VisualCard: React.FC<{
    post: CalPost
    onClick: (e: React.MouseEvent) => void
    isDragging: boolean
    onDragStart: () => void
    onDragEnd: () => void
  }> = ({ post, onClick, isDragging, onDragStart, onDragEnd }) => {
    const platformGradients: Record<string, string> = {
      TikTok: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      Instagram: 'linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%)',
      Facebook: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      X: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      LinkedIn: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
      YouTube: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    }
    const gradient = platformGradients[post.platform] || platformGradients.TikTok

    const [imageError, setImageError] = useState(false)

    return (
      <div
        className={`${styles.visualCard} ${isDragging ? styles.postPillDragging : ''}`}
        style={{ '--card-accent': post.color } as React.CSSProperties}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        title={post.title}
      >
        {/* Thumbnail on LEFT - fixed size 56x56 */}
        <div className={styles.cardThumbnail}>
          {post.image && !imageError ? (
            <img 
              src={post.image} 
              alt={post.title} 
              className={styles.cardImage}
              onError={() => setImageError(true)}
            />
          ) : imageError ? (
            // Fallback when image fails to load
            <div className={styles.cardPlaceholderBroken}>
              <span className={styles.cardPlatformIcon}>{post.platform[0]}</span>
            </div>
          ) : (
            <div className={styles.cardPlaceholder} style={{ background: gradient }}>
              <span className={styles.cardPlatformIcon}>{post.platform[0]}</span>
            </div>
          )}
        </div>
        {/* Content on RIGHT */}
        <div className={styles.cardContent}>
          <span className={styles.cardTime}>{post.time}</span>
          <span className={styles.cardTitle}>{post.title}</span>
          <div className={styles.cardPlatform}>
            <span className={styles.platformBadge} style={{ background: `${post.color}20`, color: post.color }}>
              {post.platform}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Render visual content card (used in week/day view) ───────
  const renderPostPill = (p: CalPost) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      // Open CreatePostModal with editPost to enable full editor with preview
      if (p.isMock) return // mock posts are read-only for now
      const sp = contextPosts.find(post => post.id === p.id)
      if (sp) { 
        openEditPost(sp) // This opens CreatePostModal in edit mode with full preview
      }
    }

    return (
      <VisualCard
        key={p.id}
        post={p}
        onClick={handleClick}
        isDragging={dragPostId === p.id}
        onDragStart={() => !p.isMock && handleDragStart(p.id)}
        onDragEnd={handleDragEnd}
      />
    )
  }

  // ── Month View ─────────────────────────────────────
  const renderMonthView = () => (
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

          return (
            <div
              key={day}
              className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${isSelected ? styles.cellSelected : ''} ${isDragOver ? styles.cellDragOver : ''} ${isFuture ? styles.cellFuture : ''}`}
              onClick={() => setSelectedDay(day)}
              onDragOver={e => handleDragOver(e, key)}
              onDrop={e => handleDrop(e, year, month, day)}
              onDragLeave={() => setDragOverKey(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedDay(day)
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
                  onClick={e => { e.stopPropagation(); openCreateForDay(year, month, day) }}
                  title="Add post"
                  aria-label={`Add post on ${MONTHS[month]} ${day}`}
                >
                  <Plus size={10} />
                </button>
              </div>
              <div className={styles.cellPosts}>
                {posts.slice(0, 2).map(p => (
                  <div
                    key={p.id}
                    className={`${styles.cellPostChip} ${dragPostId === p.id ? styles.postPillDragging : ''}`}
                    style={{ background: `${p.color}25`, borderLeft: `2px solid ${p.color}` }}
                    draggable={!p.isMock}
                    onDragStart={e => {
                      e.stopPropagation()
                      if (!p.isMock) handleDragStart(p.id)
                    }}
                    onDragEnd={handleDragEnd}
                    onClick={e => { e.stopPropagation(); handleOpenEditPost(p) }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltipData({ post: p, x: rect.left + rect.width / 2, y: rect.top })
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                    title={`${p.time} · ${p.title}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.title} at ${p.time}, ${p.platform}, ${p.status}`}
                  >
                    <span className={styles.chipTime}>{p.time}</span>
                    <span className={styles.chipTitle}>{p.title}</span>
                  </div>
                ))}
                {posts.length > 2 && (
                  <button 
                    className={styles.moreCount}
                    onClick={(e) => { e.stopPropagation(); setSelectedDay(day) }}
                    aria-label={`Show ${posts.length - 2} more posts`}
                  >
                    +{posts.length - 2} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Legend */}
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

  // ── Week View ──────────────────────────────────────
  const renderWeekView = () => {
    const now = new Date()
    const isCurrentWeek = weekDays.some(
      ({ y, m, d }) => y === now.getFullYear() && m === now.getMonth() && d === now.getDate()
    )
    
    return (
    <div className={`glass-card ${styles.calCard} ${styles.weekCard}`} role="grid" aria-label="Week calendar">
      {/* Column headers */}
      <div className={styles.weekHeader} role="row">
        <div className={styles.weekTimeGutter} />
        {weekDays.map(({ y, m, d }) => {
          const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
          const isSelected = d === selectedDay && m === month && y === year
          return (
            <div
              key={`${y}-${m}-${d}`}
              className={`${styles.weekColHeader} ${isToday ? styles.weekColToday : ''} ${isSelected ? styles.weekColSelected : ''}`}
              onClick={() => { setYear(y); setMonth(m); setSelectedDay(d) }}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${DAYS_FULL[new Date(y, m, d).getDay()]}, ${MONTHS[m]} ${d}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setYear(y); setMonth(m); setSelectedDay(d)
                }
              }}
            >
              <span className={styles.weekColDay}>{DAYS_SHORT[new Date(y, m, d).getDay()]}</span>
              <span className={styles.weekColNum}>{d}</span>
            </div>
          )
        })}
      </div>

      {/* Timeline */}
      <div className={styles.weekBody} role="rowgroup">
        {HOURS.map(hour => (
          <div key={hour} className={styles.weekRow} role="row">
            <div className={styles.weekTimeLabel} aria-label={`${hour}:00`}>{String(hour).padStart(2, '0')}:00</div>
            {weekDays.map(({ y, m, d }) => {
              const key = getPostKey(y, m, d)
              const postsInSlot = (filteredPostsByKey[key] ?? []).filter(p => {
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
                  onClick={() => openCreateForDay(y, m, d)}
                  onDragOver={e => handleDragOver(e, `${key}-${hour}`)}
                  onDrop={e => handleDrop(e, y, m, d)}
                  onDragLeave={() => setDragOverKey(null)}
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
        
        {/* Current time indicator line */}
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
  )}

  // ── Day View ───────────────────────────────────────
  const renderDayView = () => {
    const dayKey = getPostKey(year, month, selectedDay ?? today.getDate())
    const dayPosts = filteredPostsByKey[dayKey] ?? []
    const d = selectedDay ?? today.getDate()
    const now = new Date()
    const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear()
    
    return (
      <div className={`glass-card ${styles.calCard} ${styles.dayViewCard}`} role="grid" aria-label="Day calendar">
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
                  onClick={() => openCreateForDay(year, month, d)}
                  onDragOver={e => handleDragOver(e, `day-${hour}`)}
                  onDrop={e => handleDrop(e, year, month, d)}
                  onDragLeave={() => setDragOverKey(null)}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${hour}:00 - ${postsInSlot.length} posts`}
                >
                  {postsInSlot.map(p => renderPostPill(p))}
                </div>
              </div>
            )
          })}
          
          {/* Current time indicator for day view */}
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

  // ── Side detail panel ──────────────────────────────
  const renderDetailPanel = () => (
    <div className={`glass-card ${styles.detailCard}`}>
      {selectedDay ? (
        <>
          <div className={styles.detailHeader}>
            <span className={styles.detailDate}>{MONTHS[month]} {selectedDay}</span>
            <div className={styles.detailActions}>
              <span className={styles.detailCount}>{selectedPosts.length} posts</span>
              <button
                className={styles.detailAddBtn}
                onClick={() => openCreateForDay(year, month, selectedDay)}
                title="Add post"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {selectedPosts.length === 0 ? (
            <div className={styles.emptyDay}>
              <Clock size={28} className={styles.emptyIcon} />
              <p>Chưa có post nào</p>
              <button
                className="btn-primary"
                onClick={() => openCreateForDay(year, month, selectedDay)}
                style={{ fontSize: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={12} /> Tạo ngay
              </button>
            </div>
          ) : (
            <div className={styles.postList}>
              {selectedPosts.map(p => (
                <div
                  key={p.id}
                  className={styles.postItem}
                  style={{ borderLeftColor: p.color }}
                >
                  <div className={styles.postInfo}>
                    <span className={styles.postTime}>{p.time}</span>
                    <span className={styles.postName}>{p.title}</span>
                    <span className={styles.postPlatform}>{p.platform}</span>
                  </div>
                  <div className={styles.postRight}>
                    <span className={`${styles.postStatus} ${styles[`s_${p.status}`]}`}>
                      {getStatusLabel(p.status)}
                    </span>
                    {!p.isMock ? (
                      <button
                        className={styles.moreBtn}
                        onClick={() => handleOpenEditPost(p)}
                        title="Edit"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    ) : (
                      <button className={styles.moreBtn} title="Mock post (read-only)" style={{ opacity: 0.3, cursor: 'default' }}>
                        <MoreHorizontal size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyDay}>
          <Clock size={28} className={styles.emptyIcon} />
          <p>Chọn một ngày để xem chi tiết</p>
        </div>
      )}
    </div>
  )

  // ── Nav title based on view ────────────────────────
  const navTitle = (() => {
    if (viewMode === 'month') return `${MONTHS[month]} ${year}`
    if (viewMode === 'week') {
      const first = weekDays[0], last = weekDays[6]
      if (first.m === last.m) return `${MONTHS[first.m]} ${first.y}`
      return `${MONTHS[first.m]} – ${MONTHS[last.m]} ${last.y}`
    }
    const d = selectedDay ?? today.getDate()
    return `${DAYS_SHORT[new Date(year, month, d).getDay()]}, ${MONTHS[month]} ${d}`
  })()

  const onPrev = viewMode === 'month' ? prevMonth : viewMode === 'week' ? prevWeek : prevDay
  const onNext = viewMode === 'month' ? nextMonth : viewMode === 'week' ? nextWeek : nextDay

  // ── Main render ────────────────────────────────────
  return (
    <div className={styles.page} onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Calendar</h1>
          <p className={styles.subtitle}>Lên lịch và quản lý tất cả bài đăng của bạn</p>
        </div>
        <button
          className={styles.newPostBtn}
          onClick={() => openCreatePost({ source: 'calendar' })}
        >
          <Plus size={15} /> New Post
        </button>
      </div>

      {/* Toolbar: view switcher + nav + platform filter */}
      <div className={styles.toolbar}>
        {/* View mode */}
        <div className={styles.viewSwitcher}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'month' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('month')}
            title="Month view"
          >
            <LayoutGrid size={14} /> Month
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'week' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('week')}
            title="Week view"
          >
            <CalendarDays size={14} /> Week
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'day' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('day')}
            title="Day view"
          >
            <List size={14} /> Day
          </button>
        </div>

        {/* Nav controls with month/year picker */}
        <div className={styles.navControls}>
          <button className={styles.navBtn} onClick={onPrev} aria-label="Previous"><ChevronLeft size={15} /></button>
          
          {/* Month/Year picker */}
          <div className={styles.pickerContainer}>
            <div className={styles.pickerTrigger}>
              <button 
                className={styles.monthPickerBtn}
                onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false) }}
                aria-label="Select month"
              >
                {MONTHS_SHORT[month]}
                <ChevronDown size={12} />
              </button>
              <button 
                className={styles.yearPickerBtn}
                onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false) }}
                aria-label="Select year"
              >
                {year}
                <ChevronDown size={12} />
              </button>
            </div>
            
            {/* Month dropdown */}
            {showMonthPicker && (
              <div className={styles.pickerDropdown} ref={monthPickerRef} role="listbox" aria-label="Select month">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    className={`${styles.pickerOption} ${i === month ? styles.pickerOptionActive : ''}`}
                    onClick={() => { setMonth(i); setShowMonthPicker(false); setSelectedDay(null) }}
                    role="option"
                    aria-selected={i === month}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            
            {/* Year dropdown */}
            {showYearPicker && (
              <div className={styles.pickerDropdown} ref={yearPickerRef} role="listbox" aria-label="Select year">
                {YEARS.map(y => (
                  <button
                    key={y}
                    className={`${styles.pickerOption} ${y === year ? styles.pickerOptionActive : ''}`}
                    onClick={() => { setYear(y); setShowYearPicker(false); setSelectedDay(null) }}
                    role="option"
                    aria-selected={y === year}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button className={styles.navBtn} onClick={onNext} aria-label="Next"><ChevronRight size={15} /></button>
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
        </div>

        {/* Platform filter */}
        <div className={styles.platformFilter}>
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              className={`${styles.filterChip} ${platformFilter === p.id ? styles.filterChipActive : ''}`}
              style={platformFilter === p.id ? { borderColor: p.color, color: p.color, background: `${p.color}18` } : {}}
              onClick={() => setPlatformFilter(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body: calendar + detail panel */}
      <div className={`${styles.body} ${viewMode !== 'month' ? styles.bodyFull : ''}`}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}

        {/* Side detail always visible in month view */}
        {viewMode === 'month' && renderDetailPanel()}
      </div>

      {/* Tooltip for events */}
      {tooltipData && (
        <div 
          className={styles.tooltip}
          style={{ 
            left: tooltipData.x, 
            top: tooltipData.y - 8,
            transform: 'translate(-50%, -100%)'
          }}
          role="tooltip"
        >
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipTime}>{tooltipData.post.time}</div>
            <div className={styles.tooltipTitle}>{tooltipData.post.title}</div>
            <div className={styles.tooltipMeta}>
              <span className={styles.tooltipPlatform} style={{ color: tooltipData.post.color }}>
                {tooltipData.post.platform}
              </span>
              <span className={styles.tooltipStatus}>{getStatusLabel(tooltipData.post.status)}</span>
            </div>
          </div>
          <div className={styles.tooltipArrow} />
        </div>
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}