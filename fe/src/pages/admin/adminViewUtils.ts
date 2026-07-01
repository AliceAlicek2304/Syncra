export const monthLabels = Array.from({ length: 12 }, (_, index) => `T${index + 1}`)

export const pick = <T = any>(source: any, pascal: string, camel: string, fallback: T): T => {
  return (source?.[pascal] ?? source?.[camel] ?? fallback) as T
}

export const asNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export const normalizeMonths = (values: unknown, length = 12) => {
  if (!Array.isArray(values)) return Array(length).fill(0)
  const numeric = values.map(asNumber)
  if (numeric.length >= length) return numeric.slice(-length)
  return [...Array(length - numeric.length).fill(0), ...numeric]
}

export const sum = (values: number[]) => values.reduce((total, value) => total + asNumber(value), 0)

export const formatNumber = (value: unknown) => asNumber(value).toLocaleString('vi-VN')

export const formatPercent = (value: unknown) => `${asNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`

export const trendClass = (growth: unknown, styles: Record<string, string>) => {
  const text = String(growth ?? '')
  return text.includes('-') ? styles.statTrendDown : styles.statTrendUp
}

export const platformColor = (platform: string) => {
  const key = platform.toLowerCase()
  if (key.includes('facebook')) return '#1877f2'
  if (key.includes('instagram')) return '#e4405f'
  if (key.includes('linkedin')) return '#0a66c2'
  if (key.includes('youtube')) return '#ef4444'
  if (key.includes('tiktok')) return '#0f172a'
  if (key.includes('twitter') || key.includes('x')) return '#2563eb'
  return '#64748b'
}
