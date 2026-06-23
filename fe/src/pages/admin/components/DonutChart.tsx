import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

type Props = { data: number[]; labels?: string[]; colors?: string[] }

export default function DonutChart({ data, labels, colors }: Props) {
  const defaultColors = colors ?? [
    '#FF4F4F', '#FF8F4F', '#8B5CF6', '#10B981', '#2563EB', '#8F4FFF', '#FF4FFF'
  ]
  
  const chartData = {
    labels: labels ?? data.map((_, i) => `Item ${i + 1}`),
    datasets: [
      {
        data,
        backgroundColor: defaultColors,
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        display: true, 
        position: 'right' as const,
        labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
      },
      tooltip: { enabled: true } 
    },
  }

  return <div style={{ height: 200 }}><Doughnut data={chartData as any} options={options as any} /></div>
}
