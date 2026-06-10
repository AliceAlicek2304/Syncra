import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type Props = { data: number[]; labels?: string[]; colors?: string[] }

export default function BarChart({ data, labels, colors }: Props) {
  const defaultColors = colors ?? data.map((_, i) => `hsl(${20 + i * 15}, 70%, 50%)`)
  
  const chartData = {
    labels: labels ?? data.map((_, i) => `M${i + 1}`),
    datasets: [
      {
        data,
        backgroundColor: defaultColors,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: { 
      x: { grid: { display: false } }, 
      y: { grid: { color: 'rgba(0,0,0,0.03)' } } 
    },
  }

  return <div style={{ height: 180 }}><Bar data={chartData as any} options={options as any} /></div>
}
