import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Clock,
  MoreHorizontal, CalendarDays, List, LayoutGrid,
} from 'lucide-react'
import { useCalendar } from '../../context/calendarContextBase'
import type { ScheduledPost } from '../../context/calendarContextBase'
import CreatePostModal from '../../components/CreatePostModal'
import EditPostModal from '../../components/EditPostModal'
import type { ToastItem } from '../../components/Toast'
import Toast from '../../components/Toast'
import { shortId } from '../../utils/shortId'
import styles from './CalendarPage.module.css'

// ── Constants ─────────────────────────────────────────
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

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
  const { posts: contextPosts, updatePost, removePost } = useCalendar()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [platformFilter, setPlatformFilter] = useState('all')

  // Drag state
  const [dragPostId, setDragPostId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createInitialDate, setCreateInitialDate] = useState<{ year: number; month: number; day: number } | undefined>()
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    setToasts(prev => [...prev, { ...t, id: shortId() }])
  }, [])
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
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
        caption: p.caption, hashtags: p.hashtags,
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
    setCreateInitialDate({ year: y, month: m, day: d })
    setCreateModalOpen(true)
  }

  // ── Open edit modal ────────────────────────────────
  const openEditPost = (post: CalPost) => {
    if (post.isMock) return // mock posts are read-only for now
    const sp = contextPosts.find(p => p.id === post.id)
    if (sp) { setEditPost(sp); setEditModalOpen(true) }
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

  // ── Render post pill (used in week/day view) ───────
  const renderPostPill = (p: CalPost) => (
    <div
      key={p.id}
      className={`${styles.postPill} ${dragPostId === p.id ? styles.postPillDragging : ''}`}
      style={{ borderLeftColor: p.color, background: `${p.color}18` }}
      draggable={!p.isMock}
      onDragStart={() => !p.isMock && handleDragStart(p.id)}
      onDragEnd={handleDragEnd}
      onClick={e => { e.stopPropagation(); openEditPost(p) }}
      title={p.title}
    >
      <span className={styles.pillTime}>{p.time}</span>
      <span className={styles.pillTitle}>{p.title}</span>
      <span className={styles.pillPlatform} style={{ color: p.color }}>{p.platform}</span>
    </div>
  )

  // ── Month View ─────────────────────────────────────
  const renderMonthView = () => (
    <div className={`glass-card ${styles.calCard}`}>
      <div className={styles.dayHeaders}>
        {DAYS_SHORT.map(d => <span key={d} className={styles.dayHeader}>{d}</span>)}
      </div>
      <div className={styles.grid}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className={styles.cellEmpty} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = getPostKey(year, month, day)
          const posts = filteredPostsByKey[key] ?? []
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSelected = day === selectedDay
          const isDragOver = dragOverKey === key

          return (
            <div
              key={day}
              className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${isSelected ? styles.cellSelected : ''} ${isDragOver ? styles.cellDragOver : ''}`}
              onClick={() => setSelectedDay(day)}
              onDragOver={e => handleDragOver(e, key)}
              onDrop={e => handleDrop(e, year, month, day)}
              onDragLeave={() => setDragOverKey(null)}
            >
              <div className={styles.cellTop}>
                <span className={styles.dayNum}>{day}</span>
                <button
                  className={styles.cellAddBtn}
                  onClick={e => { e.stopPropagation(); openCreateForDay(year, month, day) }}
                  title="Add post"
                >
                  <Plus size={10} />
                </button>
              </div>
              <div className={styles.cellPosts}>
                {posts.slice(0, 3).map(p => (
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
                    onClick={e => { e.stopPropagation(); openEditPost(p) }}
                    title={`${p.time} · ${p.title}`}
                  >
                    <span className={styles.chipTime}>{p.time}</span>
                    <span className={styles.chipTitle}>{p.title}</span>
                  </div>
                ))}
                {posts.length > 3 && (
                  <span className={styles.moreCount}>+{posts.length - 3} more</span>
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
  const renderWeekView = () => (
    <div className={`glass-card ${styles.calCard} ${styles.weekCard}`}>
      {/* Column headers */}
      <div className={styles.weekHeader}>
        <div className={styles.weekTimeGutter} />
        {weekDays.map(({ y, m, d }) => {
          const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
          const isSelected = d === selectedDay && m === month && y === year
          return (
            <div
              key={`${y}-${m}-${d}`}
              className={`${styles.weekColHeader} ${isToday ? styles.weekColToday : ''} ${isSelected ? styles.weekColSelected : ''}`}
              onClick={() => { setYear(y); setMonth(m); setSelectedDay(d) }}
            >
              <span className={styles.weekColDay}>{DAYS_SHORT[new Date(y, m, d).getDay()]}</span>
              <span className={styles.weekColNum}>{d}</span>
            </div>
          )
        })}
      </div>

      {/* Timeline */}
      <div className={styles.weekBody}>
        {HOURS.map(hour => (
          <div key={hour} className={styles.weekRow}>
            <div className={styles.weekTimeLabel}>{String(hour).padStart(2, '0')}:00</div>
            {weekDays.map(({ y, m, d }) => {
              const key = getPostKey(y, m, d)
              const postsInSlot = (filteredPostsByKey[key] ?? []).filter(p => {
                const slot = timeToSlot(p.time)
                return slot >= (hour - 6) * 60 && slot < (hour - 6 + 1) * 60
              })
              const isDragOver = dragOverKey === `${key}-${hour}`
              return (
                <div
                  key={`${key}-${hour}`}
                  className={`${styles.weekCell} ${isDragOver ? styles.cellDragOver : ''}`}
                  onClick={() => openCreateForDay(y, m, d)}
                  onDragOver={e => handleDragOver(e, `${key}-${hour}`)}
                  onDrop={e => handleDrop(e, y, m, d)}
                  onDragLeave={() => setDragOverKey(null)}
                >
                  {postsInSlot.map(p => renderPostPill(p))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  // ── Day View ───────────────────────────────────────
  const renderDayView = () => {
    const dayKey = getPostKey(year, month, selectedDay ?? today.getDate())
    const dayPosts = filteredPostsByKey[dayKey] ?? []
    const d = selectedDay ?? today.getDate()
    return (
      <div className={`glass-card ${styles.calCard} ${styles.dayViewCard}`}>
        <div className={styles.dayViewTitle}>
          {DAYS_SHORT[new Date(year, month, d).getDay()]}, {MONTHS[month]} {d}
        </div>
        <div className={styles.dayBody}>
          {HOURS.map(hour => {
            const postsInSlot = dayPosts.filter(p => {
              const slot = timeToSlot(p.time)
              return slot >= (hour - 6) * 60 && slot < (hour - 6 + 1) * 60
            })
            const isDragOver = dragOverKey === `day-${hour}`
            return (
              <div key={hour} className={styles.dayRow}>
                <div className={styles.dayTimeLabel}>{String(hour).padStart(2, '0')}:00</div>
                <div
                  className={`${styles.daySlot} ${isDragOver ? styles.cellDragOver : ''}`}
                  onClick={() => openCreateForDay(year, month, d)}
                  onDragOver={e => handleDragOver(e, `day-${hour}`)}
                  onDrop={e => handleDrop(e, year, month, d)}
                  onDragLeave={() => setDragOverKey(null)}
                >
                  {postsInSlot.map(p => renderPostPill(p))}
                </div>
              </div>
            )
          })}
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
                        onClick={() => openEditPost(p)}
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
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Calendar</h1>
          <p className={styles.subtitle}>Lên lịch và quản lý tất cả bài đăng của bạn</p>
        </div>
        <button
          className={styles.newPostBtn}
          onClick={() => { setCreateInitialDate(undefined); setCreateModalOpen(true) }}
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

        {/* Nav controls */}
        <div className={styles.navControls}>
          <button className={styles.navBtn} onClick={onPrev}><ChevronLeft size={15} /></button>
          <span className={styles.navTitle}>{navTitle}</span>
          <button className={styles.navBtn} onClick={onNext}><ChevronRight size={15} /></button>
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

      {/* Modals */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setCreateInitialDate(undefined) }}
        onToast={addToast}
        initialDate={createInitialDate}
      />

      <EditPostModal
        post={editPost}
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditPost(null) }}
        onSave={(id, changes) => {
          updatePost(id, changes)
          addToast({ message: 'Post updated!', type: 'success' })
        }}
        onDelete={(id) => {
          removePost(id)
          addToast({ message: 'Post deleted.', type: 'success' })
        }}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
