import { cn } from "@/lib/utils"
import { ExtendedPlatformIcon } from "@/components/create-post/platformIcons"
import type { CSSProperties, ReactNode } from "react"

export interface WeekRange {
  weekStart: Date
  weekEnd: Date
}

export interface MetricDef {
  key: string
  label: string
  color: string
  icon?: ReactNode
  yAxis?: string
}

export interface EngagementChartTooltipProps {
  visible: boolean
  dataIndex: number
  labels: string[]
  raw: Record<string, number[]>
  weekRanges: WeekRange[]
  metrics: MetricDef[]
  /** Which metrics are currently toggled on (visible in chart) */
  activeMetrics?: Set<string>
  /** Platform names present in each weekly bucket */
  weekPlatforms?: string[][]
  style?: CSSProperties
}

const METRIC_ICONS: Record<string, string> = {
  likes: "❤️",
  comments: "💬",
  shares: "🔁",
  saves: "🔖",
  views: "👁",
  impressions: "📈",
  reach: "👥",
  clicks: "🖱",
}

function fmtMonthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fmtYear(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric" })
}

function fmtWeekRange(range: WeekRange | undefined, fallbackLabel: string): string {
  if (!range) return fallbackLabel
  const startStr = fmtMonthDay(range.weekStart)
  const endStr = fmtMonthDay(range.weekEnd)
  const year = fmtYear(range.weekEnd)
  return `${startStr} – ${endStr}, ${year}`
}

export function EngagementChartTooltip({
  visible,
  dataIndex,
  labels,
  raw,
  weekRanges,
  metrics,
  activeMetrics,
  weekPlatforms,
  style,
}: EngagementChartTooltipProps) {
  const weekRange = weekRanges?.[dataIndex]
  const headerLabel = fmtWeekRange(weekRange, labels[dataIndex] ?? "")
  const weekPosts = raw["posts"]?.[dataIndex] ?? 0

  // Only show metrics that are currently toggled on (if activeMetrics is provided)
  const visibleMetrics = activeMetrics
    ? metrics.filter((m) => activeMetrics.has(m.key))
    : metrics

  // Platforms for this specific week bucket
  const platforms = weekPlatforms?.[dataIndex] ?? []

  return (
    <div
      style={style}
      className={cn(
        "absolute z-50 w-[244px] rounded-brand-md border border-brand-border/80 bg-white",
        "shadow-[0_12px_32px_rgba(15,23,42,0.14)] font-body",
        "transition-[opacity,transform] duration-150 ease-out origin-top-left",
        "will-change-transform",
        visible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none",
      )}
    >
      <div className="p-3 pb-0">
        {/* Week range header */}
        <div className="text-[11px] font-semibold text-brand-ink pb-2.5 mb-2 border-b border-brand-border/70 tracking-normal leading-tight">
          {headerLabel}
        </div>

        {/* Platforms section */}
        {platforms.length > 0 && (
          <div className="mb-2 pb-2 border-b border-brand-border/50">
            <div className="text-[9px] font-bold text-brand-body-mid uppercase tracking-wider mb-1">
              Platforms
            </div>
            <div className="flex flex-col gap-0.5">
              {platforms.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1.5 text-[10.5px] font-medium text-brand-body leading-tight"
                >
                  <ExtendedPlatformIcon platform={p.toLowerCase()} size={12} />
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics rows — only show currently active ones */}
        <div className="flex flex-col gap-1">
          {visibleMetrics.map((m) => {
            const val = raw[m.key]?.[dataIndex] ?? 0
            return (
              <div
                key={m.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium text-brand-body whitespace-nowrap leading-tight">
                  <span aria-hidden="true" className="w-3 text-[10px] leading-none">
                    {METRIC_ICONS[m.key]}
                  </span>
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: m.color }}
                  />
                  <span className="truncate" style={{ color: m.color }}>
                    {m.label}
                  </span>
                </span>
                <span className="font-semibold text-brand-ink text-[10.5px] tabular-nums leading-tight min-w-[44px] text-right">
                  {val.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Post count footer */}
      <div className="px-3 pb-3 pt-2.5 mt-2.5 border-t border-brand-border/70">
        <span className="text-[10.5px] text-brand-body-mid font-medium">
          {weekPosts} post{weekPosts !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
