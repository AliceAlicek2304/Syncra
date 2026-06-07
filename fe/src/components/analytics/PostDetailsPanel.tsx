import { useEffect, useMemo, useState } from 'react'
import {
  X, ExternalLink, Loader2,
  Heart, MessageSquare, Share2, Bookmark, MousePointerClick,
  Eye, BarChart3, Users,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsApi, type ZernioPostAnalyticsDto, type ZernioPostTimelineItemDto } from '../../api/analytics'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'

export interface SummaryPostMetrics {
  post: {
    id: string
    scheduledAtUtc?: string
    createdAt?: string
    content?: string
    thumbnailUrl?: string
    platformPostUrl?: string
    platform?: string
  }
  metrics?: {
    syncPending?: boolean
    analytics?: any
    views?: number
    engagements?: number
  }
  engagementRate: number
  engagements: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  impressions: number
}

interface PostDetailsPanelProps {
  postId: string
  workspaceId?: string | null
  summaryPost?: SummaryPostMetrics | null
  onClose: () => void
}

export default function PostDetailsPanel({ postId, workspaceId, summaryPost, onClose }: PostDetailsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [postDetail, setPostDetail] = useState<ZernioPostAnalyticsDto | null>(null)
  const [timeline, setTimeline] = useState<ZernioPostTimelineItemDto[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    setError(null)

    Promise.all([
      analyticsApi.getPostAnalytics(workspaceId, postId, 30),
      analyticsApi.getPostTimeline(workspaceId, postId),
    ])
      .then(([detail, tl]) => {
        setPostDetail(detail)
        setTimeline(tl.timeline ?? [])
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load post details')
      })
      .finally(() => setLoading(false))
  }, [postId, workspaceId])

  const publishedDate = useMemo(() => {
    if (!postDetail?.publishedAt) return null
    const d = new Date(postDetail.publishedAt)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [postDetail?.publishedAt])

  const engagementData = useMemo(() => {
    const map = new Map<string, { date: string; comments: number; likes: number; saves: number; shares: number }>()
    for (const item of timeline) {
      const key = item.date
      const existing = map.get(key)
      if (existing) {
        existing.comments += item.comments
        existing.likes += item.likes
        existing.saves += item.saves
        existing.shares += item.shares
      } else {
        map.set(key, { date: key, comments: item.comments, likes: item.likes, saves: item.saves, shares: item.shares })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [timeline])

  const reachData = useMemo(() => {
    const map = new Map<string, { date: string; impressions: number; reach: number; views: number }>()
    for (const item of timeline) {
      const key = item.date
      const existing = map.get(key)
      if (existing) {
        existing.impressions += item.impressions
        existing.reach += item.reach
        existing.views += item.views
      } else {
        map.set(key, { date: key, impressions: item.impressions, reach: item.reach, views: item.views })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [timeline])

  const platformAnalytics = useMemo(() => {
    if (!postDetail?.platformAnalytics) return []
    return Array.isArray(postDetail.platformAnalytics) ? postDetail.platformAnalytics : []
  }, [postDetail?.platformAnalytics])

  /**
   * Prefer metrics from analyticsListSummaryQuery (passed via `summaryPost`).
   * Fall back to the detailed `getPostAnalytics` API response.
   * This way the panel is instantly populated with the same data shown in
   * the Platform & Post Breakdown tables without waiting for the detail call.
   */
  const summaryMetrics = useMemo(() => {
    const src = summaryPost
    const fromSummary = src ? {
      likes: src.likes ?? 0,
      comments: src.comments ?? 0,
      shares: src.shares ?? 0,
      saves: src.saves ?? 0,
      clicks: src.clicks ?? 0,
      impressions: src.impressions ?? 0,
      reach: src.reach ?? 0,
      views: src.metrics?.views ?? 0,
      engagementRate: src.engagementRate ?? 0,
      engagements: src.engagements ?? 0,
      source: 'summary' as const,
    } : null

    if (fromSummary) return fromSummary

    return {
      likes: postDetail?.analytics?.likes ?? 0,
      comments: postDetail?.analytics?.comments ?? 0,
      shares: postDetail?.analytics?.shares ?? 0,
      saves: postDetail?.analytics?.saves ?? 0,
      clicks: postDetail?.analytics?.clicks ?? 0,
      impressions: postDetail?.analytics?.impressions ?? 0,
      reach: postDetail?.analytics?.reach ?? 0,
      views: postDetail?.analytics?.views ?? 0,
      engagementRate: postDetail?.analytics?.engagementRate ?? 0,
      engagements: ((postDetail?.analytics?.likes ?? 0) + (postDetail?.analytics?.comments ?? 0) + (postDetail?.analytics?.shares ?? 0)),
      source: 'detail' as const,
    }
  }, [summaryPost, postDetail])

  const summaryContent = summaryPost?.post?.content || postDetail?.content
  const summaryThumbnail = summaryPost?.post?.thumbnailUrl || postDetail?.thumbnailUrl
  const summaryPlatform = summaryPost?.post?.platform || postDetail?.platform
  const summaryPlatformUrl = summaryPost?.post?.platformPostUrl || postDetail?.platformPostUrl

  const formatTooltipDate = (value: string) => {
    const d = new Date(value + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[744px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/60">
          <h2 className="text-base font-bold text-brand-ink">Post details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-brand-canvas-soft/60 text-brand-body-mid transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && postDetail && (
            <>
              {/* Meta row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-brand-body-mid">
                  {summaryPlatform && <ExtendedPlatformIcon platform={summaryPlatform} size={14} />}
                  {publishedDate && <span>Published {publishedDate}</span>}
                </div>
                {summaryPlatformUrl && (
                  <a
                    href={summaryPlatformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                  >
                    View original <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Post content */}
              <p className="text-sm text-brand-ink leading-relaxed whitespace-pre-wrap">
                {summaryContent || 'No content'}
              </p>

              {/* Thumbnail */}
              {summaryThumbnail && (
                <div className="rounded-lg overflow-hidden border border-brand-border/60">
                  <img
                    src={summaryThumbnail}
                    alt="Post thumbnail"
                    className="w-full h-auto object-cover max-h-48"
                  />
                </div>
              )}

              {/* Analytics section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-extrabold text-brand-body uppercase tracking-wider before:content-[''] before:flex-none before:w-1.5 before:h-1.5 before:bg-brand-primary after:content-[''] after:flex-1 after:h-[1px] after:bg-brand-border/60">
                  Analytics
                </div>

                {/* Platform breakdown mini table */}
                {(platformAnalytics.length > 0 || summaryPost) && (
                  <div className="rounded-lg border border-brand-border/60 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-brand-canvas-soft/40 border-b border-brand-border/60">
                          <th className="text-left py-2 px-3 font-semibold text-brand-body-mid">Platform</th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><Heart size={10} className="text-rose-500" /> Likes</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><MessageSquare size={10} className="text-blue-500" /> Comments</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><Share2 size={10} className="text-emerald-500" /> Shares</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><Bookmark size={10} className="text-amber-500" /> Saves</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><MousePointerClick size={10} className="text-violet-500" /> Clicks</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><Eye size={10} className="text-purple-500" /> Views</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><BarChart3 size={10} className="text-teal-500" /> Impr.</span>
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-brand-body-mid">
                            <span className="inline-flex items-center justify-end gap-1"><Users size={10} className="text-teal-600" /> Reach</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformAnalytics.map((pa: any, idx: number) => {
                          // If this row's platform matches the post's primary platform
                          // AND we have summary data from analyticsListSummaryQuery,
                          // fill the cells with the summary values (preferred over API dashes).
                          const isPrimary = !!summaryPost && !!summaryPlatform && pa.platform === summaryPlatform
                          const likes = isPrimary ? summaryMetrics.likes : (pa.likes ?? '-')
                          const comments = isPrimary ? summaryMetrics.comments : (pa.comments ?? '-')
                          const shares = isPrimary ? summaryMetrics.shares : (pa.shares ?? '-')
                          const saves = isPrimary ? summaryMetrics.saves : (pa.saves ?? '-')
                          const clicks = isPrimary ? summaryMetrics.clicks : (pa.clicks ?? '-')
                          const views = isPrimary ? summaryMetrics.views : (pa.views ?? '-')
                          const impressions = isPrimary ? summaryMetrics.impressions : (pa.impressions ?? '-')
                          const reach = isPrimary ? summaryMetrics.reach : (pa.reach ?? '-')
                          // Match Platform Breakdown / Top Performing Posts convention:
                          // falsy (incl. 0) → muted "-" placeholder
                          const renderCell = (v: number | string) =>
                            v || <span className="text-brand-body-mid/40">-</span>
                          return (
                            <tr key={idx} className="border-b border-brand-border/30 last:border-b-0">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <ExtendedPlatformIcon platform={pa.platform} size={12} />
                                  <span className="font-medium text-brand-ink capitalize">{pa.platform}</span>
                                </div>
                              </td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(likes)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(comments)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(shares)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(saves)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(clicks)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(views)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(impressions)}</td>
                              <td className="text-right py-2 px-3 text-brand-body">{renderCell(reach)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Engagement over time */}
                {engagementData.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-brand-body uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Heart size={10} className="text-rose-500" />
                      <MessageSquare size={10} className="text-blue-500" />
                      <Share2 size={10} className="text-emerald-500" />
                      <Bookmark size={10} className="text-amber-500" />
                      Engagement over time
                    </p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={engagementData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: '#999' }}
                            tickFormatter={(v) => {
                              const d = new Date(v + 'T00:00:00')
                              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            }}
                          />
                          <YAxis tick={{ fontSize: 9, fill: '#999' }} />
                          <RechartsTooltip
                            labelFormatter={(label) => typeof label === 'string' ? formatTooltipDate(label) : String(label)}
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line type="monotone" dataKey="comments" stroke="#3b82f6" strokeWidth={2} dot={false} name="Comments" />
                          <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} dot={false} name="Likes" />
                          <Line type="monotone" dataKey="saves" stroke="#f59e0b" strokeWidth={2} dot={false} name="Saves" />
                          <Line type="monotone" dataKey="shares" stroke="#10b981" strokeWidth={2} dot={false} name="Shares" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Reach & impressions over time */}
                {reachData.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-brand-body uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BarChart3 size={10} className="text-teal-500" />
                      <Users size={10} className="text-teal-600" />
                      <Eye size={10} className="text-purple-500" />
                      Reach &amp; impressions over time
                    </p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reachData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: '#999' }}
                            tickFormatter={(v) => {
                              const d = new Date(v + 'T00:00:00')
                              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            }}
                          />
                          <YAxis tick={{ fontSize: 9, fill: '#999' }} />
                          <RechartsTooltip
                            labelFormatter={(label) => typeof label === 'string' ? formatTooltipDate(label) : String(label)}
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Impressions" />
                          <Line type="monotone" dataKey="reach" stroke="#6366f1" strokeWidth={2} dot={false} name="Reach" />
                          <Line type="monotone" dataKey="views" stroke="#d946ef" strokeWidth={2} dot={false} name="Views" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </>
  )
}
