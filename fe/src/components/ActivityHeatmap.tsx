import { useMemo, useState } from 'react'
import type { ZernioDailyDataPointDto } from '../api/analytics'
import styles from './ActivityHeatmap.module.css'

interface ActivityHeatmapProps {
  dataPoints?: ZernioDailyDataPointDto[]
}

interface HoverInfo {
  date: string
  postCount: number
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const getLevel = (score: number, maxScore: number): number => {
  if (maxScore === 0 || score === 0) return 0
  const ratio = score / maxScore
  if (ratio <= 0.2) return 1
  if (ratio <= 0.4) return 2
  if (ratio <= 0.6) return 3
  if (ratio <= 0.8) return 4
  return 5
}

function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function formatDay(postCount: number, maxScore: number): string {
  if (maxScore === 0) return 'No activity'
  if (postCount === 0) return 'No posts'
  return `${postCount} post${postCount !== 1 ? 's' : ''} published`
}

interface WeekColumn {
  weekStart: Date
  days: (ZernioDailyDataPointDto | null)[]
}

export default function ActivityHeatmap({ dataPoints = [] }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null)

  const maxScore = useMemo(
    () => dataPoints.reduce((max, d) => Math.max(max, d.postCount), 0),
    [dataPoints]
  )

  const byDate = useMemo(() => {
    const map = new Map<string, ZernioDailyDataPointDto>()
    for (const dp of dataPoints) {
      map.set(dp.date, dp)
    }
    return map
  }, [dataPoints])

  const weeks = useMemo(() => {
    if (dataPoints.length === 0) return []

    const dates = dataPoints
      .map(d => parseDate(d.date))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime())

    if (dates.length === 0) return []

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]

    const firstDayOfWeek = firstDate.getDay()
    const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek
    const monday = new Date(firstDate)
    monday.setDate(firstDate.getDate() + mondayOffset)

    const columns: WeekColumn[] = []
    const current = new Date(monday)

    while (current <= lastDate) {
      const days: (ZernioDailyDataPointDto | null)[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(current)
        d.setDate(current.getDate() + i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        days.push(byDate.get(key) ?? null)
      }
      columns.push({ weekStart: new Date(current), days })
      current.setDate(current.getDate() + 7)
    }

    return columns
  }, [dataPoints, byDate])

  const monthMarkers = useMemo(() => {
    if (weeks.length === 0) return []
    const markers: { label: string; col: number }[] = []
    let lastMonth = -1

    for (let col = 0; col < weeks.length; col++) {
      const week = weeks[col]
      for (const day of week.days) {
        if (day) {
          const date = parseDate(day.date)
          if (date && date.getMonth() !== lastMonth) {
            lastMonth = date.getMonth()
            markers.push({ label: MONTH_LABELS[lastMonth], col })
          }
          break
        }
      }
    }
    return markers
  }, [weeks])

  if (dataPoints.length === 0) {
    return <div className={styles.empty}>No activity data yet.</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.monthRow}>
        <div className={styles.monthSpacer} />
        <div className={styles.monthLabels}>
          {monthMarkers.map((m, i) => (
            <span
              key={i}
              className={styles.monthLabel}
              style={{ gridColumn: m.col + 1 }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.dayLabels}>
          {DAY_LABELS.map((label, i) => (
            <span key={i} className={styles.dayLabel}>{label}</span>
          ))}
        </div>

        <div className={styles.grid}>
          {weeks.map((week, col) => (
            <div key={col} className={styles.weekCol}>
              {week.days.map((day, row) => {
                const level = day ? getLevel(day.postCount, maxScore) : 0
                return (
                  <button
                    key={row}
                    type="button"
                    className={`${styles.cell} ${styles[`level${level}`]}`}
                    onMouseEnter={() => {
                      if (day) setHovered({ date: day.date, postCount: day.postCount })
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => {
                      if (day) setHovered({ date: day.date, postCount: day.postCount })
                    }}
                    onBlur={() => setHovered(null)}
                    aria-label={day ? `${day.date}: ${formatDay(day.postCount, maxScore)}` : 'No data'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {hovered && (
        <div className={styles.tooltip}>
          <strong>{hovered.date}</strong>
          <span>{formatDay(hovered.postCount, maxScore)}</span>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.legendLabel}>Fewer</span>
        <div className={`${styles.cell} ${styles.level0}`} />
        <div className={`${styles.cell} ${styles.level1}`} />
        <div className={`${styles.cell} ${styles.level2}`} />
        <div className={`${styles.cell} ${styles.level3}`} />
        <div className={`${styles.cell} ${styles.level4}`} />
        <div className={`${styles.cell} ${styles.level5}`} />
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  )
}
