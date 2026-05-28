import { useMemo, useState } from 'react'
import { BarChart3, Users, Eye, Heart, Calendar, ChevronDown, Check, RefreshCw, ExternalLink, Lock, AlertTriangle } from 'lucide-react'
import CountingNumber from '../../components/CountingNumber'
import Heatmap from '../../components/Heatmap'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAnalyticsSummary } from '../../hooks/useAnalyticsSummary'
import styles from './AnalyticsPage.module.css'

const DEFAULT_BARS = [45, 60, 38, 85, 52, 90, 68]

const PRESET_LABELS: Record<7 | 30 | 90, string> = {
  7: 'Last 7 days',
  30: 'Last 30 days',
  90: 'Last 90 days',
}

const PLATFORM_OPTIONS = [
  { label: 'All Platforms', value: '' },
  ...ZERNIO_PLATFORMS.map(p => ({ label: p.label, value: p.id })),
]

/** Banner for billing gate (402 / analytics_addon_required 403) */
function BillingGateBanner({ error, onDismiss }: { error: { message: string; dashboardUrl?: string }; onDismiss: () => void }) {
  return (
    <div className={styles.errorBanner} data-testid="billing-gate-banner">
      <div className={styles.bannerContent}>
        <Lock size={16} className={styles.bannerIcon} />
        <div className={styles.bannerText}>
          <strong>Analytics Add-on Required</strong>
          <p>{error.message}</p>
        </div>
      </div>
      <div className={styles.bannerActions}>
        {error.dashboardUrl && (
          <a
            href={error.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.bannerLink}
          >
            Upgrade Plan <ExternalLink size={12} />
          </a>
        )}
        <button type="button" className={styles.bannerDismiss} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

/** Banner for scope reauthorization (412) */
function ReauthorizeBanner({ error, onDismiss }: { error: { message: string; reauthorizeUrl?: string; platform?: string }; onDismiss: () => void }) {
  return (
    <div className={styles.reauthBanner} data-testid="reauth-banner">
      <div className={styles.bannerContent}>
        <AlertTriangle size={16} className={styles.bannerIcon} />
        <div className={styles.bannerText}>
          <strong>Re-authorization Required{error.platform ? ` — ${error.platform}` : ''}</strong>
          <p>{error.message}</p>
        </div>
      </div>
      <div className={styles.bannerActions}>
        {error.reauthorizeUrl && (
          <a
            href={error.reauthorizeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.bannerLink}
          >
            Re-authorize <ExternalLink size={12} />
          </a>
        )}
        <button type="button" className={styles.bannerDismiss} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace()
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [dismissedBilling, setDismissedBilling] = useState(false)
  const [dismissedReauth, setDismissedReauth] = useState(false)

  const {
    presetDays,
    setPresetDays,
    rangeLabel,
    summary,
    heatmap,
    isLoading,
    isFetching,
    isError,
    isBillingGateError,
    isScopeError,
    analyticsError,
    heatmapPlatform,
    setHeatmapPlatform,
    refresh,
  } = useAnalyticsSummary({ workspaceId: activeWorkspace?.id })

  const weeklyBars = useMemo(() => {
    const weeklyReach = summary?.weeklyReach ?? []
    if (weeklyReach.length === 0) return DEFAULT_BARS

    const maxReach = weeklyReach.reduce((max, item) => Math.max(max, item.reach), 0)
    if (maxReach <= 0) return weeklyReach.map(() => 8)

    return weeklyReach.map((item) => Math.max(6, Math.round((item.reach / maxReach) * 100)))
  }, [summary])

  const metrics = [
    {
      icon: <Eye size={18} />,
      label: 'Total Reach',
      value: summary?.totalReach ?? 0,
      delta: '+24%',
      color: 'var(--purple-500)',
      format: (v: number) => `${(v / 1000).toFixed(1)}K`,
    },
    {
      icon: <Heart size={18} />,
      label: 'Avg. Engagement',
      value: Number((summary?.engagementRate ?? 0).toFixed(2)),
      delta: '+11%',
      color: 'var(--pink-500)',
      format: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      icon: <Users size={18} />,
      label: 'Follower Growth',
      value: summary?.followerGrowth ?? 0,
      delta: 'this period',
      color: 'var(--cyan-400)',
      format: (v: number) => `+${v.toLocaleString()}`,
    },
    {
      icon: <BarChart3 size={18} />,
      label: 'Total Posts',
      value: summary?.totalPosts ?? 0,
      delta: 'across workspace',
      color: 'var(--accent-amber, #f59e0b)',
      format: (v: number) => v.toString(),
    },
  ]

  const showBillingGate = isBillingGateError && analyticsError && !dismissedBilling
  const showReauth = isScopeError && analyticsError && !dismissedReauth

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>View post performance metrics</p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={refresh}
            disabled={isFetching}
            data-testid="refresh-analytics-btn"
          >
            <RefreshCw size={14} className={isFetching ? styles.refreshSpinning : ''} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterBtn}>
            All platforms <ChevronDown size={12} />
          </button>
          <button type="button" className={styles.filterBtn}>
            All profiles <ChevronDown size={12} />
          </button>
          <button type="button" className={styles.filterBtn}>
            All sources <ChevronDown size={12} />
          </button>
          <div className={styles.presetWrap}>
            <button
              type="button"
              className={styles.filterBtn}
              onClick={() => setShowPresetDropdown((v) => !v)}
            >
              <Calendar size={12} />
              {PRESET_LABELS[presetDays]}
              <ChevronDown size={12} />
            </button>

            {showPresetDropdown && (
              <div className={`${styles.dropdown} ${styles.presetDropdown}`}>
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={styles.presetOption}
                    onClick={() => {
                      setPresetDays(days)
                      setShowPresetDropdown(false)
                    }}
                  >
                    {presetDays === days && <Check size={14} color="var(--analytics-ink)" />}
                    <span>{PRESET_LABELS[days]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className={styles.filterBtn}>
            Newest first <ChevronDown size={12} />
          </button>
        </div>
        <div className={styles.syncInfo}>
          <span>Last sync: 46m ago</span>
          <span>Next sync: in 14m</span>
          <span className={styles.rangeLabel}>{rangeLabel}</span>
        </div>
      </div>

      {/* Billing gate banner */}
      {showBillingGate && (
        <BillingGateBanner
          error={{ message: analyticsError.message, dashboardUrl: analyticsError.dashboardUrl }}
          onDismiss={() => setDismissedBilling(true)}
        />
      )}

      {/* Reauthorization banner */}
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

      {/* Generic error banner for non-billing/non-scope errors */}
      {isError && !isBillingGateError && !isScopeError && (
        <div className={styles.genErrorBanner} data-testid="generic-error-banner">
          <AlertTriangle size={16} />
          <span>Could not load analytics data. Please try again later.</span>
          <button type="button" className={styles.retryBtn} onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* Top metrics */}
      <div className={styles.metricsRow}>
        {metrics.map(m => (
          <div key={m.label} className={`${styles.card} ${styles.metricCard}`}>
            <div className={styles.metricIcon} style={{ color: m.color, background: `${m.color}18` }}>{m.icon}</div>
            <div className={styles.metricValue}>
              {isLoading ? <SkeletonLoader height="28px" /> : <CountingNumber value={m.value} format={m.format} />}
            </div>
            <div className={styles.metricLabel}>{m.label}</div>
            <div className={styles.metricDelta} style={{ color: m.delta.startsWith('+') ? '#22c55e' : m.color }}>
              {isLoading ? <SkeletonLoader height="14px" width="80px" /> : m.delta}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.row2}>
        {/* Weekly chart */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Reach theo tuần</h2>
            <span className={styles.cardSub}>{PRESET_LABELS[presetDays]}</span>
          </div>
          <div className={styles.chartWrap}>
            <div className={styles.bars}>
              {weeklyBars.map((h, i) => (
                <div key={i} className={styles.barWrap}>
                  <div className={styles.barVal}>{isLoading ? '—' : `${Math.round(h * 1.5)}K`}</div>
                  <div className={styles.bar} style={{ height: isLoading ? `${40 + (i % 4) * 10}%` : `${h}%` }} />
                  <span className={styles.barDay}>{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className={`${styles.card} ${styles.insightCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>✨ AI Insights</h2>
            <span className={styles.cardSub}>Gợi ý cải thiện</span>
          </div>
          <div className={styles.insightList}>
            <div className={styles.insightItem} style={{ justifyContent: 'center', padding: '1rem' }}>
              <p className={styles.insightText} style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                AI insights will appear here once enough data has been collected from your connected accounts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Best Time to Post Heatmap */}
      <div className={`${styles.card} ${styles.heatmapCard}`}>
        <div className={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className={styles.cardTitle}>📅 Giờ vàng đăng bài</h2>
            <div className={styles.platformFilterWrap}>
              <button
                type="button"
                className={styles.platformFilterBtn}
                onClick={() => setShowPlatformDropdown((v) => !v)}
                data-testid="heatmap-platform-filter"
              >
                {PLATFORM_OPTIONS.find(p => p.value === (heatmapPlatform ?? ''))?.label ?? 'All Platforms'}
                <ChevronDown size={12} />
              </button>
              {showPlatformDropdown && (
                <div className={`${styles.dropdown} ${styles.platformFilterDropdown}`}>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={styles.platformFilterOption}
                      onClick={() => {
                        setHeatmapPlatform(opt.value || undefined)
                        setShowPlatformDropdown(false)
                      }}
                    >
                      {heatmapPlatform === (opt.value || undefined) && <Check size={12} color="var(--purple-300)" />}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className={styles.cardSub}>Phân tích dựa trên tương tác của audience</span>
        </div>
        {isLoading ? <SkeletonLoader height="210px" /> : <Heatmap slots={heatmap?.slots ?? []} />}
        <div className={styles.heatmapLegend}>
          <span>Less active</span>
          <div className={styles.legendBar} />
          <span>Most active</span>
        </div>
      </div>

      {/* Platform breakdown */}
      <div className={`${styles.card} ${styles.tableCard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Hiệu suất từng nền tảng</h2>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <BarChart3 size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            Per-platform analytics will appear here once your accounts are connected and have published content.
          </p>
        </div>
      </div>
    </div>
  )
}
