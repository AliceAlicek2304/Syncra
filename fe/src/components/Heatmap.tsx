import { useMemo, useState } from 'react'
import type { HeatmapSlotDto } from '../api/analytics'
import styles from './Heatmap.module.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21]

interface HeatmapProps {
  slots?: HeatmapSlotDto[]
}

interface HoverCell {
  day: number
  hour: number
  score: number
}

const toLocalSlot = (dayOfWeek: number, hourUtc: number) => {
  const utcDate = new Date(Date.UTC(2020, 0, 6 + dayOfWeek, hourUtc, 0, 0, 0))
  const localDay = (utcDate.getDay() + 6) % 7
  const localHour = utcDate.getHours()

  return { localDay, localHour }
}

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

export default function Heatmap({ slots = [] }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HoverCell | null>(null)

  const matrix = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))

    slots.forEach((slot) => {
      const { localDay, localHour } = toLocalSlot(slot.dayOfWeek, slot.hour)
      grid[localDay][localHour] += Math.max(0, slot.score)
    })

    return grid
  }, [slots])

  const maxScore = useMemo(
    () => matrix.flat().reduce((max, score) => Math.max(max, score), 0),
    [matrix]
  )

  return (
    <div className={styles.heatmap}>
      <div className={styles.yAxis}>
        {DAYS.map((day) => (
          <span key={day} className={styles.axisLabel}>{day}</span>
        ))}
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {matrix.map((row, dayIndex) => (
            <div key={DAYS[dayIndex]} className={styles.row}>
              {row.map((score, hour) => {
                const intensity = maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0
                const background =
                  intensity <= 0
                    ? 'rgba(255, 241, 231, 0.45)'
                    : `rgba(255, 79, 0, ${0.12 + intensity * 0.58})`

                return (
                  <button
                    key={`${dayIndex}-${hour}`}
                    type="button"
                    className={styles.cell}
                    style={{
                      background,
                      boxShadow: intensity >= 0.75 ? '0 0 0 1px rgba(255, 79, 0, 0.35)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredCell({ day: dayIndex, hour, score })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onFocus={() => setHoveredCell({ day: dayIndex, hour, score })}
                    onBlur={() => setHoveredCell(null)}
                    aria-label={`${DAYS[dayIndex]}, ${formatHour(hour)} — ${score} posts published`}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className={styles.xAxis}>
          {TICKS.map((hour) => (
            <span key={hour} className={styles.axisLabel}>{formatHour(hour)}</span>
          ))}
        </div>

        {hoveredCell && (
          <div className={styles.tooltip}>
            {`${DAYS[hoveredCell.day]}, ${formatHour(hoveredCell.hour)} — ${hoveredCell.score} posts published`}
          </div>
        )}
      </div>
    </div>
  )
}
