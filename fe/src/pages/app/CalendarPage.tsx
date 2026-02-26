import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GlassUpload from '../../components/GlassUpload'
import { useCalendar } from '../../context/CalendarContext'
import styles from './CalendarPage.module.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type PostStatus = 'published' | 'scheduled' | 'draft'

interface CalPost {
  id: string
  title: string
  platform: string
  status: PostStatus
  time: string
  color: string
}

const MOCK_POSTS: Record<number, CalPost[]> = {
  18: [{ id: 'a1', title: 'Tips làm content', platform: 'TikTok', status: 'published', time: '19:00', color: '#8b5cf6' }],
  19: [
    { id: 'a2', title: 'AI Tools 2026', platform: 'Instagram', status: 'published', time: '08:00', color: '#ec4899' },
    { id: 'a3', title: 'Day in my life', platform: 'TikTok', status: 'published', time: '20:00', color: '#8b5cf6' },
  ],
  22: [{ id: 'a4', title: 'Workspace setup', platform: 'Instagram', status: 'published', time: '09:00', color: '#ec4899' }],
  24: [
    { id: 'a5', title: 'Multi-platform tips', platform: 'LinkedIn', status: 'published', time: '10:00', color: '#22d3ee' },
    { id: 'a6', title: 'Creator growth thread', platform: 'X', status: 'scheduled', time: '20:00', color: '#f59e0b' },
  ],
  25: [{ id: 'a7', title: 'Behind the scenes', platform: 'Instagram', status: 'scheduled', time: '08:00', color: '#ec4899' }],
  27: [
    { id: 'a8', title: '5 lỗi mới làm YouTube', platform: 'YouTube', status: 'scheduled', time: '15:00', color: '#ef4444' },
    { id: 'a9', title: 'Productivity hacks', platform: 'TikTok', status: 'draft', time: '—', color: '#8b5cf6' },
  ],
  28: [{ id: 'a10', title: 'Q&A với followers', platform: 'Instagram', status: 'scheduled', time: '19:00', color: '#ec4899' }],
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const { posts: contextPosts } = useCalendar()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Merge mock posts with AI-scheduled posts from context
  const allPosts = useMemo(() => {
    const merged: Record<number, CalPost[]> = {}
    Object.entries(MOCK_POSTS).forEach(([d, ps]) => { merged[Number(d)] = [...ps] })
    contextPosts
      .filter(p => p.year === year && p.month === month)
      .forEach(p => {
        const existing = merged[p.day] ?? []
        merged[p.day] = [
          ...existing,
          { id: p.id, title: p.title, platform: p.platform, status: p.status, time: p.time, color: p.color },
        ]
      })
    return merged
  }, [contextPosts, year, month])

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

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const selectedPosts = selectedDay ? (allPosts[selectedDay] ?? []) : []

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Calendar</h1>
          <p className={styles.subtitle}>Lên lịch và quản lý tất cả bài đăng của bạn</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/app/ai')} style={{ fontSize: 13 }}>
          <Plus size={14} /> Tạo post mới
        </button>
      </div>

      <div className={styles.body}>
        {/* Calendar */}
        <div className={`glass-card ${styles.calCard}`}>
          {/* Month nav */}
          <div className={styles.monthNav}>
            <div className={styles.navLeft}>
              <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={16} /></button>
              
              <div className={styles.selectors}>
                <select 
                  className={styles.dateSelect} 
                  value={month} 
                  onChange={(e) => { setMonth(parseInt(e.target.value)); setSelectedDay(null) }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>

                <select 
                  className={styles.dateSelect} 
                  value={year} 
                  onChange={(e) => { setYear(parseInt(e.target.value)); setSelectedDay(null) }}
                >
                  {Array.from({ length: 11 }).map((_, i) => {
                    const y = today.getFullYear() - 5 + i
                    return <option key={y} value={y}>{y}</option>
                  })}
                </select>
              </div>

              <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>

            <div className={styles.navRight}>
              <button 
                className={styles.todayBtn} 
                onClick={() => {
                  setYear(today.getFullYear())
                  setMonth(today.getMonth())
                  setSelectedDay(today.getDate())
                }}
              >
                Today
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className={styles.dayHeaders}>
            {DAYS.map(d => <span key={d} className={styles.dayHeader}>{d}</span>)}
          </div>

          {/* Grid */}
          <div className={styles.grid}>
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className={styles.cellEmpty} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const posts = allPosts[day] ?? []
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = day === selectedDay

              return (
                <div
                  key={day}
                  className={`${styles.cell} ${isToday ? styles.cellToday : ''} ${isSelected ? styles.cellSelected : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className={styles.dayNum}>{day}</span>
                  <div className={styles.cellPosts}>
                    {posts.slice(0, 2).map(p => (
                      <span key={p.id} className={styles.postDot} style={{ background: p.color }} title={p.title} />
                    ))}
                    {posts.length > 2 && <span className={styles.moreCount}>+{posts.length - 2}</span>}
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

        {/* Day detail */}
        <div className={`glass-card ${styles.detailCard}`}>
          {selectedDay ? (
            <>
              <div className={styles.detailHeader}>
                <span className={styles.detailDate}>{MONTHS[month]} {selectedDay}</span>
                <span className={styles.detailCount}>{selectedPosts.length} posts</span>
              </div>

              {selectedPosts.length === 0 ? (
                <div className={styles.emptyDay}>
                  <Clock size={28} className={styles.emptyIcon} />
                  <p>Chưa có post nào</p>
                  <button className="btn-primary" onClick={() => navigate('/app/ai')} style={{ fontSize: 12, padding: '8px 16px' }}>
                    <Plus size={12} /> Tạo ngay
                  </button>
                </div>
              ) : (
                <div className={styles.postList}>
                  {selectedPosts.map(p => (
                    <div key={p.id} className={styles.postItem} style={{ borderLeftColor: p.color }}>
                      <div className={styles.postInfo}>
                        <span className={styles.postTime}>{p.time}</span>
                        <span className={styles.postName}>{p.title}</span>
                        <span className={styles.postPlatform}>{p.platform}</span>
                      </div>
                      <div className={styles.postRight}>
                        <span className={`${styles.postStatus} ${styles[`s_${p.status}`]}`}>
                          {p.status === 'published' ? 'Đã đăng' : p.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                        </span>
                        <button className={styles.moreBtn}><MoreHorizontal size={14} /></button>
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
      </div>
      <GlassUpload />
    </div>
  )
}
