import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler, Legend)

type Dataset = {
  label: string
  data: number[]
  color?: string
}

const palette = ['#2563eb', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b']

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`
  return value.toLocaleString('vi-VN')
}

const basePlugins = (formatter?: (value: number) => string, showLegend = false) => ({
  legend: {
    display: showLegend,
    position: 'bottom' as const,
    labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, color: '#475569' },
  },
  tooltip: {
    backgroundColor: '#0f172a',
    padding: 12,
    titleColor: '#ffffff',
    bodyColor: '#e2e8f0',
    callbacks: {
      label: (context: any) => {
        const raw = Number(context.parsed?.y ?? context.parsed ?? 0)
        const label = context.dataset?.label ? `${context.dataset.label}: ` : ''
        return `${label}${formatter ? formatter(raw) : raw.toLocaleString('vi-VN')}`
      },
    },
  },
})

export function ModernLineChart({
  data,
  datasets,
  labels,
  color = '#2563eb',
  height = 260,
  formatter,
}: {
  data?: number[]
  datasets?: Dataset[]
  labels?: string[]
  color?: string
  height?: number
  formatter?: (value: number) => string
}) {
  const series = datasets?.length ? datasets : [{ label: 'Giá trị', data: data ?? [], color }]
  if (series.every((item) => item.data.length === 0)) {
    return <div style={{ height, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</div>
  }

  return (
    <div style={{ height }}>
      <Line
        data={{
          labels: labels ?? series[0].data.map((_, index) => `T${index + 1}`),
          datasets: series.map((item, index) => {
            const color = item.color ?? palette[index % palette.length]
            return {
              label: item.label,
              data: item.data,
              borderColor: color,
              backgroundColor: `${color}1f`,
              fill: index === 0,
              borderWidth: 2.5,
              tension: 0.36,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: color,
              pointBorderWidth: 2,
            }
          }),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: basePlugins(formatter, series.length > 1),
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0 }, border: { display: false } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(148, 163, 184, .18)' },
              ticks: { color: '#94a3b8', callback: (value: string | number) => formatter ? formatter(Number(value)) : formatCompact(Number(value)) },
              border: { display: false },
            },
          },
        } as any}
      />
    </div>
  )
}

export function ModernBarChart({
  data,
  labels,
  colors,
  height = 240,
  formatter,
}: {
  data: number[]
  labels?: string[]
  colors?: string[]
  height?: number
  formatter?: (value: number) => string
}) {
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels: labels ?? data.map((_, index) => `T${index + 1}`),
          datasets: [{
            label: 'Giá trị',
            data,
            backgroundColor: colors ?? data.map((_, index) => palette[index % palette.length]),
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 42,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: basePlugins(formatter, false),
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', maxRotation: 0 }, border: { display: false } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(148, 163, 184, .18)' },
              ticks: { color: '#94a3b8', callback: (value: string | number) => formatter ? formatter(Number(value)) : formatCompact(Number(value)) },
              border: { display: false },
            },
          },
        } as any}
      />
    </div>
  )
}

export function ModernDonutChart({
  data,
  labels,
  colors,
  height = 280,
}: {
  data: number[]
  labels?: string[]
  colors?: string[]
  height?: number
}) {
  const hasData = data.some((item) => item > 0)
  const values = hasData ? data : [1]

  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels: hasData ? labels : ['Chưa có dữ liệu'],
          datasets: [{
            data: values,
            backgroundColor: hasData ? (colors ?? palette) : ['#e2e8f0'],
            borderColor: '#ffffff',
            borderWidth: 4,
            cutout: '68%',
          }],
        } as any}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: basePlugins(undefined, true),
        } as any}
      />
    </div>
  )
}
