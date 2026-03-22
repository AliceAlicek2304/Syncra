export type ViewMode = 'month' | 'week' | 'day'
export type PostStatus = 'published' | 'scheduled' | 'draft'

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
  mediaIds?: string[]
  integrationId?: string | null
  isMock?: boolean
}

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

export const CURRENT_YEAR = new Date().getFullYear()
export const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

export const PLATFORMS = [
  { id: 'all', label: 'All', color: '#8b5cf6' },
  { id: 'TikTok', label: 'TikTok', color: '#8b5cf6' },
  { id: 'Instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'Facebook', label: 'Facebook', color: '#3b82f6' },
  { id: 'X', label: 'X', color: '#f59e0b' },
  { id: 'LinkedIn', label: 'LinkedIn', color: '#22d3ee' },
  { id: 'YouTube', label: 'YouTube', color: '#ef4444' },
]

// Platform gradient constants - defined once outside component
export const PLATFORM_GRADIENTS: Record<string, string> = {
  TikTok: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  Instagram: 'linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%)',
  Facebook: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  X: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  LinkedIn: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
  YouTube: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
}

export function getPostKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`
}

export function getStatusLabel(s: PostStatus) {
  if (s === 'published') return 'Posted'
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

export function timeToSlot(time: string): number {
  if (!time || time === '—') return -1
  const [h, m] = time.split(':').map(Number)
  return (h - 6) * 60 + (m || 0)
}