import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

type Props = { data: number[]; labels?: string[] }

export default function TrendChart({ data, labels }: Props) {
  const chartData = {
    labels: labels ?? data.map((_, i) => `M${i + 1}`),
    datasets: [
      {
        data,
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(255,79,0,0.08)',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        fill: true,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.03)' } } },
  }

  return <div style={{ height: 180 }}><Line data={chartData as any} options={options as any} /></div>
}
