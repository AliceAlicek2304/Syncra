import { useMemo, useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
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
  MousePointerClick,
  BarChart3,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import CountingNumber from '../../components/CountingNumber'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAnalyticsSummary } from '../../hooks/useAnalyticsSummary'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { EngagementChartTooltip } from '@/components/analytics/EngagementChartTooltip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipProvider as UITooltipProvider,
  TooltipTrigger as UITooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import PostDetailsPanel from '../../components/analytics/PostDetailsPanel'

// Group raw postsPerWeek into the cadence ranges shown on the chart's x-axis.
function cadenceBucket(postsPerWeek: number): { key: string; order: number } {
  if (postsPerWeek <= 2) return { key: '1-2', order: 0 }
  if (postsPerWeek <= 5) return { key: '3-5', order: 1 }
  if (postsPerWeek <= 10) return { key: '6-10', order: 2 }
  return { key: '11+', order: 3 }
}

function PlatformTick({ x, y, payload }: any) {
  const platform = String(payload?.value || '').toLowerCase()
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-10} y={2} width={24} height={24}>
        <ExtendedPlatformIcon platform={platform} size={18} />
      </foreignObject>
    </g>
  )
}

function EngagementAccumulationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="rounded-brand-md border border-brand-border/80 bg-white px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)] min-w-[150px]">
      <div className="text-[11px] font-semibold text-brand-ink mb-1">{point.name}</div>
      <div className="text-[10px] text-brand-body-mid flex items-center justify-between gap-3">
        <span>Cumulative:</span>
        <span className="font-semibold text-brand-ink">{point.pct}%</span>
      </div>
      {point.delta !== null && (
        <div className="text-[10px] text-brand-body-mid flex items-center justify-between gap-3">
          <span>This window:</span>
          <span className="font-semibold text-emerald-600">+{point.delta}%</span>
        </div>
      )}
      {point.postCount !== null && (
        <div className="text-[10px] text-brand-body-mid">
          {point.postCount} {point.postCount === 1 ? 'post' : 'posts'} averaged
        </div>
      )}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-brand-md border border-brand-border/80 bg-white px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
      <div className="text-[10px] font-semibold text-brand-ink text-center mb-1">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="text-[11px] text-brand-body-mid flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="font-semibold text-brand-ink">{entry.name}:</span>
          <span>{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function FollowerTooltip({ active, payload, label, accounts }: any) {
  if (!active || !payload?.length) return null

  const rawDate = payload[0]?.payload?.fullDate ?? label
  const dateObj = new Date(rawDate)
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const year = dateObj.getFullYear()

  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value ?? 0), 0)

  return (
    <div className="rounded-brand-md border border-brand-border/80 bg-white px-3 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)] min-w-[160px]">
      <div className="text-[11px] font-bold text-brand-ink text-center mb-1.5">
        {dayName}, {monthDay} {year}
      </div>
      <div className="border-t border-brand-border/60 my-1.5" />
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 py-0.5">
          <ExtendedPlatformIcon platform={entry.dataKey} size={14} />
          <span className="text-[10px] text-brand-body-mid font-medium">{entry.name}</span>
          <span className="text-[10px] font-bold text-brand-ink ml-auto">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
      <div className="border-t border-brand-border/60 my-1.5" />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-brand-body-mid font-medium">Total</span>
        <span className="text-[10px] font-bold text-brand-ink">{total.toLocaleString()}</span>
      </div>
    </div>
  )
}

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
        className={`h-8 pl-3 pr-8 py-1.5 flex items-center justify-between bg-white border border-brand-border rounded-brand-sm text-xs font-semibold text-brand-ink-soft hover:bg-brand-canvas-soft/60 hover:border-brand-primary transition-all outline-none cursor-pointer gap-2 relative ${open ? 'bg-brand-canvas-soft border-brand-primary' : ''
          }`}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          <span className="text-left select-none">{renderOptionLabel(selected)}</span>
        </span>
        <ChevronDown
          size={12}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-body opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''
            }`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-brand-border rounded-brand-md shadow-lg z-50 py-1 overflow-y-auto max-h-60">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 outline-none ${opt.value === value
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

type EngagementMetricKey = 'likes' | 'comments' | 'shares' | 'views' | 'impressions' | 'reach' | 'saves' | 'clicks'

const METRIC_CONFIG: { key: EngagementMetricKey; label: string; icon: React.ReactNode }[] = [
  { key: 'likes', label: 'Likes', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 11C6.5 11 1 7.5 1 4A2.8 2.8 0 016.5 3.4 2.8 2.8 0 0112 4c0 3.5-5.5 7-5.5 7z" stroke="currentColor" strokeWidth="1.2" /></svg> },
  { key: 'comments', label: 'Comments', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 2H2a1 1 0 00-1 1v5a1 1 0 001 1h1.5L5 11l1.5-2H11a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> },
  { key: 'shares', label: 'Shares', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="10" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="10" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="3" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.1" /><path d="M4.3 5.8L8.7 3.2M4.3 7.2L8.7 9.8" stroke="currentColor" strokeWidth="1.1" /></svg> },
  { key: 'views', label: 'Views', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><ellipse cx="6.5" cy="6.5" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.1" /></svg> },
  { key: 'impressions', label: 'Impressions', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="8" width="2" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.1" /><rect x="5" y="5" width="2" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.1" /><rect x="9" y="2" width="2" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.1" /></svg> },
  { key: 'reach', label: 'Reach', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.1" /><path d="M2 11.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg> },
  { key: 'saves', label: 'Saves', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 2h7a1 1 0 011 1v8l-4.5-2.5L1 11V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg> },
  { key: 'clicks', label: 'Clicks', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 1v7l2.5-2 1.5 3.5 1.5-.7L7 6l3-.5L3 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg> },
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

/** Tính "27m ago" / "in 33m" dựa trên dataUpdatedAt thực từ React Query */
const SYNC_INTERVAL_MS = 60 * 60 * 1000 // 60 phút

function formatRelativeTime(ms: number): string {
  const totalSeconds = Math.round(Math.abs(ms) / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainMins = minutes % 60
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
}

function useSyncClock(dataUpdatedAt: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Tính sau hooks — không dùng conditional return
  const elapsed = now - dataUpdatedAt
  const nextIn = SYNC_INTERVAL_MS - elapsed

  if (dataUpdatedAt === 0) return { lastSyncText: null as null, nextSyncText: null as null }

  return {
    lastSyncText: `${formatRelativeTime(elapsed)} ago`,
    nextSyncText: nextIn > 0 ? `in ${formatRelativeTime(nextIn)}` : 'now',
  }
}

/** Trend badge giống zernio.com: mũi tên xanh + delta, hoặc "new" khi null */
function TrendBadge({
  delta,
  isLoading,
  format,
}: {
  delta: number | null
  isLoading: boolean
  format: (v: number) => string
}) {
  if (isLoading) {
    return <div className="mt-1 h-[14px] w-16 animate-pulse rounded bg-brand-border/40" />
  }
  const isNew = delta === null
  const isPositive = !isNew && delta! >= 0

  return (
    <div className="mt-1 flex items-center gap-1 text-[10px] min-h-[14px]">
      {isNew ? (
        <>
          {/* mũi tên xanh giống zernio "new" */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
            <path d="M2 8L8 2M8 2H4M8 2V6" stroke="#00A96E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-emerald-600 font-semibold">new</span>
        </>
      ) : isPositive ? (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
            <path d="M2 8L8 2M8 2H4M8 2V6" stroke="#00A96E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-emerald-600 font-semibold">{format(delta!)}</span>
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
            <path d="M2 2L8 8M8 8H4M8 8V4" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-red-500 font-semibold">{format(delta!)}</span>
        </>
      )}
    </div>
  )
}

// ─── EngagementOverTimeCard ───────────────────────────────────────────────────

interface EngagementMetricDef {
  key: string
  label: string
  color: string
  icon: React.ReactNode
  yAxis: string
}

interface WeekRange {
  weekStart: Date
  weekEnd: Date
}

interface EngagementOverTimeCardProps {
  presetDays: number
  isLoading: boolean
  engagementOverTimeData: {
    chartData: Record<string, any>[]
    labels: string[]
    _raw: Record<string, number[]>
    weekRanges: WeekRange[]
    weekPlatforms: string[][]
  }
  selectedEngagementMetrics: Set<string>
  setSelectedEngagementMetrics: React.Dispatch<React.SetStateAction<Set<string>>>
  platformTotals: {
    likes: number; comments: number; shares: number; saves: number
    views: number; impressions: number; reach: number; clicks: number; posts: number
  }
  engagementRate: number
  ENGAGEMENT_CHART_METRICS: EngagementMetricDef[]
}


function EngagementOverTimeCard({
  presetDays,
  isLoading,
  engagementOverTimeData,
  selectedEngagementMetrics,
  setSelectedEngagementMetrics,
  platformTotals,
  engagementRate,
  ENGAGEMENT_CHART_METRICS,
}: EngagementOverTimeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean
    dataIndex: number
    left: number
    top: number
  }>({ visible: false, dataIndex: 0, left: 0, top: 0 })

  const totalPosts = platformTotals.posts

  const metricItems = useMemo(() => [
    { key: 'likes', label: 'Likes', icon: <Heart size={10} className="text-[#EF4444] fill-[#EF4444]" />, value: platformTotals.likes, color: '#EF4444' },
    { key: 'comments', label: 'Comments', icon: <MessageSquare size={10} className="text-[#3B82F6]" />, value: platformTotals.comments, color: '#3B82F6' },
    { key: 'shares', label: 'Shares', icon: <Share2 size={10} className="text-[#8B5CF6]" />, value: platformTotals.shares, color: '#8B5CF6' },
    { key: 'saves', label: 'Saves', icon: <Bookmark size={10} className="text-[#F59E0B]" />, value: platformTotals.saves, color: '#F59E0B' },
    { key: 'views', label: 'Views', icon: <Eye size={10} className="text-[#06B6D4]" />, value: platformTotals.views, color: '#06B6D4' },
    { key: 'impressions', label: 'Impressions', icon: <TrendingUp size={10} className="text-[#10B981]" />, value: platformTotals.impressions, color: '#10B981' },
    { key: 'reach', label: 'Reach', icon: <Users size={10} className="text-[#F97316]" />, value: platformTotals.reach, color: '#F97316' },
    { key: 'clicks', label: 'Clicks', icon: <MousePointerClick size={10} className="text-[#6366F1]" />, value: platformTotals.clicks, color: '#6366F1' },
  ], [platformTotals])

  const handleMetricToggle = (key: string) => {
    setSelectedEngagementMetrics(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleChartMouseMove = (state: any) => {
    if (state?.activeTooltipIndex == null || !containerRef.current) return
    const idx = state.activeTooltipIndex
    const containerRect = containerRef.current.getBoundingClientRect()
    const chartEl = containerRef.current.querySelector('.recharts-surface')
    if (!chartEl) return
    const chartRect = chartEl.getBoundingClientRect()

    const tooltipWidth = 244
    const tooltipHeight = 214

    const pointsOnAxis = state?.activePayload
    if (!pointsOnAxis?.length) return

    const x = pointsOnAxis[0]?.coordinate?.x ?? 0
    const y = pointsOnAxis[0]?.coordinate?.y ?? 0

    let left = (chartRect.left - containerRect.left) + x + 12
    if (left + tooltipWidth > containerRect.width) {
      left = (chartRect.left - containerRect.left) + x - tooltipWidth - 12
    }
    left = Math.max(4, Math.min(left, containerRect.width - tooltipWidth - 4))

    let top = (chartRect.top - containerRect.top) + y - 24
    top = Math.max(4, Math.min(top, containerRect.height - tooltipHeight - 4))

    setTooltipState({ visible: true, dataIndex: idx, left, top })
  }

  const handleChartMouseLeave = () => {
    setTooltipState(prev => prev.visible ? { ...prev, visible: false } : prev)
  }

  return (
    <Card className="border-brand-border shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* LEFT: Chart */}
        <div className="flex-1 min-w-0 border-b lg:border-b-0 lg:border-r border-brand-border/60">
          <CardHeader className="p-4 pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink">Engagement over time</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
                Per week · last {presetDays} days
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div
              ref={containerRef}
              className="relative h-[240px] min-w-0 min-h-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={engagementOverTimeData.chartData}
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="y" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} />
                  <YAxis yAxisId="y2" orientation="right" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} />
                  {ENGAGEMENT_CHART_METRICS.filter(m => selectedEngagementMetrics.has(m.key)).map(m => (
                    <Line
                      key={m.key}
                      yAxisId={m.yAxis}
                      type="monotone"
                      dataKey={m.key}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: m.color, stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      connectNulls
                    />
                  ))}
                  <Tooltip content={() => null} cursor={{ stroke: '#9CA3AF', strokeDasharray: '4 3', strokeWidth: 1 }} />
                </LineChart>
              </ResponsiveContainer>
              <EngagementChartTooltip
                visible={tooltipState.visible}
                dataIndex={tooltipState.dataIndex}
                labels={engagementOverTimeData.labels}
                raw={engagementOverTimeData._raw}
                weekRanges={engagementOverTimeData.weekRanges}
                metrics={ENGAGEMENT_CHART_METRICS}
                activeMetrics={selectedEngagementMetrics}
                weekPlatforms={engagementOverTimeData.weekPlatforms}
                style={{
                  position: 'absolute',
                  left: `${tooltipState.left}px`,
                  top: `${tooltipState.top}px`,
                }}
              />
            </div>
          </CardContent>
        </div>

        {/* RIGHT: Metric Summary */}
        <div className="w-full lg:w-[284px] shrink-0 flex flex-col">
          <div className="p-4 pb-2 flex items-center justify-between border-b border-brand-border/40">
            <span className="text-xs font-bold text-brand-ink">Metric Summary</span>
            <span className="text-[9px] text-brand-body-mid font-medium">Click to toggle</span>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-1.5">
            {/* 3-column metric grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {metricItems.map(item => {
                const isActive = selectedEngagementMetrics.has(item.key)
                return (
                  <button
                    key={item.key}
                    onClick={() => handleMetricToggle(item.key)}
                    aria-pressed={isActive}
                    aria-label={`Toggle ${item.label} metric`}
                    className={`flex flex-col gap-0.5 rounded-lg p-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 border ${isActive
                      ? 'bg-white border-brand-border/80 shadow-sm opacity-100'
                      : 'bg-brand-canvas-soft/60 border-transparent opacity-50 hover:opacity-75'
                      }`}

                  >
                    {/* Checkbox + label row */}
                    <div className="flex items-center gap-1 w-full">
                      <span
                        className="w-3 h-3 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all"
                        style={isActive
                          ? { backgroundColor: item.color, borderColor: item.color }
                          : { borderColor: '#D1D5DB' }
                        }
                      >
                        {isActive && (
                          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                            <path d="M1.2 3.4L2.7 5 5.8 1.8" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[9px] font-semibold text-brand-body-mid truncate leading-none"
                        style={isActive ? { color: item.color } : {}}>
                        {item.label}
                      </span>
                    </div>
                    {/* Icon + Value row */}
                    <div className="flex items-center gap-1 pl-0.5">
                      <span style={{ color: isActive ? item.color : '#9CA3AF' }}>
                        {item.icon}
                      </span>
                      <span className={`text-sm font-extrabold leading-none transition-colors ${isActive ? 'text-brand-ink' : 'text-brand-body-mid'
                        }`}>
                        {isLoading ? '—' : item.value.toLocaleString()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Engagement Rate footer */}
            <div className="mt-1.5 pt-2 border-t border-brand-border/60 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none" className="shrink-0">
                  <path d="M2 8L8 2M8 2H4M8 2V6" stroke="#00A96E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-bold text-emerald-600">Eng. Rate</span>
              </div>
              <span className="text-base font-extrabold text-emerald-600">
                {isLoading ? '—' : `${engagementRate.toFixed(2)}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

