import styles from './Heatmap.module.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm']

interface HeatmapSlotDto {
  dayOfWeek: number
  hour: number
  score: number
}

interface HeatmapProps {
  data?: {
    slots: HeatmapSlotDto[]
  }
}

export default function Heatmap({ data }: HeatmapProps) {
  // Transform slots data into 7x8 grid (7 days x 8 time slots)
  const getHeatData = () => {
    if (!data?.slots) {
      // Return mock data if no real data provided
      return [
        [0.05, 0.02, 0.01, 0.15, 0.45, 0.55, 0.85, 0.65], // Mon
        [0.08, 0.03, 0.02, 0.20, 0.50, 0.60, 0.90, 0.70], // Tue
        [0.06, 0.02, 0.05, 0.25, 0.55, 0.55, 0.80, 0.60], // Wed
        [0.10, 0.04, 0.03, 0.30, 0.60, 0.85, 1.00, 0.75], // Thu (Peak)
        [0.15, 0.05, 0.08, 0.35, 0.65, 0.80, 0.95, 0.85], // Fri
        [0.20, 0.10, 0.15, 0.25, 0.70, 0.75, 0.85, 0.90], // Sat
        [0.18, 0.08, 0.10, 0.20, 0.55, 0.65, 0.75, 0.65], // Sun
      ]
    }

    // Group slots by dayOfWeek and hour, normalize scores to 0-1
    const maxScore = Math.max(...data.slots.map(slot => slot.score), 1)
    const grid: number[][] = Array(7).fill(0).map(() => Array(8).fill(0))

    // Map hours to 8 time slots (every 3 hours: 0, 3, 6, 9, 12, 15, 18, 21)
    const hourSlots = [0, 3, 6, 9, 12, 15, 18, 21]

    data.slots.forEach(slot => {
      const dayIndex = slot.dayOfWeek
      const hourIndex = hourSlots.indexOf(Math.floor(slot.hour / 3) * 3)
      if (dayIndex >= 0 && dayIndex < 7 && hourIndex >= 0 && hourIndex < 8) {
        grid[dayIndex][hourIndex] = slot.score / maxScore
      }
    })

    return grid
  }

  const heatData = getHeatData()

  return (
    <div className={styles.heatmap}>
      <div className={styles.yAxis}>
        {DAYS.map(day => <span key={day} className={styles.axisLabel}>{day}</span>)}
      </div>
      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {heatData.map((row, i) => (
            <div key={i} className={styles.row}>
              {row.map((val, j) => (
                <div
                  key={j}
                  className={styles.cell}
                  style={{
                    '--intensity': val,
                    background: val < 0.1
                      ? 'rgba(255, 255, 255, 0.03)'
                      : val < 0.5
                        ? `rgba(239, 68, 68, ${0.4 + (val * 1.2)})` // Reddish
                        : `rgb(255, ${100 + (val - 0.5) * 310}, 0)` // Orange to Yellow
                  } as React.CSSProperties}
                  title={`Activity intensity: ${Math.round(val * 100)}%`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className={styles.xAxis}>
          {HOURS.map(hour => <span key={hour} className={styles.axisLabel}>{hour}</span>)}
        </div>
      </div>
    </div>
  )
}
