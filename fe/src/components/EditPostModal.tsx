import { useState, useEffect } from 'react'
import { X, Clock, Check } from 'lucide-react'
import type { ScheduledPost } from '../context/calendarContextBase'
import styles from './EditPostModal.module.css'

const PLATFORM_OPTIONS = [
  { id: 'TikTok', label: 'TikTok', color: '#8b5cf6' },
  { id: 'Instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'Facebook', label: 'Facebook', color: '#3b82f6' },
  { id: 'X', label: 'X / Twitter', color: '#f59e0b' },
  { id: 'LinkedIn', label: 'LinkedIn', color: '#22d3ee' },
  { id: 'YouTube', label: 'YouTube', color: '#ef4444' },
]

const STATUS_OPTIONS: { value: ScheduledPost['status']; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

interface Props {
  post: ScheduledPost | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, changes: Partial<Omit<ScheduledPost, 'id'>>) => void
  onDelete: (id: string) => void
}

export default function EditPostModal({ post, isOpen, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [platform, setPlatform] = useState('TikTok')
  const [status, setStatus] = useState<ScheduledPost['status']>('scheduled')
  const [time, setTime] = useState('09:00')
  const [day, setDay] = useState(1)
  const [month, setMonth] = useState(0)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (post) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTitle(post.title)
      setCaption(post.caption)
      setPlatform(post.platform)
      setStatus(post.status)
      setTime(post.time === '—' ? '09:00' : post.time)
      setDay(post.day)
      setMonth(post.month)
      setYear(post.year)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [post])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !post) return null

  const platformColor = PLATFORM_OPTIONS.find(p => p.id === platform)?.color ?? '#8b5cf6'

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const handleSave = () => {
    onSave(post.id, {
      title,
      caption,
      platform,
      status,
      time,
      day,
      month,
      year,
      color: platformColor,
    })
    onClose()
  }

  const handleDelete = () => {
    onDelete(post.id)
    onClose()
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.platformDot} style={{ background: platformColor }} />
            <span className={styles.headerTitle}>Edit Post</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Post title..."
            />
          </div>

          {/* Platform */}
          <div className={styles.field}>
            <label className={styles.label}>Platform</label>
            <div className={styles.platformChips}>
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.id}
                  className={`${styles.platformChip} ${platform === p.id ? styles.platformChipActive : ''}`}
                  style={platform === p.id ? { borderColor: p.color, background: `${p.color}20`, color: p.color } : {}}
                  onClick={() => setPlatform(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <div className={styles.statusChips}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  className={`${styles.statusChip} ${styles[`status_${s.value}`]} ${status === s.value ? styles.statusChipActive : ''}`}
                  onClick={() => setStatus(s.value)}
                >
                  {status === s.value && <Check size={11} />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time row */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Date</label>
              <div className={styles.dateRow}>
                <select
                  className={styles.select}
                  value={day}
                  onChange={e => setDay(Number(e.target.value))}
                >
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = new Date().getFullYear() - 1 + i
                    return <option key={y} value={y}>{y}</option>
                  })}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                Time
              </label>
              <input
                type="time"
                className={styles.input}
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Caption */}
          <div className={styles.field}>
            <label className={styles.label}>Caption</label>
            <textarea
              className={styles.textarea}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Post caption..."
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
          <div className={styles.footerSpacer} />
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}