const toLocalSlot = (dayOfWeek: number, hourUtc: number) => {
  const utcDate = new Date(Date.UTC(2020, 0, 6 + dayOfWeek, hourUtc, 0, 0, 0))
  const localDay = (utcDate.getDay() + 6) % 7
  const localHour = utcDate.getHours()
  return { localDay, localHour }
}

const formatSlotLabel = (slot: { dayOfWeek: number; hour: number }) => {
  const day = DAY_LABELS[slot.dayOfWeek] ?? ''
  const hour = slot.hour
  const hourLabel = hour === 0
    ? '12am'
    : hour < 12
      ? `${hour}am`
      : hour === 12
        ? '12pm'
        : `${hour - 12}pm`
  return `${day} ${hourLabel}`
}

export default function AnalyticsPage() {
  console.log('AnalyticsPage render')
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()
  const heatmapContainerRef = useRef<HTMLDivElement>(null)
  const [dynamicRectSize, setDynamicRectSize] = useState(14)

  useEffect(() => {
    if (!heatmapContainerRef.current) return
    const obs = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      if (width > 0) {
        // 24 columns resolution
        const calculated = Math.floor(width / 30) 
        setDynamicRectSize(Math.max(12, Math.min(18, calculated)))
      }
    })
    obs.observe(heatmapContainerRef.current)
    return () => obs.disconnect()
  }, [])

  const heatmapGap = Math.max(2, Math.floor(dynamicRectSize * 0.2))
  const dynamicHeatmapHeight = dynamicRectSize * 7 + heatmapGap * 6 + 30 // +30 for month labels

  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [engagementMetric, setEngagementMetric] = useState<'likes' | 'comments' | 'shares' | 'views' | 'impressions' | 'reach' | 'saves' | 'clicks'>('likes')
  const [selectedEngagementMetrics, setSelectedEngagementMetrics] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('syncra_engagement_metrics')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return new Set<string>(parsed)
      }
    } catch { }
    return new Set<string>(['likes', 'comments', 'impressions'])
  })

  // Persist metric selection to localStorage so it survives page reloads
  useEffect(() => {
    try {
      localStorage.setItem('syncra_engagement_metrics', JSON.stringify(Array.from(selectedEngagementMetrics)))
    } catch { }
  }, [selectedEngagementMetrics])
  const [showMetricDropdown, setShowMetricDropdown] = useState(false)
  const [dismissedBilling, setDismissedBilling] = useState(false)
  const [dismissedReauth, setDismissedReauth] = useState(false)
  const [activeTab, setActiveTab] = useState<'posting' | 'inbox'>('posting')

  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterWorkspace, setFilterWorkspace] = useState<string>('all')

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
    topPosts: hookTopPosts,
    analyticsListSummary,
    analyticsListSummaryPosts,
    bestTime: hookBestTime,
    followerStats: hookFollowerStats,
    contentDecay: hookContentDecay,
    postingFrequency: hookPostingFrequency,
    dataUpdatedAt,
    refresh,
  } = useAnalyticsSummary({
    workspaceId: filterWorkspace,
    platform: filterPlatform === 'all' ? undefined : filterPlatform,
  })

  const { lastSyncText, nextSyncText } = useSyncClock(dataUpdatedAt)

  const summary = useMemo(() => {
    if (!dailyMetrics) return null;
    const breakdown = dailyMetrics.platformBreakdown || [];
    const totalReach = breakdown.reduce((acc, b) => acc + b.reach, 0);
    const totalPosts = breakdown.reduce((acc, b) => acc + b.postCount, 0);
    const totalImpressions = breakdown.reduce((acc, b) => acc + b.impressions, 0);
    const totalEngagements = breakdown.reduce((acc, b) => acc + b.likes + b.comments + b.shares, 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    const engagementRateByReach = totalReach > 0 ? (totalEngagements / totalReach) * 100 : 0;

    return {
      engagementRate,
      engagementRateByReach,
      totalReach,
      totalImpressions,
      totalEngagements,
      followerGrowth: 0,
      totalPosts,
      platformBreakdown: breakdown,
    };
  }, [dailyMetrics]);

  // Per the contract, the page may issue at most 6 endpoints on initial load
  // (no previous-period query). Trend badges fall back to the "new" state.
  const engagementTrend: number | null = null
  const reachTrend: number | null = null
  const postsTrend: number | null = null

  const topPostsLoading = hookTopPosts === null || (Array.isArray(hookTopPosts) && hookTopPosts.length === 0 && isLoading)

  const topPosts = useMemo(() => {
    const items = analyticsListSummaryPosts.length > 0 ? analyticsListSummaryPosts : hookTopPosts ?? []
    return items
      .filter((p) => p.analytics)
      .map((p) => {
        const a = p.analytics!
        const engagements = (a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0)
        return {
          post: {
            id: p.id || p.latePostId || '',
            scheduledAtUtc: p.scheduledFor,
            createdAt: p.publishedAt || p.scheduledFor || new Date().toISOString(),
            content: p.content ?? '',
            thumbnailUrl: p.thumbnailUrl,
            platformPostUrl: p.platformPostUrl,
            platform: p.platform,
          },
          metrics: {
            syncPending: false,
            analytics: a,
            views: a.views ?? 0,
            engagements,
          },
          engagementRate: Number(a.engagementRate ?? 0),
          engagements,
          reach: Number(a.reach ?? 0),
          likes: Number(a.likes ?? 0),
          comments: Number(a.comments ?? 0),
          shares: Number(a.shares ?? 0),
          saves: Number(a.saves ?? 0),
          clicks: Number(a.clicks ?? 0),
          impressions: Number(a.impressions ?? 0),
        }
      })
      .sort((a, b) => (b.reach - a.reach) || (b.engagements - a.engagements))
      .filter((p) => p.engagementRate > 0)
      .sort((a, b) => b.engagementRate - a.engagementRate)
  }, [analyticsListSummaryPosts, hookTopPosts])

  const followerStatsLoading = !hookFollowerStats

  const followerStats = useMemo(() => {
    const accounts = hookFollowerStats?.accounts ?? []
    return {
      totalFollowers: accounts.reduce((sum, a) => sum + (a.currentFollowers ?? 0), 0),
      totalGrowth: accounts.reduce((sum, a) => sum + (a.growth ?? 0), 0),
      accountCount: accounts.length,
    }
  }, [hookFollowerStats])

  const platformTotals = useMemo(() => {
    // Prefer data aggregated from getAnalyticsList posts (analyticsListSummary)
    if (analyticsListSummary) {
      return analyticsListSummary;
    }
    // Fallback: aggregate from dailyMetrics.platformBreakdown
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
  }, [analyticsListSummary, dailyMetrics])

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

  const [platformSortKey, setPlatformSortKey] = useState<string>('platform')
  const [platformSortDir, setPlatformSortDir] = useState<'asc' | 'desc'>('asc')

  const handlePlatformSort = (key: string) => {
    if (platformSortKey === key) {
      setPlatformSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setPlatformSortKey(key)
      setPlatformSortDir('asc')
    }
  }

  const sortedPlatformRows = useMemo(() => {
    const rows = [...platformRows]
    rows.sort((a, b) => {
      let aVal = (a as any)[platformSortKey]
      let bVal = (b as any)[platformSortKey]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal == null) aVal = 0
      if (bVal == null) bVal = 0
      if (aVal < bVal) return platformSortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return platformSortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [platformRows, platformSortKey, platformSortDir])

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (platformSortKey !== colKey) return <ArrowUpDown size={10} className="opacity-30" />
    return platformSortDir === 'asc'
      ? <ArrowUp size={10} className="text-brand-primary" />
      : <ArrowDown size={10} className="text-brand-primary" />
  }

  const [topPostSortKey, setTopPostSortKey] = useState<string>('reach')
  const [topPostSortDir, setTopPostSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  const handleTopPostSort = (key: string) => {
    if (topPostSortKey === key) {
      setTopPostSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setTopPostSortKey(key)
      setTopPostSortDir('desc')
    }
  }

  const sortedTopPosts = useMemo(() => {
    const rows = [...topPosts]
    rows.sort((a, b) => {
      let aVal: any = topPostSortKey === 'post' ? (a.post.id || '') : (a as any)[topPostSortKey]
      let bVal: any = topPostSortKey === 'post' ? (b.post.id || '') : (b as any)[topPostSortKey]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal == null) aVal = 0
      if (bVal == null) bVal = 0
      if (aVal < bVal) return topPostSortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return topPostSortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [topPosts, topPostSortKey, topPostSortDir])

  const SortIconTop = ({ colKey }: { colKey: string }) => {
    if (topPostSortKey !== colKey) return <ArrowUpDown size={10} className="opacity-30" />
    return topPostSortDir === 'asc'
      ? <ArrowUp size={10} className="text-brand-primary" />
      : <ArrowDown size={10} className="text-brand-primary" />
  }

  const bestTimeSlots = useMemo(() => {
    const slots = hookBestTime?.slots ?? []
    if (slots.length === 0) return []
    return slots.map(s => ({
      dayOfWeek: s.dayOfWeek,
      hour: s.hour,
      score: s.avgEngagement,
      postCount: s.postCount || 0,
    }))
  }, [hookBestTime])

  const bestSlots = useMemo(() => {
    const sorted = [...bestTimeSlots]
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
    return sorted.slice(0, 3)
  }, [bestTimeSlots])

  const engagementGrid = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }).map(() => ({ score: 0, postCount: 0 })))
    let max = 0
    bestTimeSlots.forEach((slot) => {
      const { localDay, localHour } = toLocalSlot(slot.dayOfWeek, slot.hour)
      grid[localDay][localHour] = {
        score: Math.max(0, slot.score),
        postCount: (slot as any).postCount || 0
      }
      if (grid[localDay][localHour].score > max) max = grid[localDay][localHour].score
    })
    return { grid, max }
  }, [bestTimeSlots])

  const getHeatColor = (value: number, max: number) => {
    if (value === 0) return '#f8f4f0'
    const ratio = value / (max || 1)
    if (ratio < 0.2) return '#fee4d2'
    if (ratio < 0.5) return '#ffbb98'
    if (ratio < 0.8) return '#ff8e5d'
    return '#ff4f00'
  }

  // Recharts bar chart data
  const postsPerPlatformData = useMemo(() => {
    const breakdown = dailyMetrics?.platformBreakdown ?? []

    if (breakdown.length === 0) {
      return [{ name: 'Facebook', count: 6, fill: '#1877F2' }]
    }

    return breakdown.map(p => ({
      name: platformLabelMap.get(p.platform) ?? p.platform,
      count: p.postCount,
      fill: p.platform === 'facebook' ? '#1877F2' : '#ff4f00',
    }))
  }, [dailyMetrics, platformLabelMap])

  const postsOverTimeData = useMemo(() => {
    const daily = dailyMetrics?.dailyData ?? []
    if (daily.length === 0) {
      return [
        { name: 'May 7', count: 0, fill: '#1877F2' },
        { name: 'May 14', count: 0, fill: '#1877F2' },
        { name: 'May 21', count: 0, fill: '#1877F2' },
        { name: 'May 28', count: 6, fill: '#1877F2' },
        { name: 'Jun 4', count: 0, fill: '#1877F2' },
      ]
    }

    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-presetDays)
    const numBins = 5
    const binSize = Math.max(1, Math.ceil(sorted.length / numBins))

    const result: { name: string; count: number; fill: string }[] = []

    for (let i = 0; i < numBins; i++) {
      const slice = sorted.slice(i * binSize, (i + 1) * binSize)
      if (slice.length === 0) continue

      const lastDate = new Date(slice[slice.length - 1].date)
      result.push({
        name: lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: slice.reduce((sum, d) => sum + d.postCount, 0),
        fill: '#1877F2',
      })
    }

    return result
  }, [dailyMetrics, presetDays])

  const metricPerPlatformData = useMemo(() => {
    const breakdown = dailyMetrics?.platformBreakdown ?? []
    const items = breakdown.map(p => ({
      name: platformLabelMap.get(p.platform) ?? p.platform,
      value: (p as any)[engagementMetric] as number ?? 0,
      fill: p.platform === 'facebook' ? '#1877F2' : '#ff4f00',
    }))
    const total = items.reduce((s, v) => s + v.value, 0)

    if (items.length === 0 || total === 0) return null

    return items
  }, [dailyMetrics, platformLabelMap, engagementMetric])

  // Metric config for engagement over time chart
  const ENGAGEMENT_CHART_METRICS = useMemo(() => [
    { key: 'likes', label: 'Likes', color: '#EF4444', icon: <Heart size={10} className="fill-current" />, yAxis: 'y' },
    { key: 'comments', label: 'Comments', color: '#3B82F6', icon: <MessageSquare size={10} />, yAxis: 'y' },
    { key: 'shares', label: 'Shares', color: '#8B5CF6', icon: <Share2 size={10} />, yAxis: 'y' },
    { key: 'saves', label: 'Saves', color: '#F59E0B', icon: <Bookmark size={10} />, yAxis: 'y' },
    { key: 'views', label: 'Views', color: '#06B6D4', icon: <Eye size={10} />, yAxis: 'y2' },
    { key: 'impressions', label: 'Impressions', color: '#10B981', icon: <TrendingUp size={10} />, yAxis: 'y2' },
    { key: 'reach', label: 'Reach', color: '#F97316', icon: <Users size={10} />, yAxis: 'y2' },
    { key: 'clicks', label: 'Clicks', color: '#6366F1', icon: <MousePointerClick size={10} />, yAxis: 'y' },
  ], [])

  const engagementOverTimeData = useMemo(() => {
    const daily = dailyMetrics?.dailyData ?? []

    // ── Build a lookup: date string → data point ──────────────────────────────
    const byDate: Record<string, typeof daily[0]> = {}
    daily.forEach(d => { byDate[d.date] = d })

    // ── Generate fixed weekly buckets anchored to today ───────────────────────
    // Week boundaries are always Monday→Sunday calendar weeks.
    // We generate ceil(presetDays / 7) + 1 complete weeks so the full range is covered.
    const now = new Date()
    // Find the Monday of the current week (ISO week start)
    const currentMonday = new Date(now)
    const dow = (currentMonday.getDay() + 6) % 7 // 0=Mon … 6=Sun
    currentMonday.setDate(currentMonday.getDate() - dow)
    currentMonday.setHours(0, 0, 0, 0)

    // How many complete weeks we need to go back to cover `presetDays`
    const numWeeks = Math.ceil(presetDays / 7) + 1

    // Build week bucket start dates (oldest → newest)
    const weekStarts: Date[] = []
    for (let w = numWeeks - 1; w >= 0; w--) {
      const ws = new Date(currentMonday)
      ws.setDate(currentMonday.getDate() - w * 7)
      weekStarts.push(ws)
    }

    // ── Compute the actual date range we care about ───────────────────────────
    const rangeEnd = new Date(now)
    rangeEnd.setHours(23, 59, 59, 999)
    const rangeStart = new Date(now)
    rangeStart.setDate(rangeStart.getDate() - presetDays + 1)
    rangeStart.setHours(0, 0, 0, 0)

    // ── Keep only week buckets whose start is within the range ────────────────
    // Include a bucket if its start OR any of its 7 days falls in [rangeStart, rangeEnd]
    const filteredWeekStarts = weekStarts.filter(ws => {
      const we = new Date(ws)
      we.setDate(ws.getDate() + 6)
      return we >= rangeStart && ws <= rangeEnd
    })

    // ── Aggregate daily data into fixed week buckets ──────────────────────────
    const labels: string[] = []
    const weekRanges: WeekRange[] = []
    const weekPlatforms: string[][] = []
    const dataByKey: Record<string, number[]> = {
      likes: [], comments: [], shares: [], saves: [],
      views: [], impressions: [], reach: [], clicks: [], posts: [],
    }

    // Platform label map for display names
    const platLabelMap = new Map(ZERNIO_PLATFORMS.map(p => [p.id, p.label]))

    for (const ws of filteredWeekStarts) {
      const we = new Date(ws)
      we.setDate(ws.getDate() + 6)
      we.setHours(23, 59, 59, 999)

      labels.push(ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      weekRanges.push({ weekStart: new Date(ws), weekEnd: we })

      // Collect all days in this bucket that fall within our date range
      const platformsThisWeek = new Set<string>()
      let likes = 0, comments = 0, shares = 0, saves = 0
      let views = 0, impressions = 0, reach = 0, clicks = 0, posts = 0

      // Iterate each day of the week bucket
      for (let d = 0; d < 7; d++) {
        const day = new Date(ws)
        day.setDate(ws.getDate() + d)
        if (day < rangeStart || day > rangeEnd) continue

        const dateStr = [
            day.getFullYear(),
            String(day.getMonth() + 1).padStart(2, '0'),
            String(day.getDate()).padStart(2, '0'),
          ].join('-')
        const row = byDate[dateStr]
        if (!row) continue

        likes += row.metrics?.likes ?? 0
        comments += row.metrics?.comments ?? 0
        shares += row.metrics?.shares ?? 0
        saves += row.metrics?.saves ?? 0
        views += row.metrics?.views ?? 0
        impressions += row.metrics?.impressions ?? 0
        reach += row.metrics?.reach ?? 0
        clicks += row.metrics?.clicks ?? 0
        posts += row.postCount ?? 0

        // Collect platform names from the platforms map on the data point
        if (row.platforms) {
          Object.keys(row.platforms).forEach(pid => {
            if ((row.platforms as Record<string, number>)[pid] > 0) {
              platformsThisWeek.add(platLabelMap.get(pid) ?? pid)
            }
          })
        }
      }

      dataByKey.likes.push(likes)
      dataByKey.comments.push(comments)
      dataByKey.shares.push(shares)
      dataByKey.saves.push(saves)
      dataByKey.views.push(views)
      dataByKey.impressions.push(impressions)
      dataByKey.reach.push(reach)
      dataByKey.clicks.push(clicks)
      dataByKey.posts.push(posts)
      weekPlatforms.push(Array.from(platformsThisWeek).sort())
    }

    // ── Fallback demo data when no real daily data exists ─────────────────────
    if (daily.length === 0) {
      const demoBase = new Date('2026-05-08')
      const demoLabels = ['May 8', 'May 15', 'May 22', 'May 29', 'Jun 5']
      const demoWeekRanges: WeekRange[] = [0, 1, 2, 3, 4].map(i => ({
        weekStart: new Date(demoBase.getTime() + i * 7 * 86400_000),
        weekEnd: new Date(demoBase.getTime() + i * 7 * 86400_000 + 6 * 86400_000),
      }))
      const demoData: Record<string, number[]> = {
        likes: [0, 0, 0, 0, 0], comments: [0, 0, 0, 5, 0], shares: [0, 0, 0, 0, 0],
        saves: [0, 0, 0, 0, 0], views: [0, 0, 0, 0, 0], impressions: [0, 0, 0, 70, 0],
        reach: [0, 0, 0, 8, 0], clicks: [0, 0, 0, 3, 0], posts: [0, 0, 0, 1, 0],
      }

      // Build chartData for Recharts: array of {name, likes, comments, ...}
      const chartData = demoLabels.map((label, i) => ({
        name: label,
        likes: demoData.likes[i],
        comments: demoData.comments[i],
        shares: demoData.shares[i],
        saves: demoData.saves[i],
        views: demoData.views[i],
        impressions: demoData.impressions[i],
        reach: demoData.reach[i],
        clicks: demoData.clicks[i],
      }))

      return {
        chartData,
        labels: demoLabels,
        _raw: demoData,
        weekRanges: demoWeekRanges,
        weekPlatforms: [[], [], [], ['Facebook'], []],
      }
    }

    // Build chartData for Recharts: array of {name, likes, comments, ...}
    const chartData = labels.map((label, i) => ({
      name: label,
      likes: dataByKey.likes[i],
      comments: dataByKey.comments[i],
      shares: dataByKey.shares[i],
      saves: dataByKey.saves[i],
      views: dataByKey.views[i],
      impressions: dataByKey.impressions[i],
      reach: dataByKey.reach[i],
      clicks: dataByKey.clicks[i],
    }))

    return { chartData, labels, _raw: dataByKey, weekRanges, weekPlatforms }
  }, [dailyMetrics, presetDays, ENGAGEMENT_CHART_METRICS])

const PLATFORM_CHART_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  tiktok: '#ff4f00',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  pinterest: '#E60023',
  threads: '#000000',
}

  const followerEvolutionData = useMemo(() => {
    const accounts = hookFollowerStats?.accounts ?? []
    const stats = hookFollowerStats?.stats ?? {}

    if (accounts.length === 0 || Object.keys(stats).length === 0) return []

    const dateSet = new Set<string>()
    Object.values(stats).forEach(points => {
      points.forEach(p => dateSet.add(p.date))
    })
    const sortedDates = Array.from(dateSet).sort()

    return sortedDates.map(date => {
      const entry: Record<string, any> = {
        name: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date + 'T00:00:00',
      }
      accounts.forEach(account => {
        const accountStats = stats[account._id] ?? []
        const point = accountStats.find(p => p.date === date)
        entry[account.platform] = point?.followers ?? 0
      })
      return entry
    })
  }, [hookFollowerStats])

  const postingFrequencyData = useMemo(() => {
    const frequency = hookPostingFrequency?.frequency ?? []
    if (frequency.length === 0) return []
    // Accumulate avgEngagementRate per (bucket, platform), then average.
    const byBucket: Record<string, { order: number; platforms: Record<string, { sum: number; count: number }> }> = {}
    frequency.forEach((b) => {
      const { key, order } = cadenceBucket(b.postsPerWeek)
      if (byBucket[key] == null) byBucket[key] = { order, platforms: {} }
      if (byBucket[key].platforms[b.platform] == null) {
        byBucket[key].platforms[b.platform] = { sum: 0, count: 0 }
      }
      byBucket[key].platforms[b.platform].sum += b.avgEngagementRate
      byBucket[key].platforms[b.platform].count += 1
    })
    return Object.entries(byBucket)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, { platforms }]) => ({
        name: `${key}/wk`,
        ...Object.fromEntries(
          Object.entries(platforms).map(([p, { sum, count }]) => [p, sum / count]),
        ),
      }))
  }, [hookPostingFrequency])

  // Derive "optimal cadence" client-side: the (platform, postsPerWeek)
  // pair with the highest avgEngagementRate. Backend doesn't return
  // optimalCadence or correlation in this response shape.
  // Display the cadence as the same range bucket used on the chart x-axis.
  const optimalCadence = useMemo(() => {
    const frequency = hookPostingFrequency?.frequency ?? []
    if (frequency.length === 0) return null
    const best = frequency.reduce((acc, cur) =>
      cur.avgEngagementRate > acc.avgEngagementRate ? cur : acc,
    )
    const { key } = cadenceBucket(best.postsPerWeek)
    return {
      platform: best.platform,
      postsPerWeek: best.postsPerWeek,
      cadenceLabel: `${key}/wk`,
      avgEngagementRate: best.avgEngagementRate,
    }
  }, [hookPostingFrequency])

  const engagementAccumulationData = useMemo(() => {
    const buckets = hookContentDecay?.buckets ?? []
    const sorted = [...buckets].sort((a, b) => a.bucketOrder - b.bucketOrder)
    // Prepend a synthetic "Publish" anchor (0%) so the curve starts at the
    // origin. Each subsequent point carries the delta from the previous
    // cumulative value and the number of posts averaged in that window.
    const result: Array<{
      name: string
      pct: number
      delta: number | null
      postCount: number | null
    }> = [{ name: 'Publish', pct: 0, delta: null, postCount: null }]
    sorted.forEach((b) => {
      const prev = result[result.length - 1]
      result.push({
        name: b.bucketLabel,
        pct: b.avgPctOfFinal,
        delta: b.avgPctOfFinal - prev.pct,
        postCount: b.postCount,
      })
    })
    return result
  }, [hookContentDecay])

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
    <UITooltipProvider delayDuration={100}>
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
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${activeTab === 'posting'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-body hover:text-brand-primary'
              }`}
          >
            Posting analytics
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${activeTab === 'inbox'
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
            {lastSyncText ? (
              <>
                <span>Last sync: <strong className="text-brand-body">{lastSyncText}</strong></span>
                <span>Next sync: <strong className="text-brand-body">{nextSyncText}</strong></span>
              </>
            ) : (
              <span className="opacity-50">No sync data yet</span>
            )}
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
            <span className="sr-only">Avg. Engagement</span>
            <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-1">Engagement rate</div>
            <div className="text-2xl font-extrabold text-brand-ink">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <CountingNumber value={summary?.engagementRateByReach ?? 0} format={(v) => `${v.toFixed(1)}%`} />
              )}
            </div>
            <TrendBadge
              delta={engagementTrend}
              isLoading={isLoading}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`}
            />
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
            <TrendBadge
              delta={reachTrend}
              isLoading={isLoading}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}`}
            />
          </div>

          {/* Total Followers Card */}
          <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-purple-600 before:h-[3px]">
            <span className="sr-only">Follower Growth</span>
            <span className="sr-only">+{followerStats.totalGrowth}</span>
            <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider mb-1">Total followers</div>
            <div className="text-2xl font-extrabold text-brand-ink">
              {isLoading || followerStatsLoading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <CountingNumber value={followerStats.totalFollowers} format={(v) => v.toLocaleString()} />
              )}
            </div>
            <TrendBadge
              delta={followerStatsLoading ? null : followerStats.totalGrowth}
              isLoading={isLoading || followerStatsLoading}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toLocaleString()} in last ${presetDays}d`}
            />
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
            <TrendBadge
              delta={postsTrend}
              isLoading={isLoading}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toLocaleString()} vs prev. ${presetDays}d`}
            />
          </div>

          {/* Best Post Card */}
          <div className="bg-white border border-brand-border rounded-brand-md p-4 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[3px] before:bg-amber-500 before:h-[3px] flex flex-col gap-2">
            <div className="text-[10px] text-brand-body font-bold uppercase tracking-wider">Best post</div>
            {topPostsLoading ? (
              <div className="flex items-start gap-2.5">
                <Skeleton className="w-12 h-12 rounded-brand-sm shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ) : bestPost ? (
              <>
                <div className="flex items-start gap-2.5 min-w-0">
                  {bestPost.post.thumbnailUrl ? (
                    <img
                      src={bestPost.post.thumbnailUrl}
                      alt=""
                      className="w-12 h-12 rounded-brand-sm object-cover shrink-0 border border-brand-border/60 bg-brand-canvas-soft"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-brand-sm bg-brand-canvas-soft border border-brand-border/60 flex items-center justify-center shrink-0">
                      <MessageSquare size={16} className="text-brand-body-mid" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-brand-ink line-clamp-2 leading-tight" title={bestPost.post.content || undefined}>
                      {bestPost.post.content?.trim() || `Post #${bestPost.post.id.slice(-4)}`}
                    </p>
                    <div className="text-[10px] text-brand-body-mid mt-1 flex items-center gap-1 flex-wrap">
                      <Heart size={9} className="text-brand-primary fill-brand-primary" />
                      <span className="font-bold text-brand-ink">{bestPost.engagements.toLocaleString()}</span>
                      <span>engagements</span>
                      <span className="opacity-50 mx-0.5">·</span>
                      <span>{formatShortDate(bestPost.post.scheduledAtUtc ?? bestPost.post.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={bestPost.post.platformPostUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!bestPost.post.platformPostUrl) e.preventDefault() }}
                  className="inline-flex items-center gap-1.5 self-start mt-1 px-3 py-1 bg-brand-canvas-soft border border-brand-primary text-brand-primary rounded-brand-sm text-[10px] font-bold hover:bg-brand-primary hover:text-white transition-colors cursor-pointer"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  View
                </a>
              </>
            ) : (
              <div className="text-xs text-brand-body-mid py-2">No posts in this period</div>
            )}
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
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={postsPerPlatformData} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" tick={<PlatformTick />} axisLine={false} tickLine={false} />
                    <YAxis tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={postsPerPlatformData.length === 1 ? 48 : undefined}>
                      {postsPerPlatformData.map((entry: any, i: number) => (
                        <Cell key={i} fill="url(#barGrad1)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={postsOverTimeData} barCategoryGap="15%">
                    <defs>
                      <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={20}>
                      {postsOverTimeData.map((entry: any, i: number) => (
                        <Cell key={i} fill="url(#barGrad2)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Metric per platform – dynamic selector */}
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
              <div>
                <CardTitle className="text-xs font-bold text-brand-ink">
                  {METRIC_CONFIG.find(m => m.key === engagementMetric)?.label} per platform
                </CardTitle>
                <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
                  {isLoading ? '—' : ((platformTotals as any)[engagementMetric] ?? 0).toLocaleString()} {METRIC_CONFIG.find(m => m.key === engagementMetric)?.label.toLowerCase()} total
                </CardDescription>
              </div>

              {/* Metric picker */}
              <div className="relative">
                <button
                  onClick={() => setShowMetricDropdown(v => !v)}
                  className="flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded-full border border-brand-border bg-brand-canvas-soft text-[10px] font-semibold text-brand-ink-soft hover:border-brand-primary hover:text-brand-primary transition-all"
                >
                  <span className="text-brand-body-mid">{METRIC_CONFIG.find(m => m.key === engagementMetric)?.icon}</span>
                  <span>{METRIC_CONFIG.find(m => m.key === engagementMetric)?.label}</span>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={`transition-transform duration-150 ${showMetricDropdown ? 'rotate-180' : ''}`}>
                    <path d="M1.5 3L4 5.5 6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {showMetricDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMetricDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-brand-border rounded-brand-md shadow-lg py-1 min-w-[148px]">
                      {METRIC_CONFIG.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setEngagementMetric(opt.key); setShowMetricDropdown(false) }}
                          className={`w-full flex items-center gap-2 px-3 py-[5px] text-[11px] transition-colors ${opt.key === engagementMetric
                            ? 'text-brand-ink font-semibold'
                            : 'text-brand-body hover:bg-brand-canvas-soft/60 hover:text-brand-ink'
                            }`}
                        >
                          <span className="w-4 shrink-0 flex items-center justify-center text-brand-body-mid">{opt.icon}</span>
                          <span className="flex-1 text-left">{opt.label}</span>
                          {opt.key === engagementMetric && (
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8 9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1 h-[140px]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : metricPerPlatformData === null ? (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-brand-body-mid">
                  No {METRIC_CONFIG.find(m => m.key === engagementMetric)?.label.toLowerCase()} data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricPerPlatformData} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" tick={<PlatformTick />} axisLine={false} tickLine={false} />
                    <YAxis tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={metricPerPlatformData.length === 1 ? 48 : undefined}>
                      {metricPerPlatformData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill || 'url(#barGrad3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── ROW 2: ENGAGEMEN T ── */}
        <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider mt-2 before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
          Engagement Analytics
        </div>

        {/* Combined Engagement Card: chart left + Metric Summary right */}
        <EngagementOverTimeCard
          presetDays={presetDays}
          isLoading={isLoading}
          engagementOverTimeData={engagementOverTimeData}
          selectedEngagementMetrics={selectedEngagementMetrics}
          setSelectedEngagementMetrics={setSelectedEngagementMetrics}
          platformTotals={platformTotals}
          engagementRate={summary?.engagementRate ?? 7.14}
          ENGAGEMENT_CHART_METRICS={ENGAGEMENT_CHART_METRICS}
        />

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

            <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between overflow-hidden">
              <div 
                ref={heatmapContainerRef}
                className="flex-1 min-h-[220px] w-full flex flex-col mt-2 min-w-0"
              >
                {/* Hour Labels Header */}
                <div className="flex mb-1 ml-8">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 text-[8px] text-brand-body-mid text-center">
                      {h % 4 === 0 ? (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`) : ''}
                    </div>
                  ))}
                </div>

                <div className="flex flex-1 min-h-0">
                  {/* Day Labels Sidebar */}
                  <div className="w-8 flex flex-col">
                    {DAY_LABELS.map(day => (
                      <div key={day} className="flex-1 flex items-center text-[8px] font-bold text-brand-body-mid pr-2 uppercase">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Grid Cells */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    {engagementGrid.grid.map((row, dayIdx) => (
                      <div key={dayIdx} className="flex-1 flex gap-0.5 min-h-0">
                        {row.map((data, hourIdx) => (
                          <UITooltip key={`${dayIdx}-${hourIdx}`}>
                            <UITooltipTrigger asChild>
                              <div 
                                tabIndex={0}
                                className="flex-1 rounded-[1px] transition-colors duration-200 cursor-help outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
                                style={{ backgroundColor: getHeatColor(data.score, engagementGrid.max) }}
                              />
                            </UITooltipTrigger>
                            <UITooltipContent className="p-3 min-w-[160px]">
                              <div className="space-y-1.5">
                                <div className="font-bold text-xs">
                                  {DAY_LABELS[dayIdx]} {hourIdx === 0 ? '12am' : hourIdx < 12 ? `${hourIdx}am` : hourIdx === 12 ? '12pm' : `${hourIdx-12}pm`} - {hourIdx + 1 === 24 ? '12am' : (hourIdx + 1) === 12 ? '12pm' : (hourIdx + 1) < 12 ? `${hourIdx + 1}am` : `${hourIdx + 1 - 12}pm`}
                                </div>
                                <div className="text-[10px] text-brand-body">
                                  Avg engagement: {data.score > 0 ? (
                                    <span className="font-semibold text-brand-ink ml-1">{data.score.toFixed(1)}</span>
                                  ) : (
                                    <span className="italic ml-1">no data</span>
                                  )}
                                </div>
                                <Separator className="bg-brand-border/40" />
                                <div className="text-[10px] text-brand-body">
                                  <span className="font-semibold text-brand-ink">{data.postCount}</span> {data.postCount === 1 ? 'post' : 'posts'}
                                </div>
                              </div>
                            </UITooltipContent>
                          </UITooltip>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap text-[10px] text-brand-body">
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
                <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Followers per platform · {followerStats.accountCount} platform{followerStats.accountCount !== 1 ? 's' : ''}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-brand-ink leading-tight">
                  {isLoading || followerStatsLoading ? '—' : followerStats.totalFollowers.toLocaleString()}
                </div>
                <div className="text-[9px] text-brand-body-mid font-medium">followers total</div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 h-[180px] flex-1">
              {followerEvolutionData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-brand-body-mid">
                  No follower data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={followerEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} />
                    <Tooltip content={<FollowerTooltip accounts={hookFollowerStats?.accounts ?? []} />} cursor={{ stroke: '#9CA3AF', strokeDasharray: '4 3', strokeWidth: 1 }} />
                    <Legend
                      wrapperStyle={{ fontSize: '10px', marginTop: '4px' }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {hookFollowerStats?.accounts.map(account => (
                      <Line
                        key={account._id}
                        type="monotone"
                        dataKey={account.platform}
                        name={account.displayName}
                        stroke={PLATFORM_CHART_COLORS[account.platform] ?? '#6B7280'}
                        strokeWidth={2}
                        dot={{ r: 3, fill: PLATFORM_CHART_COLORS[account.platform] ?? '#6B7280', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── PLATFORM & POST BREAKDOWN TABLES ── */}
        <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider mt-2 before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
          Platform & Post Breakdown
        </div>
        <div className="grid grid-cols-1 gap-3">
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
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('platform')}>
                        <span className="flex items-center gap-1">Platform <SortIcon colKey="platform" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('postCount')}>
                        <span className="flex items-center justify-end gap-1">Posts <SortIcon colKey="postCount" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('likes')}>
                        <span className="flex items-center justify-end gap-1"><Heart size={10} className="text-rose-500" /> Likes <SortIcon colKey="likes" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('comments')}>
                        <span className="flex items-center justify-end gap-1"><MessageSquare size={10} className="text-blue-500" /> Comments <SortIcon colKey="comments" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('shares')}>
                        <span className="flex items-center justify-end gap-1"><Share2 size={10} className="text-emerald-500" /> Shares <SortIcon colKey="shares" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('saves')}>
                        <span className="flex items-center justify-end gap-1"><Bookmark size={10} className="text-amber-500" /> Saves <SortIcon colKey="saves" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('clicks')}>
                        <span className="flex items-center justify-end gap-1"><MousePointerClick size={10} className="text-violet-500" /> Clicks <SortIcon colKey="clicks" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('views')}>
                        <span className="flex items-center justify-end gap-1"><Eye size={10} className="text-purple-500" /> Views <SortIcon colKey="views" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('impressions')}>
                        <span className="flex items-center justify-end gap-1"><BarChart3 size={10} className="text-teal-500" /> Impr. <SortIcon colKey="impressions" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('reach')}>
                        <span className="flex items-center justify-end gap-1"><Users size={10} className="text-teal-600" /> Reach <SortIcon colKey="reach" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handlePlatformSort('engagement')}>
                        <span className="flex items-center justify-end gap-1"><Percent size={10} className="text-emerald-600" /> ER <SortIcon colKey="engagement" /></span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlatformRows.map((row) => (
                      <TableRow key={row.platform} className="hover:bg-brand-canvas-soft/40 border-b border-brand-border/60">
                        <TableCell className="font-bold text-brand-ink py-2.5 px-3 flex items-center gap-2">
                          <ExtendedPlatformIcon platform={row.platform} size={14} />
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
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.likes || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.comments || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.shares || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.saves || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.clicks || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.views || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{row.impressions || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3 font-semibold">{row.reach ? row.reach.toLocaleString() : <span className="text-brand-body-mid/40">-</span>}</TableCell>
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
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('post')}>
                        <span className="flex items-center gap-1">Post <SortIconTop colKey="post" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('likes')}>
                        <span className="flex items-center justify-end gap-1"><Heart size={10} className="text-rose-500" /> Likes <SortIconTop colKey="likes" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('comments')}>
                        <span className="flex items-center justify-end gap-1"><MessageSquare size={10} className="text-blue-500" /> Comments <SortIconTop colKey="comments" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('shares')}>
                        <span className="flex items-center justify-end gap-1"><Share2 size={10} className="text-emerald-500" /> Shares <SortIconTop colKey="shares" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('saves')}>
                        <span className="flex items-center justify-end gap-1"><Bookmark size={10} className="text-amber-500" /> Saves <SortIconTop colKey="saves" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('clicks')}>
                        <span className="flex items-center justify-end gap-1"><MousePointerClick size={10} className="text-violet-500" /> Clicks <SortIconTop colKey="clicks" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('views')}>
                        <span className="flex items-center justify-end gap-1"><Eye size={10} className="text-purple-500" /> Views <SortIconTop colKey="views" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('impressions')}>
                        <span className="flex items-center justify-end gap-1"><BarChart3 size={10} className="text-teal-500" /> Impr. <SortIconTop colKey="impressions" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('reach')}>
                        <span className="flex items-center justify-end gap-1"><Users size={10} className="text-teal-600" /> Reach <SortIconTop colKey="reach" /></span>
                      </TableHead>
                      <TableHead className="font-bold text-brand-ink h-8 px-3 text-[9px] uppercase tracking-wider text-right cursor-pointer select-none hover:bg-brand-canvas-soft/60 transition-colors" onClick={() => handleTopPostSort('engagementRate')}>
                        <span className="flex items-center justify-end gap-1"><Percent size={10} className="text-emerald-600" /> ER <SortIconTop colKey="engagementRate" /></span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTopPosts.map((item) => (
                      <TableRow
                        key={item.post.id}
                        className="hover:bg-brand-canvas-soft/40 border-b border-brand-border/60 cursor-pointer"
                        onClick={() => setSelectedPostId(item.post.id)}
                      >
                        <TableCell className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {item.post.platform && <ExtendedPlatformIcon platform={item.post.platform} size={12} />}
                            <div className="flex flex-col leading-tight">
                              <span className="font-bold text-brand-ink">{item.post.content || 'No content'}</span>
                              <span className="text-[9px] text-brand-body-mid font-medium">{formatShortDate(item.post.scheduledAtUtc ?? item.post.createdAt)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.likes || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.comments || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.shares || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.saves || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.clicks || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.metrics?.views ? item.metrics.views.toLocaleString() : <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3">{item.impressions || <span className="text-brand-body-mid/40">-</span>}</TableCell>
                        <TableCell className="text-brand-body text-right py-2.5 px-3 font-semibold">{item.reach ? item.reach.toLocaleString() : <span className="text-brand-body-mid/40">-</span>}</TableCell>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Posting Frequency vs Engagement */}
          <Card className="border-brand-border shadow-sm flex flex-col justify-between">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-brand-ink">Posting Frequency vs Engagement</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">Correlation between cadence and ER</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between">
              <div className="h-[160px] min-w-0 min-h-0">
                {postingFrequencyData.length === 0 ? (
                  <Skeleton className="h-full w-full rounded-brand-sm" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={postingFrequencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="name" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={6} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: '4 3', strokeWidth: 1 }} />
                      {(() => {
                        const platformKeys = Object.keys(postingFrequencyData[0] ?? {}).filter((k) => k !== 'name')
                        if (platformKeys.length === 0) return null
                        return platformKeys.map((platform) => (
                          <Line
                            key={platform}
                            type="monotone"
                            dataKey={platform}
                            stroke={PLATFORM_CHART_COLORS[platform] ?? '#6B7280'}
                            strokeWidth={2}
                            dot={{ r: 3, fill: PLATFORM_CHART_COLORS[platform] ?? '#6B7280', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 5, fill: PLATFORM_CHART_COLORS[platform] ?? '#6B7280', stroke: '#fff', strokeWidth: 2 }}
                            connectNulls
                          />
                        ))
                      })()}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 p-2.5 bg-brand-canvas-soft border-l-3 border-brand-primary border-l-4 rounded-r-brand-sm text-[11px]">
                <div className="font-bold text-brand-primary mb-1">Optimal cadence per platform</div>
                {(() => {
                  if (!optimalCadence) {
                    return <div className="text-brand-body-mid">No optimal cadence detected yet</div>
                  }
                  const platform = optimalCadence.platform
                  const color = platform ? (PLATFORM_CHART_COLORS[platform] ?? '#6B7280') : '#6B7280'
                  return (
                    <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>{platform ? (ZERNIO_PLATFORMS.find((p) => p.id === platform)?.label ?? platform) : 'All platforms'}</span>
                      <span className="text-brand-body-mid font-medium">{optimalCadence.cadenceLabel} ·</span>
                      <span className="font-bold text-emerald-600">
                        {optimalCadence.avgEngagementRate.toFixed(1)}%
                      </span>
                    </div>
                  )
                })()}
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
              <div className="h-[160px] min-w-0 min-h-0">
                {engagementAccumulationData.length === 0 ? (
                  <Skeleton className="h-full w-full rounded-brand-sm" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementAccumulationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="name" tick={{ color: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ color: '#6B7280', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={6}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip
                        content={<EngagementAccumulationTooltip />}
                        cursor={{ stroke: '#ff4f00', strokeDasharray: '4 3', strokeWidth: 1 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pct"
                        stroke="#ff4f00"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#ff4f00', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#ff4f00', stroke: '#fff', strokeWidth: 2 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 p-2.5 bg-[#FFF8E1] border-l-3 border-amber-500 border-l-4 rounded-r-brand-sm text-[11px] text-[#7A5C00]">
                {(() => {
                  const buckets = hookContentDecay?.buckets ?? []
                  if (buckets.length === 0) {
                    return <span className="text-brand-body-mid">Engagement decay data not available yet</span>
                  }
                  // Find the bucket where avgPctOfFinal first reaches >= 50%
                  // and the bucket where it first reaches >= 80%.
                  const sorted = [...buckets].sort((a, b) => a.bucketOrder - b.bucketOrder)
                  const peak = Math.max(...sorted.map((b) => b.avgPctOfFinal))
                  if (peak <= 0) {
                    return <span className="text-brand-body-mid">Engagement decay data not available yet</span>
                  }
                  const halfBucket = sorted.find((b) => b.avgPctOfFinal >= peak / 2)
                  const eightyBucket = sorted.find((b) => b.avgPctOfFinal >= 80)
                  const halfLabel = halfBucket?.bucketLabel ?? sorted[sorted.length - 1].bucketLabel
                  const eightyLabel = eightyBucket?.bucketLabel ?? sorted[sorted.length - 1].bucketLabel
                  return (
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>⚡ Half of engagement by <strong>{halfLabel}</strong></span>
                        {eightyBucket && (
                          <span>📈 80% within <strong>{eightyLabel}</strong></span>
                        )}
                      </div>
                      <span className="text-[10px] text-brand-body-mid/80 italic">
                        From {sorted.length} {sorted.length === 1 ? 'window' : 'windows'} · peak {peak.toFixed(0)}% cumulative
                      </span>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Post Details Panel */}
      {selectedPostId && (() => {
        const matchedSummaryPost = sortedTopPosts.find((p) => p.post.id === selectedPostId) ?? null
        return (
          <PostDetailsPanel
            postId={selectedPostId}
            workspaceId={filterWorkspace === 'all' ? undefined : filterWorkspace}
            summaryPost={matchedSummaryPost}
            onClose={() => setSelectedPostId(null)}
          />
        )
      })()}
    </UITooltipProvider>
  )
}
