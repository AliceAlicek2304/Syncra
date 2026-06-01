import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Users, Eye, Heart, Calendar, ChevronDown, Check, RefreshCw, ExternalLink, Lock, AlertTriangle, TrendingUp } from 'lucide-react'
import CountingNumber from '../../components/CountingNumber'
import Heatmap from '../../components/Heatmap'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAnalyticsSummary } from '../../hooks/useAnalyticsSummary'
import { analyticsApi } from '../../api/analytics'
import { postsApi, type Post } from '../../api/posts'
import styles from './AnalyticsPage.module.css'

const PRESET_LABELS: Record<7 | 30 | 90, string> = {
  7: 'Last 7 days',
  30: 'Last 30 days',
  90: 'Last 90 days',
}

const PLATFORM_OPTIONS = [
  { label: 'All Platforms', value: '' },
  ...ZERNIO_PLATFORMS.map(p => ({ label: p.label, value: p.id })),
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const formatShortDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

  const workspaceId = activeWorkspace?.id
  const topPostsQuery = useQuery({
    queryKey: ['analytics-top-posts', workspaceId, presetDays],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!workspaceId) return [] as { post: Post; metrics: Awaited<ReturnType<typeof analyticsApi.getPostAnalytics>> | null }[]
      const posts = await postsApi.getPosts(workspaceId, { status: 'published', pageSize: 8 })
      if (posts.items.length === 0) return []

      const metrics = await Promise.all(
        posts.items.map(async (post) => {
          try {
            const data = await analyticsApi.getPostAnalytics(workspaceId, post.id, presetDays)
            return { post, metrics: data }
          } catch {
            return { post, metrics: null }
          }
        })
      )

      return metrics
    },
  })

  const platformTotals = useMemo(() => {
    const breakdown = summary?.platformBreakdown ?? []
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
  }, [summary])

  const topPosts = useMemo(() => {
    const items = topPostsQuery.data ?? []
    const scored = items
      .filter(item => item.metrics && !item.metrics.isSyncPending)
      .map(item => ({
        ...item,
        engagementRate: Number(item.metrics?.engagementRate ?? 0),
        engagements: item.metrics?.engagements ?? 0,
      }))

    return scored
      .sort((a, b) => (b.engagementRate - a.engagementRate) || (b.engagements - a.engagements))
      .slice(0, 3)
  }, [topPostsQuery.data])

  const postDetails = useMemo(() => {
    return (topPostsQuery.data ?? []).slice(0, 4)
  }, [topPostsQuery.data])

  const highlightMetrics = [
    {
      id: 'likes',
      label: 'Likes',
      value: platformTotals.likes,
      color: 'var(--analytics-accent)',
    },
    {
      id: 'comments',
      label: 'Comments',
      value: platformTotals.comments,
      color: '#1b7f5a',
    },
    {
      id: 'shares',
      label: 'Shares',
      value: platformTotals.shares,
      color: '#0f4c81',
    },
    {
      id: 'saves',
      label: 'Saves',
      value: platformTotals.saves,
      color: '#9b6b1d',
    },
    {
      id: 'views',
      label: 'Views',
      value: platformTotals.views,
      color: '#6d4b8c',
    },
    {
      id: 'impressions',
      label: 'Impressions',
      value: platformTotals.impressions,
      color: '#4b4b4b',
    },
    {
      id: 'reach',
      label: 'Reach',
      value: platformTotals.reach,
      color: '#2f2a26',
    },
    {
      id: 'clicks',
      label: 'Clicks',
      value: platformTotals.clicks,
      color: '#434037',
    },
  ]

  const platformLabelMap = useMemo(() => {
    return new Map(ZERNIO_PLATFORMS.map(p => [p.id, p.label]))
  }, [])

  const platformRows = useMemo(() => {
    const rows = summary?.platformBreakdown ?? []
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
  }, [summary, platformLabelMap])

  const bestSlots = useMemo(() => {
    const slots = heatmap?.slots ?? []
    const sorted = [...slots].sort((a, b) => b.score - a.score)
    return sorted.slice(0, 3)
  }, [heatmap])

  const reachTrend = useMemo(() => {
    const weeklyReach = summary?.weeklyReach ?? []
    if (weeklyReach.length === 0) return [] as number[]
    return weeklyReach.map((item) => item.reach)
  }, [summary])

  const sparklinePoints = useMemo(() => {
    if (reachTrend.length === 0) return ''
    const width = 220
    const height = 72
    const padding = 8
    const max = Math.max(...reachTrend, 1)
    return reachTrend
      .map((value, index) => {
        const x = padding + (index / Math.max(1, reachTrend.length - 1)) * (width - padding * 2)
        const y = height - padding - (value / max) * (height - padding * 2)
        return `${x},${y}`
      })
      .join(' ')
  }, [reachTrend])

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

      {/* Overview row */}
      <div className={styles.overviewGrid}>
        <div className={`${styles.card} ${styles.heatmapCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrap}>
              <h2 className={styles.cardTitle}>Activity Heatmap</h2>
              <span className={styles.cardSub}>Last {presetDays} days</span>
            </div>
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
                      {heatmapPlatform === (opt.value || undefined) && <Check size={12} color="var(--analytics-ink)" />}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {isLoading ? <SkeletonLoader height="210px" /> : <Heatmap slots={heatmap?.slots ?? []} />}
          <div className={styles.heatmapLegend}>
            <span>Fewer</span>
            <div className={styles.legendBar} />
            <span>More</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.followerCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Total followers</h2>
            <span className={styles.cardSub}>{rangeLabel}</span>
          </div>
          <div className={styles.followerValue}>
            {isLoading ? <SkeletonLoader height="32px" width="120px" /> : (
              <CountingNumber value={summary?.totalReach ?? 0} format={(v) => v.toLocaleString()} />
            )}
          </div>
          <div className={styles.sparklineWrap}>
            {sparklinePoints ? (
              <svg viewBox="0 0 220 72" className={styles.sparkline} role="img" aria-label="Follower trend">
                <polyline points={sparklinePoints} className={styles.sparklinePath} />
              </svg>
            ) : (
              <div className={styles.sparklineEmpty}>No trend data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics + breakdown */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.card} ${styles.metricPanel}`}>
          <div className={styles.metricPanelHeader}>
            <h2 className={styles.cardTitle}>Core metrics</h2>
            <span className={styles.cardSub}>Workspace totals</span>
          </div>
          <div className={styles.metricTiles}>
            {highlightMetrics.map((metric) => (
              <div key={metric.id} className={styles.metricTile}>
                <div className={styles.metricCheck} style={{ borderColor: metric.color }}>
                  <Check size={12} color={metric.color} />
                </div>
                <div className={styles.metricMeta}>
                  <span className={styles.metricName}>{metric.label}</span>
                  <span className={styles.metricValueSmall}>
                    {isLoading ? '—' : metric.value.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            <div className={styles.metricSummary}>
              <div>
                <span className={styles.metricLabel}>Eng. Rate</span>
                <div className={styles.metricSummaryValue}>
                  {isLoading ? '—' : `${(summary?.engagementRate ?? 0).toFixed(1)}%`}
                </div>
              </div>
              <div>
                <span className={styles.metricLabel}>Total Posts</span>
                <div className={styles.metricSummaryValue}>
                  {isLoading ? '—' : (summary?.totalPosts ?? platformTotals.posts).toLocaleString()}
                </div>
              </div>
              <div>
                <span className={styles.metricLabel}>Follower Growth</span>
                <div className={styles.metricSummaryValue}>
                  {isLoading ? '—' : `+${(summary?.followerGrowth ?? 0).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Platform Breakdown</h2>
            <span className={styles.cardSub}>Engagement by channel</span>
          </div>
          {platformRows.length === 0 ? (
            <div className={styles.emptyState}>
              <BarChart3 size={28} />
              <p>Connect social accounts to unlock platform analytics.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Posts</th>
                    <th>Reach</th>
                    <th>Eng. Rate</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {platformRows.map((row) => (
                    <tr key={row.platform}>
                      <td className={styles.platformName}>
                        <span>{row.label}</span>
                        {row.requiresReauth && row.reauthorizeUrl && (
                          <a className={styles.reauthBadge} href={row.reauthorizeUrl} target="_blank" rel="noreferrer">
                            Reauth
                          </a>
                        )}
                      </td>
                      <td className={styles.posts}>{row.postCount}</td>
                      <td className={styles.reach}>{row.reach.toLocaleString()}</td>
                      <td className={styles.engagement}>{row.engagement.toFixed(1)}%</td>
                      <td className={styles.views}>{row.views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Best time + top posts */}
      <div className={styles.splitRow}>
        <div className={`${styles.card} ${styles.bestTimeCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Best Time to Post</h2>
            <span className={styles.cardSub}>Audience engagement peaks</span>
          </div>
          <div className={styles.bestTimeHeatmap}>
            {isLoading ? <SkeletonLoader height="140px" /> : <Heatmap slots={heatmap?.slots ?? []} />}
          </div>
          <div className={styles.bestTimeChips}>
            {bestSlots.length === 0 && <span className={styles.emptyHint}>No best-time data yet.</span>}
            {bestSlots.map((slot) => (
              <span key={`${slot.dayOfWeek}-${slot.hour}`} className={styles.bestChip}>
                {DAY_LABELS[slot.dayOfWeek]} {String(slot.hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>

        <div className={`${styles.card} ${styles.topPostsCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top Performing Posts</h2>
            <button type="button" className={styles.dropdownBtn}>
              <TrendingUp size={12} /> Engagement
              <ChevronDown size={12} />
            </button>
          </div>
          <div className={styles.topPostList}>
            {topPostsQuery.isLoading && <SkeletonLoader height="120px" />}
            {!topPostsQuery.isLoading && topPosts.length === 0 && (
              <div className={styles.emptyHint}>Top posts will appear once analytics sync completes.</div>
            )}
            {topPosts.map((item, index) => (
              <div key={item.post.id} className={styles.topPostItem}>
                <div className={styles.topPostRank}>{index + 1}</div>
                <div className={styles.topPostInfo}>
                  <span className={styles.topPostPlatform}>
                    {platformLabelMap.get(item.post.platforms?.[0] ?? '') ?? item.post.platforms?.[0] ?? 'Multi-platform'}
                  </span>
                  <span className={styles.topPostDate}>
                    {formatShortDate(item.post.scheduledAtUtc ?? item.post.createdAt)}
                  </span>
                </div>
                <span className={styles.topPostMetric}>ER {item.engagementRate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy insights */}
      <div className={styles.splitRow}>
        <div className={`${styles.card} ${styles.freqCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Posting Frequency vs Engagement</h2>
          </div>
          <div className={styles.freqChart}>
            {[
              { label: '1-2/wk', value: 18 },
              { label: '3-5/wk', value: 62 },
              { label: '6-10/wk', value: 26 },
              { label: '11+/wk', value: 32 },
            ].map((bar) => (
              <div key={bar.label} className={styles.freqBar}>
                <div className={styles.freqBarFill} style={{ height: `${bar.value}%` }} />
                <span>{bar.label}</span>
              </div>
            ))}
          </div>
          <p className={styles.freqNote}>
            Optimal: 3-5 posts/week based on current engagement curve.
          </p>
        </div>

        <div className={`${styles.card} ${styles.decayCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Content Performance Decay</h2>
            <span className={styles.cardSub}>How engagement accumulates after publish</span>
          </div>
          <svg viewBox="0 0 320 120" className={styles.decayChart} role="img" aria-label="Performance decay">
            <path d="M10,110 C30,50 60,30 90,30 C140,30 180,40 220,40 C250,40 280,35 310,30" className={styles.decayPath} />
            <path d="M10,110 C30,50 60,30 90,30 C140,30 180,40 220,40 C250,40 280,35 310,30 L310,110 Z" className={styles.decayFill} />
          </svg>
          <p className={styles.decayNote}>80% of engagement reached within 0-6h.</p>
        </div>
      </div>

      {/* Post details */}
      <div className={`${styles.card} ${styles.postDetailsCard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Post Details</h2>
          <span className={styles.cardSub}>Newest first</span>
        </div>
        <div className={styles.postGrid}>
          {postDetails.length === 0 && (
            <div className={styles.emptyHint}>No published posts yet.</div>
          )}
          {postDetails.map(({ post, metrics }) => (
            <div key={post.id} className={styles.postItem}>
              <div className={styles.postHeader}>
                <span className={styles.postTitle}>{post.title || 'Untitled post'}</span>
                <span className={styles.postMeta}>{formatShortDate(post.scheduledAtUtc ?? post.createdAt)}</span>
              </div>
              <div className={styles.postStats}>
                <span><Eye size={12} /> {metrics?.views ?? 0}</span>
                <span><Heart size={12} /> {metrics?.engagements ?? 0}</span>
                <span><Users size={12} /> {metrics?.impressions ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
