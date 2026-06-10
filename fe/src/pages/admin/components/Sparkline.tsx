import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

type Props = { data: number[]; color?: string; showTrend?: boolean }

export default function Sparkline({ data, color = '#FF4F4F', showTrend = true }: Props) {
  const firstValue = data[0] ?? 0
  const lastValue = data[data.length - 1] ?? 0
  const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'flat'
  const trendPercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100).toFixed(1) : '0'
  
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: `${color}20`,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 30 }}>
        <Line data={chartData as any} options={options as any} />
      </div>
      {showTrend && (
        <span style={{ 
          fontSize: 11, 
          color: trend === 'up' ? '#4FFF4F' : trend === 'down' ? '#FF4F4F' : '#939084',
          fontWeight: 600
        }}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'} {Math.abs(parseFloat(trendPercent))}%
        </span>
      )}
    </div>
  )
}
