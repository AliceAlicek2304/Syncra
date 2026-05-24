import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Check } from 'lucide-react'
import type { ScheduledPost } from '../context/calendarContextBase'
import styles from './EditPostModal.module.css'

const PLATFORM_OPTIONS = [
  { id: 'tiktok', label: 'TikTok', color: '#8b5cf6' },
  { id: 'instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'facebook', label: 'Facebook', color: '#3b82f6' },
  { id: 'twitter', label: 'X / Twitter', color: '#f59e0b' },
  { id: 'linkedin', label: 'LinkedIn', color: '#22d3ee' },
  { id: 'youtube', label: 'YouTube', color: '#ef4444' },
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
  const [form, setForm] = useState({
    title: '',
    caption: '',
    platform: 'tiktok',
    status: 'scheduled' as ScheduledPost['status'],
    time: '09:00',
    day: 1,
    month: 0,
    year: new Date().getFullYear(),
  })

  useEffect(() => {
    if (post) {
      queueMicrotask(() => setForm({
        title: post.title,
        caption: post.caption,
        platform: post.platform,
        status: post.status,
        time: post.time === '—' ? '09:00' : post.time,
        day: post.day,
        month: post.month,
        year: post.year,
      }))
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

  const platformColor = PLATFORM_OPTIONS.find(p => p.id === form.platform)?.color ?? '#8b5cf6'

  const daysInMonth = new Date(form.year, form.month + 1, 0).getDate()

  const handleSave = () => {
    if (!post) return
    onSave(post.id, {
      title: form.title,
      caption: form.caption,
      platform: form.platform,
      status: form.status,
      time: form.time,
      day: form.day,
      month: form.month,
      year: form.year,
      color: platformColor,
    })
    onClose()
  }

  const handleDelete = () => {
    if (!post) return
    onDelete(post.id)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && post && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
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
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
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
                      className={`${styles.platformChip} ${form.platform === p.id ? styles.platformChipActive : ''}`}
                      style={form.platform === p.id ? { borderColor: p.color, background: `${p.color}20`, color: p.color } : {}}
                      onClick={() => setForm(f => ({ ...f, platform: p.id }))}
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
                      className={`${styles.statusChip} ${styles[`status_${s.value}`]} ${form.status === s.value ? styles.statusChipActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, status: s.value }))}
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
                      value={form.day}
                      onChange={e => setForm(f => ({ ...f, day: Number(e.target.value) }))}
                    >
                      {Array.from({ length: daysInMonth }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <select
                      className={styles.select}
                      value={form.month}
                      onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <select
                      className={styles.select}
                      value={form.year}
                      onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
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
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Caption */}
              <div className={styles.field}>
                <label className={styles.label}>Caption</label>
                <textarea
                  className={styles.textarea}
                  value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
