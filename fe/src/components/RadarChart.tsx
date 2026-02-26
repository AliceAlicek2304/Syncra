import { useMemo } from 'react'
import styles from './RadarChart.module.css'

interface RadarData {
  label: string
  value: number // 0 to 1
}

interface RadarChartProps {
  data: RadarData[]
  size?: number
}

export default function RadarChart({ data, size = 300 }: RadarChartProps) {
  const center = size / 2
  const radius = (size / 2) * 0.8

  const points = useMemo(() => {
    return data.map((d, i) => {
      const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
      return {
        x: center + radius * d.value * Math.cos(angle),
        y: center + radius * d.value * Math.sin(angle),
        labelX: center + (radius + 25) * Math.cos(angle),
        labelY: center + (radius + 15) * Math.sin(angle),
        angle
      }
    })
  }, [data, center, radius])

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ')

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1]

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid lines */}
        {gridLevels.map(level => (
          <polygon
            key={level}
            points={data.map((_, i) => {
              const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
              return `${center + radius * level * Math.cos(angle)},${center + radius * level * Math.sin(angle)}`
            }).join(' ')}
            className={styles.gridLine}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              className={styles.gridLine}
            />
          )
        })}

        {/* Data polygon */}
        <polygon points={polygonPath} className={styles.dataPolygon} />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" className={styles.dataPoint} />
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            className={styles.label}
          >
            {data[i].label}
          </text>
        ))}
      </svg>
    </div>
  )
}
