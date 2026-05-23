import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, CalendarDays, List, LayoutGrid, ChevronDown, CheckCircle, Play } from 'lucide-react'
import { useCreatePostModal } from '../../context/createPostModalContext'
import type { ScheduledPost } from '../../context/calendarContextBase'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useToast } from '../../context/ToastContext'
import { useCalendarPosts } from '../../hooks/useCalendarPosts'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'
import { MonthView } from '../../components/calendar/MonthView'
import { WeekView } from '../../components/calendar/WeekView'
import { DayView } from '../../components/calendar/DayView'
import type { CalPost, ViewMode } from '../../components/calendar/CalendarConstants'
import { MONTHS, MONTHS_SHORT, YEARS, PLATFORMS, getPostKey, getStatusLabel } from '../../components/calendar/CalendarConstants'
import styles from './CalendarPage.module.css'

export default function CalendarPage() {
  const { activeWorkspace } = useWorkspace()
  const { error } = useToast()
  const { openCreatePost, openEditPost } = useCreatePostModal()
  const workspaceId = activeWorkspace?.id

  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const monthPickerRef = useRef<HTMLDivElement>(null)
  const yearPickerRef = useRef<HTMLDivElement>(null)
  const [tooltipData, setTooltipData] = useState<{ post: CalPost; x: number; y: number } | null>(null)
  const [dragPostId, setDragPostId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const { posts: calendarPosts, isLoading: isCalendarLoading, isFetching: isCalendarFetching, isMutating: isCalendarMutating, reschedule } = useCalendarPosts({ workspaceId, year, month })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) setShowMonthPicker(false)
      if (yearPickerRef.current && !yearPickerRef.current.contains(e.target as Node)) setShowYearPicker(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allPostsByKey = useMemo(() => {
    const mapped: Record<string, CalPost[]> = {}
    calendarPosts.forEach((post) => {
      const key = getPostKey(post.localYear, post.localMonth, post.localDay)
      const status = post.status;
      let color = '#94a3b8'; // draft
      if (status === 'published') color = '#22d3ee';
      else if (status === 'publishing') color = '#fbbf24';
      else if (status === 'partial') color = '#f97316';
      else if (status === 'failed') color = '#ef4444';
      else if (status === 'scheduled') color = '#a78bfa';
      mapped[key] = [...(mapped[key] ?? []), {
        id: post.id, title: post.title || 'Untitled post', platform: post.platforms?.[0] ?? 'Post',
        status, time: post.localTime, color, caption: post.content ?? '', hashtags: [],
      }]
    })
    return mapped
  }, [calendarPosts])

  const filteredPostsByKey = useMemo(() => {
    if (platformFilter === 'all') return allPostsByKey
    const result: Record<string, CalPost[]> = {}
    Object.entries(allPostsByKey).forEach(([key, posts]) => {
      const filtered = posts.filter(p => p.platform === platformFilter)
      if (filtered.length > 0) result[key] = filtered
    })
    return result
  }, [allPostsByKey, platformFilter])

  const prevMonth = useCallback(() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); setSelectedDay(null) }, [month])
  const nextMonth = useCallback(() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); setSelectedDay(null) }, [month])
  const adjustDate = useCallback((deltaDays: number) => {
    const d = new Date(year, month, (selectedDay ?? today.getDate()) + deltaDays)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(d.getDate())
  }, [year, month, selectedDay, today])
  const goToday = useCallback(() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()) }, [today])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { if (viewMode === 'month') prevMonth(); else if (viewMode === 'week') adjustDate(-7); else adjustDate(-1) }
    else if (e.key === 'ArrowRight') { if (viewMode === 'month') nextMonth(); else if (viewMode === 'week') adjustDate(7); else adjustDate(1) }
    else if (e.key === 't' || e.key === 'T') goToday()
  }, [viewMode, prevMonth, nextMonth, adjustDate, goToday])

  const handleDragStart = (postId: string) => setDragPostId(postId)
  const handleDragEnd = () => { setDragPostId(null); setDragOverKey(null) }
  const handleDragOver = (e: React.DragEvent, key: string) => { e.preventDefault(); setDragOverKey(key) }
  const handleDrop = async (e: React.DragEvent, targetYear: number, targetMonth: number, targetDay: number) => {
    e.preventDefault()
    if (!dragPostId) return
    const draggedPost = calendarPosts.find((post) => post.id === dragPostId)
    if (!draggedPost) { setDragPostId(null); setDragOverKey(null); return }
    const [hours = '9', minutes = '0'] = (draggedPost.localTime || '09:00').split(':')
    try { await reschedule({ postId: dragPostId, scheduledAtUtc: new Date(targetYear, targetMonth, targetDay, Number(hours), Number(minutes), 0, 0).toISOString() }) }
    catch { error('Could not reschedule post. Please try again.') }
    setDragPostId(null); setDragOverKey(null)
  }

  const openCreateForDay = (y: number, m: number, d: number) => openCreatePost({ source: 'calendar', initialDate: { year: y, month: m, day: d } })
  const handleOpenEditPost = (post: CalPost) => {
    const match = calendarPosts.find((p) => p.id === post.id)
    if (!match) return
    openEditPost({ id: match.id, year: match.localYear, month: match.localMonth, day: match.localDay, title: post.title, platform: post.platform, status: post.status, time: post.time, color: post.color, caption: post.caption, hashtags: post.hashtags, image: post.image, zernioPostId: match.zernioPostId, platformTargets: match.platformTargets } as ScheduledPost)
  }

  const selectedPosts = useMemo(() => {
    if (!selectedDay) return []
    return filteredPostsByKey[getPostKey(year, month, selectedDay)] ?? []
  }, [filteredPostsByKey, year, month, selectedDay])

  const onPrev = viewMode === 'month' ? prevMonth : viewMode === 'week' ? () => adjustDate(-7) : () => adjustDate(-1)
  const onNext = viewMode === 'month' ? nextMonth : viewMode === 'week' ? () => adjustDate(7) : () => adjustDate(1)

  return (
    <div className={styles.page} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Calendar</h1>
          <p className={styles.subtitle}>Lên lịch và quản lý tất cả bài đăng của bạn</p>
        </div>
        <button className={styles.newPostBtn} onClick={() => openCreatePost({ source: 'calendar' })}><Plus size={15} /> New Post</button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.viewSwitcher}>
          <button className={`${styles.viewBtn} ${viewMode === 'month' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('month')} title="Month view"><LayoutGrid size={14} /> Month</button>
          <button className={`${styles.viewBtn} ${viewMode === 'week' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('week')} title="Week view"><CalendarDays size={14} /> Week</button>
          <button className={`${styles.viewBtn} ${viewMode === 'day' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('day')} title="Day view"><List size={14} /> Day</button>
        </div>

        <div className={styles.navControls}>
          <button className={styles.navBtn} onClick={onPrev} aria-label="Previous"><ChevronLeft size={15} /></button>
          <div className={styles.pickerContainer}>
            <div className={styles.pickerTrigger}>
              <button className={styles.monthPickerBtn} onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false) }} aria-label="Select month">{MONTHS_SHORT[month]} <ChevronDown size={12} /></button>
              <button className={styles.yearPickerBtn} onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false) }} aria-label="Select year">{year} <ChevronDown size={12} /></button>
            </div>
            {showMonthPicker && (
              <div className={styles.pickerDropdown} ref={monthPickerRef} role="listbox" aria-label="Select month">
                {MONTHS.map((m, i) => (
                  <button key={m} className={`${styles.pickerOption} ${i === month ? styles.pickerOptionActive : ''}`} onClick={() => { setMonth(i); setShowMonthPicker(false); setSelectedDay(null) }} role="option" aria-selected={i === month}>{m}</button>
                ))}
              </div>
            )}
            {showYearPicker && (
              <div className={styles.pickerDropdown} ref={yearPickerRef} role="listbox" aria-label="Select year">
                {YEARS.map(y => (
                  <button key={y} className={`${styles.pickerOption} ${y === year ? styles.pickerOptionActive : ''}`} onClick={() => { setYear(y); setShowYearPicker(false); setSelectedDay(null) }} role="option" aria-selected={y === year}>{y}</button>
                ))}
              </div>
            )}
          </div>
          <button className={styles.navBtn} onClick={onNext} aria-label="Next"><ChevronRight size={15} /></button>
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
        </div>

        <div className={styles.platformFilter}>
          {PLATFORMS.map(p => (
            <button key={p.id} className={`${styles.filterChip} ${platformFilter === p.id ? styles.filterChipActive : ''}`} style={platformFilter === p.id ? { borderColor: p.color, color: p.color, background: `${p.color}18` } : {}} onClick={() => setPlatformFilter(p.id)}>{p.label}</button>
          ))}
        </div>
        {(isCalendarFetching || isCalendarMutating) && <span className={styles.savingIndicator}>Saving...</span>}
      </div>

      <div className={`${styles.body} ${viewMode !== 'month' ? styles.bodyFull : ''}`}>
        {viewMode === 'month' && <MonthView year={year} month={month} selectedDay={selectedDay} today={today} postsByKey={filteredPostsByKey} isLoading={isCalendarLoading} dragPostId={dragPostId} dragOverKey={dragOverKey} onSelectDay={setSelectedDay} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={() => setDragOverKey(null)} onOpenCreateForDay={openCreateForDay} onOpenEditPost={handleOpenEditPost} onShowTooltip={setTooltipData} />}
        {viewMode === 'week' && <WeekView year={year} month={month} selectedDay={selectedDay} today={today} postsByKey={filteredPostsByKey} isLoading={isCalendarLoading} dragPostId={dragPostId} dragOverKey={dragOverKey} onSelectDay={setSelectedDay} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={() => setDragOverKey(null)} onOpenCreateForDay={openCreateForDay} onOpenEditPost={handleOpenEditPost} />}
        {viewMode === 'day' && <DayView year={year} month={month} selectedDay={selectedDay} today={today} postsByKey={filteredPostsByKey} isLoading={isCalendarLoading} dragPostId={dragPostId} dragOverKey={dragOverKey} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={() => setDragOverKey(null)} onOpenCreateForDay={openCreateForDay} onOpenEditPost={handleOpenEditPost} />}

        {viewMode === 'month' && (
          <div className={`glass-card ${styles.detailCard}`}>
            {selectedDay ? (
              <>
                <div className={styles.detailHeader}>
                  <span className={styles.detailDate}>{MONTHS[month]} {selectedDay}</span>
                  <div className={styles.detailActions}>
                    <span className={styles.detailCount}>{selectedPosts.length} posts</span>
                    <button className={styles.detailAddBtn} onClick={() => openCreateForDay(year, month, selectedDay)} title="Add post"><Plus size={13} /></button>
                  </div>
                </div>
                {selectedPosts.length === 0 ? (
                  <div className={styles.emptyDay}>
                    <Clock size={28} className={styles.emptyIcon} />
                    <p>Chưa có post nào</p>
                    <button className="btn-primary" onClick={() => openCreateForDay(year, month, selectedDay)} style={{ fontSize: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Tạo ngay</button>
                  </div>
                ) : (
                  <div className={styles.postList}>
                    {selectedPosts.map(p => (
                      <div key={p.id} className={styles.postCard} onClick={() => handleOpenEditPost(p)}>
                        <div className={styles.postCardHeader}>
                          <div className={styles.postCardStatus}>
                            <CheckCircle size={14} className={styles.postCardStatusIcon} />
                            <span className={`${styles.postCardStatusText} ${p.status === 'scheduled' ? styles.postCardStatusTextScheduled : ''}`}>{getStatusLabel(p.status)}</span>
                          </div>
                          <span className={styles.postCardTime}>{p.time}</span>
                        </div>
                        <div className={styles.postCardBody}>
                          <div className={styles.postCardThumbnail}>
                            {p.image ? <img src={p.image} alt={p.title} /> : <div className={styles.postCardThumbnailPlaceholder} style={{ background: p.color }}><ExtendedPlatformIcon platform={p.platform} size={18} /></div>}
                            {(p.platform === 'YouTube' || p.platform === 'TikTok') && <div className={styles.postCardVideoOverlay}><Play size={18} className={styles.postCardVideoIcon} /></div>}
                          </div>
                          <div className={styles.postCardContent}>
                            <span className={styles.postCardTitle}>{p.title}</span>
                            {p.caption && <span className={styles.postCardCaption}>{p.caption}</span>}
                          </div>
                        </div>
                        <div className={styles.postCardFooter}>
                          <div className={styles.postCardPlatformIcon} style={{ background: p.color }} title={p.platform}><ExtendedPlatformIcon platform={p.platform} size={10} /></div>
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
        )}
      </div>

      {tooltipData && (
        <div className={styles.tooltip} style={{ left: tooltipData.x, top: tooltipData.y - 8, transform: 'translate(-50%, -100%)' }} role="tooltip">
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipTime}>{tooltipData.post.time}</div>
            <div className={styles.tooltipTitle}>{tooltipData.post.title}</div>
            <div className={styles.tooltipMeta}>
              <span className={styles.tooltipPlatform} style={{ color: tooltipData.post.color }}>{tooltipData.post.platform}</span>
              <span className={styles.tooltipStatus}>{getStatusLabel(tooltipData.post.status)}</span>
            </div>
          </div>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  )
}
