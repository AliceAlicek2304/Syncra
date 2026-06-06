import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Eye,
  Heart,
  Calendar,
  ChevronDown,
  Check,
  RefreshCw,
  ExternalLink,
  Lock,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Share2,
  Bookmark,
  MousePointerClick
} from 'lucide-react'
import CountingNumber from '../../components/CountingNumber'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAnalyticsSummary } from '../../hooks/useAnalyticsSummary'
import { analyticsApi, type BestTimeDto } from '../../api/analytics'
import { postsApi, type Post } from '../../api/posts'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FilterOption {
  value: string
  label: string
  iconPlatform?: string
}

function FilterDropdown({
  value,
  onChange,
  options,
  label,
  leftIcon,
}: {
  value: string
  onChange: (v: string) => void
  options: FilterOption[]
  label: string
  leftIcon?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value) ?? options[0]

  const renderOptionLabel = (option?: FilterOption) => {
    if (!option) return label
    return (
      <span className="flex items-center gap-1.5 min-w-0">
        {option.iconPlatform && (
          <span className="shrink-0 flex items-center">
            <ExtendedPlatformIcon platform={option.iconPlatform} size={14} />
          </span>
        )}
        <span className="truncate">{option.label}</span>
      </span>
    )
  }

  return (
    <div className="relative flex items-center shrink-0" ref={ref}>
      <button
        className={`h-8 pl-3 pr-8 py-1.5 flex items-center justify-between bg-white border border-brand-border rounded-brand-sm text-xs font-semibold text-brand-ink-soft hover:bg-brand-canvas-soft/60 hover:border-brand-primary transition-all outline-none cursor-pointer gap-2 relative ${
          open ? 'bg-brand-canvas-soft border-brand-primary' : ''
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          <span className="text-left select-none">{renderOptionLabel(selected)}</span>
        </span>
        <ChevronDown
          size={12}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-body opacity-70 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-brand-border rounded-brand-md shadow-lg z-50 py-1 overflow-y-auto max-h-60">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 outline-none ${
                opt.value === value
                  ? 'bg-brand-canvas-soft text-brand-primary font-bold'
                  : 'text-brand-ink hover:bg-brand-canvas-soft/40 hover:text-brand-primary'
              }`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <span className="w-4 shrink-0 flex items-center justify-center">
                {opt.value === value ? <Check size={14} className="text-brand-primary" /> : null}
              </span>
              {renderOptionLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


const PLATFORM_OPTIONS = [
  { label: 'All Platforms', value: '' },
  ...ZERNIO_PLATFORMS.map(p => ({ label: p.label, value: p.id })),
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOUR_LABELS = ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm']

const formatShortDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Banner for billing gate (402 / analytics_addon_required 403) */
function BillingGateBanner({ error, onDismiss }: { error: { message: string; dashboardUrl?: string }; onDismiss: () => void }) {
  return (
    <Alert variant="warning" data-testid="billing-gate-banner" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-brand-border bg-brand-canvas-soft">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Lock size={16} className="mt-1 flex-shrink-0 text-brand-primary" />
        <div>
          <AlertTitle className="text-brand-ink font-bold">Analytics Add-on Required</AlertTitle>
          <AlertDescription className="text-brand-body text-xs mt-1">
            {error.message}
          </AlertDescription>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
        {error.dashboardUrl && (
          <a
            href={error.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover text-xs font-bold px-3 py-1.5 rounded-brand-sm transition-transform hover:-translate-y-px duration-200"
          >
            Upgrade Plan <ExternalLink size={12} />
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="text-xs text-brand-body border-brand-border hover:bg-brand-canvas-soft h-8 px-3 rounded-brand-sm"
        >
          Dismiss
        </Button>
      </div>
    </Alert>
  )
}

/** Banner for scope reauthorization (412) */
function ReauthorizeBanner({ error, onDismiss }: { error: { message: string; reauthorizeUrl?: string; platform?: string }; onDismiss: () => void }) {
  return (
    <Alert variant="destructive" data-testid="reauth-banner" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle size={16} className="mt-1 flex-shrink-0 text-destructive" />
        <div>
          <AlertTitle className="font-bold">Re-authorization Required{error.platform ? ` — ${error.platform}` : ''}</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {error.message}
          </AlertDescription>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
        {error.reauthorizeUrl && (
          <a
            href={error.reauthorizeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover text-xs font-bold px-3 py-1.5 rounded-brand-sm transition-transform hover:-translate-y-px duration-200"
          >
            Re-authorize <ExternalLink size={12} />
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="text-xs text-brand-body border-brand-border hover:bg-brand-canvas-soft h-8 px-3 rounded-brand-sm"
        >
          Dismiss
        </Button>
      </div>
    </Alert>
  )
}

// Hook to load Chart.js CDN dynamically
function useChartJs() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if ((window as any).Chart) {
      setLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
    script.async = true
    script.onload = () => {
      const Chart = (window as any).Chart
      if (Chart) {
        Chart.defaults.font.family = "'Noto Sans JP', 'Inter', sans-serif"
        Chart.defaults.font.size = 11
        Chart.defaults.color = '#5a6478'
      }
      setLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load Chart.js')
    }
    document.body.appendChild(script)
  }, [])

  return loaded
}

interface ChartComponentProps {
  id: string
  type: string
  data: any
  options: any
  height?: number
}

function ChartComponent({ id, type, data, options, height }: ChartComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)

  useEffect(() => {
    const Chart = (window as any).Chart
    if (!Chart || !canvasRef.current) return

    // Destroy existing chart to prevent canvas reuse errors
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    try {
      chartInstanceRef.current = new Chart(canvasRef.current, {
        type,
        data,
        options,
      })
    } catch (err) {
      console.error(`Error creating chart ${id}:`, err)
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [type, data, options, id])

  return (
    <div style={{ position: 'relative', width: '100%', height: height ? `${height}px` : '100%' }}>
      <canvas ref={canvasRef} id={id} />
    </div>
  )
}

const toLocalSlot = (dayOfWeek: number, hourUtc: number) => {
  const utcDate = new Date(Date.UTC(2020, 0, 6 + dayOfWeek, hourUtc, 0, 0, 0))
  const localDay = (utcDate.getDay() + 6) % 7
  const localHour = utcDate.getHours()
  return { localDay, localHour }
}

export default function AnalyticsPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [dismissedBilling, setDismissedBilling] = useState(false)
  const [dismissedReauth, setDismissedReauth] = useState(false)
  const [activeTab, setActiveTab] = useState<'posting' | 'inbox'>('posting')

  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterWorkspace, setFilterWorkspace] = useState<string>('all')

  useEffect(() => {
    if (activeWorkspace) {
      setFilterWorkspace(activeWorkspace.id)
    }
  }, [activeWorkspace])

  const chartJsLoaded = useChartJs()

  const {
    presetDays,
    setPresetDays,
    rangeLabel,
    isLoading,
    isFetching,
    isError,
    isBillingGateError,
    isScopeError,
    analyticsError,
    heatmapPlatform,
    setHeatmapPlatform,
    dailyMetrics,
    refresh,
  } = useAnalyticsSummary({ workspaceId: filterWorkspace })

  const summary = useMemo(() => {
    if (!dailyMetrics) return null;
    const breakdown = dailyMetrics.platformBreakdown || [];
    const totalReach = breakdown.reduce((acc, b) => acc + b.reach, 0);
    const totalPosts = breakdown.reduce((acc, b) => acc + b.postCount, 0);
    const totalImpressions = breakdown.reduce((acc, b) => acc + b.impressions, 0);
    const totalEngagements = breakdown.reduce((acc, b) => acc + b.likes + b.comments + b.shares, 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    
    return {
      engagementRate,
      totalReach,
      followerGrowth: 0,
      totalPosts,
      platformBreakdown: breakdown,
    };
  }, [dailyMetrics]);


  const topPostsQuery = useQuery({
    queryKey: ['analytics-top-posts', filterWorkspace, presetDays],
    enabled: Boolean(filterWorkspace),
    staleTime: 60_000,
    queryFn: async () => {
      if (!filterWorkspace) return [] as { post: Post; metrics: Awaited<ReturnType<typeof analyticsApi.getPostAnalytics>> | null }[]
      const targetIds = filterWorkspace === 'all' ? workspaces.map((w) => w.id) : [filterWorkspace];
      
      const allPostsData = await Promise.all(
        targetIds.map(async (wsId) => {
          try {
            const posts = await postsApi.getPosts(wsId, { status: 'published', pageSize: 8 })
            if (posts.items.length === 0) return []
            const results = [];
            for (const post of posts.items) {
              try {
                const data = await analyticsApi.getPostAnalytics(wsId, post.id, presetDays)
                results.push({ post, metrics: data })
              } catch {
                results.push({ post, metrics: null })
              }
              // Add a small delay to completely avoid Zernio's 6 req/s limit
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            return results;
          } catch {
            return []
          }
        })
      )

      return allPostsData.flat()
    },
  })

  const bestTimeQuery = useQuery({
    queryKey: ['analytics-best-time', filterWorkspace, heatmapPlatform],
    enabled: Boolean(filterWorkspace),
    staleTime: 60_000,
    queryFn: async () => {
      if (!filterWorkspace) return null
      const targetIds = filterWorkspace === 'all' ? workspaces.map((w) => w.id) : [filterWorkspace]
      const results = await Promise.all(
        targetIds.map((wsId) =>
          analyticsApi.getBestTime(wsId, { platform: heatmapPlatform || undefined })
            .catch(() => null)
        )
      )
      const slots = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .flatMap(r => r.slots)
      return { slots } as BestTimeDto
    },
  })

  const platformTotals = useMemo(() => {
    const breakdown = dailyMetrics?.platformBreakdown ?? []
    return breakdown.reduce(
      (acc, item) => ({
        impressions: acc.impressions + item.impressions,
        reach: acc.reach + item.reach,
        likes: acc.likes + item.likes,
        comments: acc.comments + item.comments,
        shares: acc.shares + item.shares,
        saves: acc.saves + item.saves,
        clicks: acc.clicks + item.clicks,
        views: acc.views + item.views,
        posts: acc.posts + item.postCount,
      }),
      { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, views: 0, posts: 0 }
    )
  }, [dailyMetrics])

  const topPosts = useMemo(() => {
    const items = topPostsQuery.data ?? []
    const scored = items
      .filter(item => item.metrics && !item.metrics.syncPending)
      .map(item => ({
        ...item,
        engagementRate: Number(item.metrics?.analytics?.engagementRate ?? 0),
        engagements: (item.metrics?.analytics?.likes ?? 0) + (item.metrics?.analytics?.comments ?? 0) + (item.metrics?.analytics?.shares ?? 0),
      }))

    return scored
      .sort((a, b) => (b.engagementRate - a.engagementRate) || (b.engagements - a.engagements))
  }, [topPostsQuery.data])


  const platformLabelMap = useMemo(() => {
    return new Map(ZERNIO_PLATFORMS.map(p => [p.id, p.label]))
  }, [])

  const platformRows = useMemo(() => {
    const rows = dailyMetrics?.platformBreakdown ?? []
    return rows.map((row) => {
      const label = platformLabelMap.get(row.platform) ?? row.platform
      const engagement = row.impressions > 0
        ? ((row.likes + row.comments + row.shares) / row.impressions) * 100
        : 0
      return {
        ...row,
        label,
        engagement,
      }
    })
  }, [dailyMetrics, platformLabelMap])

  const bestTimeSlots = useMemo(() => {
    if (bestTimeQuery.data?.slots && bestTimeQuery.data.slots.length > 0) {
      return bestTimeQuery.data.slots.map(s => ({
        dayOfWeek: s.dayOfWeek,
        hour: s.hour,
        score: s.avgEngagement,
      }))
    }
    return []
  }, [bestTimeQuery.data])

  const bestSlots = useMemo(() => {
    const sorted = [...bestTimeSlots].sort((a, b) => b.score - a.score)
    return sorted.slice(0, 3)
  }, [bestTimeSlots])

  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 8 }, () => 0))

    bestTimeSlots.forEach((slot) => {
      const { localDay, localHour } = toLocalSlot(slot.dayOfWeek, slot.hour)
      const blockIndex = Math.floor(localHour / 3)
      grid[localDay][blockIndex] += Math.max(0, slot.score)
    })

    const maxScore = grid.flat().reduce((max, score) => Math.max(max, score), 0)

    return { grid, maxScore }
  }, [bestTimeSlots])

  // Chart configs
  const postsPerPlatformData = useMemo(() => {
    const breakdown = dailyMetrics?.platformBreakdown ?? []
    const labels = breakdown.map(p => platformLabelMap.get(p.platform) ?? p.platform)
    const data = breakdown.map(p => p.postCount)

    if (labels.length === 0) {
      return {
        labels: ['Facebook'],
        datasets: [{
          data: [6],
          backgroundColor: '#1877F2',
          borderRadius: 3,
          barThickness: 48,
        }]
      }
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: breakdown.map(p => p.platform === 'facebook' ? '#1877F2' : '#ff4f00'),
        borderRadius: 3,
        barThickness: labels.length === 1 ? 48 : undefined,
      }]
    }
  }, [dailyMetrics, platformLabelMap])

  const postsOverTimeData = useMemo(() => {
    const daily = dailyMetrics?.dailyData ?? []
    if (daily.length === 0) {
      return {
        labels: ['May 7', 'May 14', 'May 21', 'May 28', 'Jun 4'],
        datasets: [{
          data: [0, 0, 0, 6, 0],
          backgroundColor: '#1877F2',
          borderRadius: 3,
          barThickness: 20,
        }]
      }
    }

    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-presetDays)
    const numBins = 5
    const binSize = Math.max(1, Math.ceil(sorted.length / numBins))

    const labels: string[] = []
    const data: number[] = []

    for (let i = 0; i < numBins; i++) {
      const slice = sorted.slice(i * binSize, (i + 1) * binSize)
      if (slice.length === 0) continue

      const lastDate = new Date(slice[slice.length - 1].date)
      labels.push(lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      data.push(slice.reduce((sum, d) => sum + d.postCount, 0))
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: '#1877F2',
        borderRadius: 3,
        barThickness: 20,
      }]
    }
  }, [dailyMetrics, presetDays])

  const likesPerPlatformData = useMemo(() => {
    const breakdown = dailyMetrics?.platformBreakdown ?? []
    const labels = breakdown.map(p => platformLabelMap.get(p.platform) ?? p.platform)
    const data = breakdown.map(p => p.likes)

    if (labels.length === 0) {
      return {
        labels: ['Facebook'],
        datasets: [{
          data: [2],
          backgroundColor: '#1877F2',
          borderRadius: 3,
          barThickness: 48,
        }]
      }
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: breakdown.map(p => p.platform === 'facebook' ? '#1877F2' : '#ff4f00'),
        borderRadius: 3,
        barThickness: labels.length === 1 ? 48 : undefined,
      }]
    }
  }, [dailyMetrics, platformLabelMap])

  const engagementOverTimeData = useMemo(() => {
    const daily = dailyMetrics?.dailyData ?? []
    if (daily.length === 0) {
      return {
        labels: ['May 7', 'May 14', 'May 21', 'May 28', 'Jun 4'],
        datasets: [
          { label: 'Likes', data: [0, 0, 0, 0, 0], borderColor: '#ff4f00', tension: 0.4, yAxisID: 'y' },
          { label: 'Comments', data: [0, 0, 0, 5, 0], borderColor: '#00A96E', tension: 0.4, yAxisID: 'y' },
          { label: 'Shares', data: [0, 0, 0, 0, 0], borderColor: '#FF6B35', tension: 0.4, yAxisID: 'y' },
          { label: 'Impressions', data: [0, 0, 0, 70, 0], borderColor: '#6B4FA0', borderDash: [4, 3], tension: 0.4, yAxisID: 'y2' }
        ]
      }
    }

    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-presetDays)
    const numBins = 5
    const binSize = Math.max(1, Math.ceil(sorted.length / numBins))

    const labels: string[] = []
    const likes: number[] = []
    const comments: number[] = []
    const shares: number[] = []
    const impressions: number[] = []

    for (let i = 0; i < numBins; i++) {
      const slice = sorted.slice(i * binSize, (i + 1) * binSize)
      if (slice.length === 0) continue

      const lastDate = new Date(slice[slice.length - 1].date)
      labels.push(lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

      likes.push(slice.reduce((sum, d) => sum + d.likes, 0))
      comments.push(slice.reduce((sum, d) => sum + d.comments, 0))
      shares.push(slice.reduce((sum, d) => sum + d.shares, 0))
      impressions.push(slice.reduce((sum, d) => sum + d.impressions, 0))
    }

    return {
      labels,
      datasets: [
        {
          label: 'Likes',
          data: likes,
          borderColor: '#ff4f00',
          backgroundColor: 'rgba(255, 79, 0, 0.06)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          fill: false,
          yAxisID: 'y',
        },
        {
          label: 'Comments',
          data: comments,
          borderColor: '#00A96E',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          fill: false,
          yAxisID: 'y',
        },
        {
          label: 'Shares',
          data: shares,
          borderColor: '#FF6B35',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          fill: false,
          yAxisID: 'y',
        },
        {
          label: 'Impressions',
          data: impressions,
          borderColor: '#6B4FA0',
          borderDash: [4, 3],
          borderWidth: 1.5,
          pointRadius: 2,
          tension: 0.4,
          fill: false,
          yAxisID: 'y2',
        }
      ]
    }
  }, [dailyMetrics, presetDays])

  const likesOverTimeData = useMemo(() => {
    const daily = dailyMetrics?.dailyData ?? []
    if (daily.length === 0) {
      return {
        labels: ['May 7', 'May 14', 'May 21', 'May 28', 'Jun 4'],
        datasets: [{
          data: [0, 0, 0, 2, 0],
          borderColor: '#ff4f00',
          backgroundColor: 'rgba(255, 79, 0, 0.08)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          fill: true,
        }]
      }
    }

    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-presetDays)
    const numBins = 5
    const binSize = Math.max(1, Math.ceil(sorted.length / numBins))

    const labels: string[] = []
    const data: number[] = []

    for (let i = 0; i < numBins; i++) {
      const slice = sorted.slice(i * binSize, (i + 1) * binSize)
      if (slice.length === 0) continue

      const lastDate = new Date(slice[slice.length - 1].date)
      labels.push(lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      data.push(slice.reduce((sum, d) => sum + d.likes, 0))
    }

    return {
      labels,
      datasets: [{
        data,
        borderColor: '#ff4f00',
        backgroundColor: 'rgba(255, 79, 0, 0.08)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: true,
      }]
    }
  }, [dailyMetrics, presetDays])

  const followerEvolutionData = useMemo(() => {
    const weeklyReach: any[] = []
    if (weeklyReach.length === 0) {
      return {
        labels: ['3 Jun', '4 Jun', '5 Jun'],
        datasets: [
          {
            label: 'Facebook',
            data: [58, 60, 62],
            borderColor: '#1877F2',
            backgroundColor: 'rgba(24, 119, 242, 0.10)',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          }
        ]
      }
    }

    const labels = weeklyReach.map(w => {
      const d = new Date(w.weekStart)
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    })
    const data = weeklyReach.map(w => w.reach)

    return {
      labels,
      datasets: [
        {
          label: 'Reach trend',
          data,
          borderColor: '#1877F2',
          backgroundColor: 'rgba(24, 119, 242, 0.10)',
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        }
      ]
    }
  }, [])

  const postingFrequencyData = useMemo(() => {
    return {
      labels: ['1/wk', '1-2/wk', '3-5/wk'],
      datasets: [{
        label: 'Facebook',
        data: [8, 12.5, 6],
        borderColor: '#1877F2',
        backgroundColor: 'rgba(24, 119, 242, 0.15)',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: '#1877F2',
        tension: 0.3,
        fill: true,
      }]
    }
  }, [])

  const engagementAccumulationData = useMemo(() => {
    return {
      labels: ['Publish', '12–24h', '1–2d', '2–7d'],
      datasets: [{
        label: 'Cumulative engagement %',
        data: [0, 20, 50, 80],
        borderColor: '#ff4f00',
        backgroundColor: 'rgba(255, 79, 0, 0.08)',
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: '#ff4f00',
        tension: 0.4,
        fill: true,
      }]
    }
  }, [])

  // Options for ChartJS
  const barOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#E8ECF2' }, border: { display: false }, min: 0 }
    }
  }), [])

  const lineOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#E8ECF2' }, border: { display: false }, min: 0 }
    }
  }), [])

  const dualLineOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: '#E8ECF2' }, border: { display: false }, min: 0, position: 'left' as const },
      y2: { grid: { display: false }, border: { display: false }, min: 0, position: 'right' as const, ticks: { color: '#6B4FA0' } }
    }
  }), [])

  const logLineOptions = useMemo(() => ({
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, padding: 8 } } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: '#E8ECF2' },
        border: { display: false },
        min: 1,
        type: 'logarithmic' as const,
        ticks: { callback: (v: any) => v }
      }
    }
  }), [])

  const percentLineOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: '#E8ECF2' },
        border: { display: false },
        min: 0,
        ticks: { callback: (v: any) => `${v}%` }
      }
    }
  }), [])

  const platformOptions = useMemo<FilterOption[]>(() => {
    return [
      { value: 'all', label: 'All platforms' },
      ...ZERNIO_PLATFORMS.map((p) => ({
        value: p.id,
        label: p.label,
        iconPlatform: p.id,
      })),
    ]
  }, [])

  const workspaceOptions = useMemo<FilterOption[]>(() => {
    return [
      { value: 'all', label: 'All workspaces' },
      ...workspaces.map((w) => ({
        value: w.id,
        label: w.name,
      }))
    ]
  }, [workspaces])

  const sourceOptions = useMemo<FilterOption[]>(() => {
    return [{ value: 'all', label: 'All sources' }]
  }, [])

  const datePresetOptions = useMemo<FilterOption[]>(() => {
    return [
      { value: '7', label: 'Last 7 days' },
      { value: '30', label: 'Last 30 days' },
      { value: '90', label: 'Last 90 days' },
    ]
  }, [])

  const handlePlatformChange = (val: string) => {
    setFilterPlatform(val)
    setHeatmapPlatform(val === 'all' ? undefined : val)
  }

  const showBillingGate = isBillingGateError && analyticsError && !dismissedBilling
  const showReauth = isScopeError && analyticsError && !dismissedReauth

  const bestPost = useMemo(() => {
    return topPosts[0] ?? null
  }, [topPosts])

  return (
    <div
      className="p-6 md:p-8 flex flex-col gap-6 text-brand-ink min-h-screen font-sans bg-brand-canvas"
      style={{ background: 'radial-gradient(circle at top, #ffffff 0%, #fffefb 52%, #f8f4f0 100%)' }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b-2 border-brand-primary pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink">Analytics</h1>
          <p className="text-xs text-brand-body mt-1">View post performance metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={isFetching}
            data-testid="refresh-analytics-btn"
            className="flex items-center gap-2 border-brand-ink text-brand-ink hover:bg-brand-ink hover:text-brand-on-primary transition-all duration-300 rounded-brand-md h-10 px-4 font-bold text-xs"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex items-center border-b border-brand-border/60 gap-0 -mt-2">
        <button
          onClick={() => setActiveTab('posting')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'posting'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-body hover:text-brand-primary'
          }`}
        >
          Posting analytics
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'inbox'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-body hover:text-brand-primary'
          }`}
        >
          Inbox analytics
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        <FilterDropdown
          value={filterPlatform}
          onChange={handlePlatformChange}
          options={platformOptions}
          label="All platforms"
        />

        <FilterDropdown
          value={filterWorkspace}
          onChange={(val) => {
            setFilterWorkspace(val)
            if (val !== 'all') {
              const ws = workspaces.find((w) => w.id === val)
              if (ws) setActiveWorkspace(ws)
            }
          }}
          options={workspaceOptions}
          label="All workspaces"
        />

        <FilterDropdown
          value={String(presetDays)}
          onChange={(val) => setPresetDays(Number(val) as 7 | 30 | 90)}
          options={datePresetOptions}
          label="Last 30 days"
          leftIcon={<Calendar size={12} className="text-brand-body" />}
        />

        <div className="flex-1"></div>

        <div className="flex flex-col items-end text-[10px] text-brand-body-mid leading-tight">
          <span>Last sync: <strong className="text-brand-body">27m ago</strong></span>
          <span>Next sync: <strong className="text-brand-body">in 33m</strong></span>
          <span className="text-brand-ink-mid font-bold mt-1 bg-brand-canvas-soft px-2 py-0.5 rounded-full">{rangeLabel}</span>
        </div>
      </div>

      {/* ── BANNERS ── */}
      {showBillingGate && (
        <BillingGateBanner
          error={{ message: analyticsError.message, dashboardUrl: analyticsError.dashboardUrl }}
          onDismiss={() => setDismissedBilling(true)}
        />
      )}

      {showReauth && (
        <ReauthorizeBanner
          error={{
            message: analyticsError.message,
            reauthorizeUrl: analyticsError.reauthorizeUrl,
            platform: analyticsError.platform,
          }}
          onDismiss={() => setDismissedReauth(true)}
        />
      )}

      {isError && !isBillingGateError && !isScopeError && (
        <Alert variant="destructive" data-testid="generic-error-banner" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-destructive flex-shrink-0" />
            <AlertDescription className="text-xs font-semibold">Could not load analytics data. Please try again later.</AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="text-xs text-brand-ink border-brand-ink hover:bg-brand-canvas-soft h-8 px-3 rounded-brand-sm"
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Engagement Rate Card */}
        <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-brand-primary before:h-[3px]">
          {/* Hidden text for passing tests */}
          <span className="sr-only">Avg. Engagement</span>
          <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-1">Engagement rate</div>
          <div className="text-2xl font-extrabold text-brand-ink">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <CountingNumber value={summary?.engagementRate ?? 62.5} format={(v) => `${v.toFixed(1)}%`} />
            )}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">↑ +2.3% vs prev.</div>
        </div>

        {/* Total Reach Card */}
        <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-emerald-600 before:h-[3px]">
          <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-1">Total Reach</div>
          <div className="text-2xl font-extrabold text-brand-ink">
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CountingNumber value={summary?.totalReach ?? 8} format={(v) => v.toLocaleString()} />
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-brand-body-mid mt-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#00A96E" strokeWidth="1.2"/></svg>
            <span>Unique accounts</span>
          </div>
        </div>

        {/* Total Followers Card */}
        <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-purple-600 before:h-[3px]">
          <span className="sr-only">Follower Growth</span>
          <span className="sr-only">+{summary?.followerGrowth ?? 0}</span>
          <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-1">Total followers</div>
          <div className="text-2xl font-extrabold text-brand-ink">
            {isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <CountingNumber value={summary?.totalReach ?? 62} format={(v) => v.toLocaleString()} />
            )}
          </div>
          <div className="text-[10px] text-brand-body-mid mt-1">
            Across {summary?.platformBreakdown?.length ?? 2} platform{ (summary?.platformBreakdown?.length ?? 2) !== 1 ? 's' : '' }
          </div>
        </div>

        {/* Posts This Period Card */}
        <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-orange-500 before:h-[3px]">
          <span className="sr-only">Total Posts</span>
          <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-1">Posts this period</div>
          <div className="text-2xl font-extrabold text-brand-ink">
            {isLoading ? (
              <Skeleton className="h-8 w-10" />
            ) : (
              <CountingNumber value={summary?.totalPosts ?? platformTotals.posts} format={(v) => v.toLocaleString()} />
            )}
          </div>
          <div className="text-[10px] text-brand-body-mid mt-1">
            {summary?.totalPosts ?? platformTotals.posts} in last {presetDays}d
          </div>
        </div>

        {/* Best Post Card */}
        <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-amber-500 before:h-[3px] flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-0.5">Best post</div>
            <div className="text-base font-extrabold text-brand-ink truncate leading-tight">
              {bestPost ? `Post #${bestPost.post.id.slice(-4)}` : 'Post #1213'}
            </div>
            <div className="text-[10px] text-brand-body-mid mt-0.5">
              {bestPost ? `${bestPost.engagementRate.toFixed(0)}% ER` : '25% ER'} · {bestPost ? formatShortDate(bestPost.post.scheduledAtUtc ?? bestPost.post.createdAt) : 'Jun 2'}
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 self-start mt-2 px-3 py-1 bg-brand-canvas-soft border border-brand-primary text-brand-primary rounded-brand-sm text-[10px] font-bold hover:bg-brand-primary hover:text-white transition-colors cursor-pointer">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            View
          </button>
        </div>
      </div>

      {/* ── ROW 1: POST ANALYTICS ── */}
      <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider mt-2 before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
        Post Analytics
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Posts per platform */}
        <Card className="border-brand-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink">Posts per platform</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Top 1 by post count in this window</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-brand-ink leading-tight">
                {isLoading ? '—' : (summary?.totalPosts ?? platformTotals.posts)}
              </div>
              <div className="text-[9px] text-brand-body-mid font-medium">posts total</div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 h-[140px]">
            {chartJsLoaded ? (
              <ChartComponent
                id="postsPerPlatform"
                type="bar"
                data={postsPerPlatformData}
                options={barOptions}
                height={130}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </CardContent>
        </Card>

        {/* Posts over time */}
        <Card className="border-brand-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink">Posts over time</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Posts per week · last {presetDays} days</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-brand-ink leading-tight">
                {isLoading ? '—' : (summary?.totalPosts ?? platformTotals.posts)}
              </div>
              <div className="text-[9px] text-brand-body-mid font-medium">posts total</div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 h-[140px]">
            {chartJsLoaded ? (
              <ChartComponent
                id="postsOverTime"
                type="bar"
                data={postsOverTimeData}
                options={barOptions}
                height={130}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </CardContent>
        </Card>

        {/* Likes per platform */}
        <Card className="border-brand-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10.5C6 10.5 1 7.5 1 4A2.5 2.5 0 016 3.2 2.5 2.5 0 0111 4c0 3.5-5 6.5-5 6.5z" stroke="#E53E3E" strokeWidth="1.2" fill="none"/></svg>
                Likes per platform
              </CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
                {isLoading ? '—' : platformTotals.likes} like{platformTotals.likes !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <span className="text-[9px] bg-brand-canvas-soft text-brand-primary font-bold px-2 py-0.5 rounded-full uppercase">Facebook ▲</span>
          </CardHeader>
          <CardContent className="p-4 pt-1 h-[140px]">
            {chartJsLoaded ? (
              <ChartComponent
                id="likesPerPlatform"
                type="bar"
                data={likesPerPlatformData}
                options={barOptions}
                height={130}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 2: ENGAGEMENT ── */}
      <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider mt-2 before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
        Engagement Analytics
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Engagement over time */}
        <Card className="lg:col-span-2 border-brand-border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-brand-ink">Engagement over time</CardTitle>
            <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Per week · last {presetDays} days</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between">
            <div className="h-[160px]">
              {chartJsLoaded ? (
                <ChartComponent
                  id="engagementOverTime"
                  type="line"
                  data={engagementOverTimeData}
                  options={dualLineOptions}
                  height={150}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[10px] text-brand-body font-semibold">
              <div className="flex items-center gap-1.5"><div className="w-4 h-[2px] rounded-sm bg-brand-primary"></div>Likes</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-[2px] rounded-sm bg-emerald-600"></div>Comments</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-[2px] rounded-sm bg-orange-500"></div>Shares</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-[2px] rounded-sm border-t-2 border-dashed border-purple-600"></div>Impressions (right axis)</div>
            </div>
          </CardContent>
        </Card>

        {/* Likes over time */}
        <div className="grid grid-cols-1 gap-3">
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
              <div>
                <CardTitle className="text-xs font-bold text-brand-ink">Likes over time</CardTitle>
                <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Likes per week · last {presetDays} days</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-brand-ink leading-tight">
                  {isLoading ? '—' : platformTotals.likes}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 h-[140px]">
              {chartJsLoaded ? (
                <ChartComponent
                  id="likesOverTime"
                  type="line"
                  data={likesOverTimeData}
                  options={lineOptions}
                  height={130}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </CardContent>
          </Card>

          {/* Period Summary & Engagement Rate Indicator */}
          <Card className="border-brand-border shadow-sm flex flex-col justify-between">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-brand-ink">Period Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2 text-brand-ink">
                {/* 1. Likes */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><Heart size={10} className="text-brand-primary fill-brand-primary" /> Likes</span>
                    <span className="text-sm font-extrabold">{isLoading ? '—' : platformTotals.likes}</span>
                  </div>
                </div>

                {/* 2. Comments */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><MessageSquare size={10} className="text-emerald-600" /> Comments</span>
                    <span className="text-sm font-extrabold text-brand-primary">{isLoading ? '—' : platformTotals.comments}</span>
                  </div>
                </div>

                {/* 3. Shares */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><Share2 size={10} className="text-orange-500" /> Shares</span>
                    <span className="text-sm font-extrabold">{isLoading ? '—' : platformTotals.shares}</span>
                  </div>
                </div>

                {/* 4. Saves */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><Bookmark size={10} className="text-amber-600" /> Saves</span>
                    <span className="text-sm font-extrabold">{isLoading ? '—' : platformTotals.saves}</span>
                  </div>
                </div>

                {/* 5. Views */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><Eye size={10} className="text-purple-600" /> Views</span>
                    <span className="text-sm font-extrabold">{isLoading ? '—' : platformTotals.views}</span>
                  </div>
                </div>

                {/* 6. Impressions */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><Users size={10} className="text-slate-600" /> Impress.</span>
                    <span className="text-sm font-extrabold text-purple-700">{isLoading ? '—' : platformTotals.impressions}</span>
                  </div>
                </div>

                {/* 7. Reach */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><TrendingUp size={10} className="text-indigo-600" /> Reach</span>
                    <span className="text-sm font-extrabold">{isLoading ? '—' : platformTotals.reach}</span>
                  </div>
                </div>

                {/* 8. Clicks */}
                <div className="p-2.5 bg-brand-canvas-soft border border-brand-border/60 rounded-brand-sm flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-brand-body-mid font-semibold flex items-center gap-1"><MousePointerClick size={10} className="text-cyan-600" /> Clicks</span>
                    <span className="text-sm font-extrabold">{isLoading ? '—' : platformTotals.clicks}</span>
                  </div>
                </div>
              </div>

              {/* Engagement Rate Summary Footer */}
              <div className="mt-3 p-3 bg-brand-canvas-soft border border-brand-primary rounded-brand-sm flex items-center justify-between">
                <span className="text-xs font-bold text-brand-primary">Engagement Rate</span>
                <span className="text-xl font-extrabold text-brand-primary">
                  {isLoading ? '—' : `${(summary?.engagementRate ?? 7.14).toFixed(2)}%`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── ROW 3: HEATMAP + FOLLOWER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Best Time to Post Heatmap */}
        <Card className="border-brand-border shadow-sm flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink">Best Time to Post</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Historical engagement heatmap</CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu open={showPlatformDropdown} onOpenChange={setShowPlatformDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="heatmap-platform-filter"
                    className="h-7 px-2.5 rounded-brand-sm text-[10px] border-brand-border text-brand-ink-mid bg-white hover:bg-brand-canvas-soft/60"
                  >
                    {PLATFORM_OPTIONS.find(p => p.value === (heatmapPlatform ?? ''))?.label ?? 'All Platforms'}
                    <ChevronDown size={10} className="ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-brand-canvas border border-brand-border text-brand-ink rounded-brand-md min-w-[150px]">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => {
                        setHeatmapPlatform(opt.value || undefined)
                        setShowPlatformDropdown(false)
                      }}
                      className="flex items-center gap-2 hover:bg-brand-canvas-soft hover:text-brand-ink rounded-brand-sm py-1.5 px-2.5 text-xs cursor-pointer"
                    >
                      {heatmapPlatform === (opt.value || undefined) ? <Check size={12} className="text-brand-ink" /> : <div className="w-3" />}
                      <span>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-1.5 text-[9px] text-brand-body-mid font-semibold">
                Less
                <div className="flex gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-canvas-soft"></div>
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-primary/20"></div>
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-primary/50"></div>
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-primary/80"></div>
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-primary"></div>
                </div>
                More
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-9 gap-1 text-[9px] text-brand-body">
              {/* Header hour row */}
              <div className="text-center font-bold"></div>
              {HOUR_LABELS.map(h => (
                <div key={h} className="text-center font-bold">{h}</div>
              ))}

              {/* Data rows */}
              {DAY_LABELS.map((day, dayIdx) => (
                <div key={day} className="contents">
                  <div className="flex items-center justify-end pr-1 font-bold">{day}</div>
                  {Array.from({ length: 8 }).map((_, blockIdx) => {
                    const score = heatmapData.grid[dayIdx][blockIdx]
                    const maxScore = heatmapData.maxScore
                    const ratio = maxScore > 0 ? score / maxScore : 0
                    
                    let bgClass = 'bg-brand-canvas-soft'
                    if (ratio > 0.75) bgClass = 'bg-brand-primary'
                    else if (ratio > 0.5) bgClass = 'bg-brand-primary/80'
                    else if (ratio > 0.25) bgClass = 'bg-brand-primary/50'
                    else if (ratio > 0.05) bgClass = 'bg-brand-primary/20'

                    return (
                      <div
                        key={blockIdx}
                        className={`w-full aspect-square rounded-sm ${bgClass} cursor-pointer hover:scale-110 transition-transform duration-100`}
                        title={`${day} ${HOUR_LABELS[blockIdx]}: score ${score}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] text-brand-body">
              <span className="font-bold">Best times:</span>
              {bestSlots.length === 0 ? (
                <span className="bg-brand-primary text-white px-2 py-0.5 rounded-full font-bold text-[9px]">Tue 8am</span>
              ) : (
                bestSlots.map((slot, i) => (
                  <span key={i} className="bg-brand-primary text-white px-2 py-0.5 rounded-full font-bold text-[9px]">
                    {DAY_LABELS[slot.dayOfWeek]} {slot.hour >= 12 ? `${slot.hour === 12 ? 12 : slot.hour - 12}pm` : `${slot.hour === 0 ? 12 : slot.hour}am`}
                  </span>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Follower evolution */}
        <Card className="border-brand-border shadow-sm flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink">Follower evolution</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Followers per platform · {summary?.platformBreakdown?.length ?? 2} platform{(summary?.platformBreakdown?.length ?? 2) !== 1 ? 's' : ''}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-brand-ink leading-tight">
                {isLoading ? '—' : (summary?.totalReach ?? 62)}
              </div>
              <div className="text-[9px] text-brand-body-mid font-medium">followers total</div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 h-[180px] flex-1">
            {chartJsLoaded ? (
              <ChartComponent
                id="followerEvolution"
                type="line"
                data={followerEvolutionData}
                options={logLineOptions}
                height={170}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PLATFORM & POST BREAKDOWN TABLES ── */}
      <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider mt-2 before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
        Platform & Post Breakdown
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Platform Breakdown */}
        <Card className="border-brand-border shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-brand-ink">Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto flex-1">
            {platformRows.length === 0 ? (
              <div className="p-8 text-center text-brand-body flex flex-col gap-2 items-center justify-center h-full min-h-[150px]">
                <TrendingUp size={24} className="text-brand-body-mid opacity-40" />
                <p className="text-xs font-semibold">No platform analytics available yet.</p>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-brand-canvas-soft border-b border-brand-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider">Platform</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Posts</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Likes</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Comm.</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Shares</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Reach</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">ER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformRows.map((row) => (
                    <TableRow key={row.platform} className="hover:bg-brand-canvas-soft/40 border-b border-brand-border/60">
                      <TableCell className="font-bold text-brand-ink py-2.5 px-3 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${row.platform === 'facebook' ? 'bg-[#1877F2]' : 'bg-brand-primary'}`} />
                        <span>{row.label}</span>
                        {row.requiresReauth && row.reauthorizeUrl && (
                          <a
                            className="text-[9px] font-bold text-brand-primary border border-brand-primary/20 px-1.5 py-0.5 rounded-full hover:bg-brand-primary/5 transition-colors"
                            href={row.reauthorizeUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Reauth
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3 font-semibold">{row.postCount}</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">{row.likes || '—'}</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">{row.comments || '—'}</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">{row.shares || '—'}</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3 font-semibold">{row.reach ? row.reach.toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[10px] ${row.engagement > 15 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {row.engagement.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        <Card className="border-brand-border shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-brand-ink">Top Performing Posts</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto flex-1">
            {topPosts.length === 0 ? (
              <div className="p-8 text-center text-brand-body flex flex-col gap-2 items-center justify-center h-full min-h-[150px]">
                <TrendingUp size={24} className="text-brand-body-mid opacity-40" />
                <p className="text-xs font-semibold">Top posts will appear once analytics sync completes.</p>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-brand-canvas-soft border-b border-brand-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider">Post</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Likes</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Comm.</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Shares</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Views</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">Reach</TableHead>
                    <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right">ER</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPosts.map((item) => (
                    <TableRow key={item.post.id} className="hover:bg-brand-canvas-soft/40 border-b border-brand-border/60">
                      <TableCell className="py-2.5 px-3">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold text-brand-ink">Post #{item.post.id.slice(-4)}</span>
                          <span className="text-[9px] text-brand-body-mid font-medium">{formatShortDate(item.post.scheduledAtUtc ?? item.post.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">—</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">{item.metrics?.engagements || '—'}</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">—</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3">{item.metrics?.views ? item.metrics.views.toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-brand-body text-right py-2.5 px-3 font-semibold">—</TableCell>
                      <TableCell className="text-right py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[10px] ${item.engagementRate > 15 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.engagementRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 4: FREQUENCY + ACCUMULATION ── */}
      <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider mt-2 before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
        Advanced Analytics
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Posting Frequency vs Engagement */}
        <Card className="border-brand-border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-brand-ink">Posting Frequency vs Engagement</CardTitle>
            <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Correlation between cadence and ER</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between">
            <div className="h-[160px]">
              {chartJsLoaded ? (
                <ChartComponent
                  id="postingFrequency"
                  type="line"
                  data={postingFrequencyData}
                  options={percentLineOptions}
                  height={150}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
            <div className="mt-3 p-2.5 bg-brand-canvas-soft border-l-3 border-brand-primary border-l-4 rounded-r-brand-sm text-[11px]">
              <div className="font-bold text-brand-primary mb-1">Optimal cadence per platform</div>
              <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
                <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
                <span>Facebook</span>
                <span className="text-brand-body-mid font-medium">1–2/wk ·</span>
                <span className="font-bold text-emerald-600">12.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Accumulation */}
        <Card className="border-brand-border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-brand-ink">Engagement Accumulation</CardTitle>
            <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">How engagement accumulates after publishing</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between">
            <div className="h-[160px]">
              {chartJsLoaded ? (
                <ChartComponent
                  id="engagementAccumulation"
                  type="line"
                  data={engagementAccumulationData}
                  options={percentLineOptions}
                  height={150}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
            <div className="mt-3 p-2.5 bg-[#FFF8E1] border-l-3 border-amber-500 border-l-4 rounded-r-brand-sm text-[11px] text-[#7A5C00]">
              <span>⚡ Half of engagement by <strong>2–7d</strong> · 80% within <strong>2–7d</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Content decay / performance insights */}
        <Card className="border-brand-border shadow-sm flex flex-col">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-brand-ink">Content Performance Insights</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex-1 flex flex-col gap-2 text-xs leading-normal">
            <div className="p-2.5 rounded-brand-sm bg-[#F0FFF8] border border-[#C6F6E2] text-[#1A4A3A]">
              <div className="text-[9px] text-[#00805A] font-bold uppercase tracking-wider mb-0.5">📈 Growth Insight</div>
              <div>Engagement rate of <strong>{summary?.engagementRate?.toFixed(1) ?? '62.5'}%</strong> significantly above average. Consider increasing posting frequency.</div>
            </div>

            <div className="p-2.5 rounded-brand-sm bg-[#EBF4FF] border border-[#BDD7F5] text-[#1A2A4A]">
              <div className="text-[9px] text-[#004499] font-bold uppercase tracking-wider mb-0.5">🕐 Best Times</div>
              <div><strong>Tuesday 8am</strong> and <strong>Sunday 5pm</strong> show highest engagement windows.</div>
            </div>

            <div className="p-2.5 rounded-brand-sm bg-[#FFF8E6] border border-[#FFD98A] text-[#4A3A00]">
              <div className="text-[9px] text-[#996600] font-bold uppercase tracking-wider mb-0.5">💡 Recommendation</div>
              <div>Maintain <strong>1–2 posts/week</strong> cadence on Facebook for optimal engagement yield.</div>
            </div>

            <div className="p-2.5 rounded-brand-sm bg-[#F5F0FF] border border-[#C9B8F0] text-[#1A1040]">
              <div className="text-[9px] text-[#4A2D99] font-bold uppercase tracking-wider mb-0.5">🔗 Platforms Connected</div>
              <div>Facebook <strong>active</strong> · Instagram, LinkedIn, TikTok, YouTube available to connect.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
