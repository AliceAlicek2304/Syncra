export type ViewMode = 'month' | 'week' | 'day'
export type PostStatus = 'idea' | 'published' | 'publishing' | 'partial' | 'failed' | 'scheduled' | 'draft'

export interface CalPost {
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

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const CURRENT_YEAR = new Date().getFullYear()
export const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

import { ZERNIO_PLATFORMS } from '../../data/platforms'

// Platform-specific color overrides for calendar views.
// Uses CSS variables for theme-aware coloring where available.
const CALENDAR_PLATFORM_COLORS: Record<string, string> = {
  tiktok:    'var(--purple-500)',
  instagram: 'var(--pink-500)',
  facebook:  '#3b82f6',
  twitter:   '#f59e0b',
  linkedin:  'var(--cyan-400)',
  youtube:   '#ef4444',
}

export const PLATFORMS = [
  { id: 'all', label: 'All', color: 'var(--purple-500)' },
  ...ZERNIO_PLATFORMS.map(p => ({
    id: p.id,
    label: p.label,
    color: CALENDAR_PLATFORM_COLORS[p.id] ?? p.color,
  })),
]

export function getPostKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`
}

export function getStatusLabel(s: PostStatus) {
  if (s === 'published') return 'Posted'
  if (s === 'publishing') return 'Publishing'
  if (s === 'partial') return 'Partial'
  if (s === 'failed') return 'Failed'
  if (s === 'scheduled') return 'Scheduled'
  return 'Draft'
}

export function getWeekDays(year: number, month: number, day: number): { y: number; m: number; d: number }[] {
  const date = new Date(year, month, day)
  const dow = date.getDay()
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(year, month, day - dow + i)
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }
  })
}

export const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

export function timeToSlot(time: string): number {
  if (!time || time === '—') return 0
  const [h, m] = time.split(':').map(Number)
  return (h - 6) * 60 + (m || 0)
}
