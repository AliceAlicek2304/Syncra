import { useState } from 'react'
import { TrendingUp, BarChart3, Globe2, CalendarClock, Sparkles, ArrowUpRight, RefreshCw, ExternalLink, RotateCcw, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ErrorBoundary } from 'react-error-boundary'
import { WidgetErrorFallback } from '../../components/WidgetErrorFallback'
import OnboardingTour from '../../components/OnboardingTour'
import CountingNumber from '../../components/CountingNumber'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { analyticsApi } from '../../api/analytics'
import { postsApi } from '../../api/posts'
import type { Post } from '../../api/posts'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import { PlatformOutcomesModal } from '../../components/posts/PlatformOutcomesModal'
import { RetryConfirmDialog } from '../../components/posts/RetryConfirmDialog'
import { CancelConfirmDialog } from '../../components/posts/CancelConfirmDialog'
import styles from './DashboardPage.module.css'

const STATUS_LABELS: Record<Post['status'], string> = {
  idea: '💡 Idea',
  draft: '📝 Draft',
  scheduled: '⏰ Scheduled',
  published: '✅ Published',
  publishing: '🔄 Publishing',
  partial: '⚠️ Partial',
  failed: '❌ Failed',
}

function useDashboardData(workspaceId?: string) {
  const summary = useQuery({
    queryKey: ['dashboard-summary', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 30)
      const data = await analyticsApi.getDailyMetrics({ fromDate: fromDate.toISOString().split('T')[0] }, workspaceId!)
      const breakdown = data.platformBreakdown || []
      const totalReach = breakdown.reduce((acc, b) => acc + b.reach, 0)
      const totalLikes = breakdown.reduce((acc, b) => acc + b.likes, 0)
      const totalComments = breakdown.reduce((acc, b) => acc + b.comments, 0)
      const totalShares = breakdown.reduce((acc, b) => acc + b.shares, 0)
      const totalImpressions = breakdown.reduce((acc, b) => acc + b.impressions, 0)
      const totalEngagements = totalLikes + totalComments + totalShares
      const totalPosts = breakdown.reduce((acc, b) => acc + b.postCount, 0)
      const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
      
      return {
        totalReach,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagements,
        engagementRate,
        totalPosts,
      }
    },
    staleTime: 60_000,
  })

  const recentPosts = useQuery({
    queryKey: ['dashboard-recent-posts', workspaceId],
    enabled: Boolean(workspaceId),
      queryFn: async () => {
        const result = await postsApi.getPosts(workspaceId!, { pageSize: 4 })
        return result.items
      },
  })

  const integrations = useQuery({
    queryKey: ['dashboard-integrations', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const res = await api.get('social-accounts', {
        headers: { 'X-Workspace-Id': workspaceId },
      })
      const data = res.data as { items?: { id: string; platform: string }[]; id?: string; platform?: string }[] | { items: { id: string; platform: string }[] }
      // Handle both paged and legacy shape
      if (data && !Array.isArray(data) && 'items' in data) return data.items
      return (data as { id: string; platform: string }[])
    },
  })

  return { summary, recentPosts, integrations }
}

function formatPostDate(post: Post): string {
  if (post.scheduledAtUtc) {
    const d = new Date(post.scheduledAtUtc)
    return d.toLocaleDateString('vi-VN', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  if (post.createdAt) {
    const d = new Date(post.createdAt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return 'Hôm nay'
    if (diff < 172800000) return 'Hôm qua'
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
  }
  return 'Chưa có'
}

function getPostPlatforms(post: Post): string {
  if (post.platforms?.length) return post.platforms.join(', ')
  if (post.platformContents?.length) return post.platformContents.map(p => p.platform).join(', ')
  return '—'
}

function StatCardSkeleton() {
  return <div className={`glass-card ${styles.statCard}`}><SkeletonLoader height="80px" /></div>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()

  const workspaceId = activeWorkspace?.id
  const { summary, recentPosts, integrations } = useDashboardData(workspaceId)

  const [selectedOutcomePost, setSelectedOutcomePost] = useState<Post | null>(null)
  const [selectedRetryPost, setSelectedRetryPost] = useState<Post | null>(null)
  const [selectedCancelPost, setSelectedCancelPost] = useState<Post | null>(null)

  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()

  const retryMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!workspaceId) throw new Error('No workspace id')
      return postsApi.retryZernioPost(workspaceId, postId)
    },
    onSuccess: () => {
      showSuccess('Post retry started successfully')
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
      setSelectedRetryPost(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to retry post'
      showError(msg)
    }
  })

  const cancelMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!workspaceId) throw new Error('No workspace id')
      return postsApi.deleteZernioPost(workspaceId, postId)
    },
    onSuccess: () => {
      showSuccess('Post cancelled successfully')
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
      setSelectedCancelPost(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Could not cancel this post in Zernio. Your post remains scheduled. Please try again.'
      showError(msg)
    }
  })

  const isLoading = summary.isLoading || recentPosts.isLoading
  const isError = summary.isError || recentPosts.isError

  const statCards = summary.data
    ? [
        {
          label: 'Tổng lượt reach',
          value: summary.data.totalReach,
          delta: '+24%',
          icon: <TrendingUp size={18} />,
          color: '#8b5cf6' as const,
          format: (v: number) => `${(v / 1000).toFixed(1)}K`,
        },
        {
          label: 'Engagement rate',
          value: Math.round(summary.data.engagementRate * 10) / 10,
          delta: '+11%',
          icon: <BarChart3 size={18} />,
          color: '#ec4899' as const,
          format: (v: number) => `${v}%`,
        },
        {
          label: 'Platforms kết nối',
          value: integrations.data?.length ?? 0,
          delta: 'active',
          icon: <Globe2 size={18} />,
          color: '#22d3ee' as const,
          format: (v: number) => v.toString(),
        },
        {
          label: 'Tổng posts',
          value: summary.data.totalPosts,
          delta: 'tháng này',
          icon: <CalendarClock size={18} />,
          color: '#f59e0b' as const,
          format: (v: number) => v.toString(),
        },
      ]
    : null

  const posts = recentPosts.data ?? []
  const hasZernioPosts = posts.some((p) => p.zernioPostId)

  const renderPlatformSummary = (p: Post) => {
    if (!p.zernioPostId) return null
    const targets = p.platformTargets || []
    const y = p.zernioTargetCount || targets.length || 0
    if (y === 0) return null
    const x = targets.filter(
      (t) => t.status?.toLowerCase() === 'published'
    ).length
    
    let color = '#ef4444' // red if all failed
    if (x === y) {
      color = '#22c55e' // green if all published
    } else if (x > 0) {
      color = '#f97316' // orange if partial
    }
    
    return (
      <div style={{ fontSize: '12px', fontWeight: 700, color, marginTop: '4px' }}>
        {x}/{y} published
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Welcome */}
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.title}>
            {isLoading
              ? <SkeletonLoader width="200px" height="32px" />
              : `Xin chào, ${(user?.displayName || user?.firstName || user?.email || 'Creator')?.split(' ')[0]}`
            }
          </h1>
          <p className={styles.subtitle}>Tổng quan hiệu suất content của bạn.</p>
        </div>
      </div>

      {/* Stats */}
      <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
        {isError ? (
          <div className={styles.statsGrid}>
            {[1,2,3,4].map(i => (
              <div key={i} className={`glass-card ${styles.statCard} ${styles.statCardError}`}>
                <div className={styles.errorState}>
                  <span>Không thể tải dữ liệu</span>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="btn-ghost"
                    onClick={() => { summary.refetch(); integrations.refetch() }}
                    style={{ fontSize: 12, padding: '6px 14px' }}
                  >
                    <RefreshCw size={13} /> Thử lại
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.statsGrid}>
            {isLoading
              ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
              : statCards?.map(s => (
                  <motion.div
                    key={s.label}
                    className={`glass-card ${styles.statCard}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                    whileHover={{ y: -4, borderColor: 'var(--purple-500)', boxShadow: '0 12px 40px rgba(139, 92, 246, 0.15)', transition: { duration: 0.2, ease: 'easeOut' } }}
                  >
                    <div className={styles.statIcon} style={{ color: s.color, background: `${s.color}18` }}>
                      {s.icon}
                    </div>
                    <div className={styles.statValue}>
                      <CountingNumber value={s.value} format={s.format} />
                    </div>
                    <div className={styles.statLabel}>{s.label}</div>
                    <div className={styles.statDelta} style={{ color: s.delta.startsWith('+') ? '#22c55e' : s.color }}>
                      {s.delta}
                    </div>
                  </motion.div>
                ))
            }
          </div>
        )}
      </ErrorBoundary>

      {/* Recent posts */}
      <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
        <div className={`glass-card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Posts gần đây</h2>
            <button className={styles.seeAll} onClick={() => navigate('/app/posts-all?view=calendar')}>
              Xem tất cả <ArrowUpRight size={13} />
            </button>
          </div>
          {recentPosts.isError ? (
            <div className={styles.sectionError}>
              <span>Không thể tải posts. </span>
              <button className={styles.retryLink} onClick={() => recentPosts.refetch()}>Thử lại</button>
            </div>
          ) : isLoading ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tiêu đề</th>
                  <th scope="col">Platform</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Reach</th>
                  <th scope="col">Thời gian</th>
                  {hasZernioPosts && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4].map(i => (
                  <tr key={i}>
                    <td colSpan={hasZernioPosts ? 6 : 5}><SkeletonLoader height="36px" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : posts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Chưa có post nào.</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                onClick={() => navigate('/app/ideas')}
                style={{ fontSize: 13, padding: '8px 18px', marginTop: 8 }}
              >
                Tạo post đầu tiên
              </motion.button>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tiêu đề</th>
                  <th scope="col">Platform</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Reach</th>
                  <th scope="col">Thời gian</th>
                  {hasZernioPosts && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {posts.slice(0, 4).map((p) => (
                  <tr key={p.id}>
                    <td className={styles.postTitle}>
                      <div>{p.title}</div>
                      {renderPlatformSummary(p)}
                    </td>
                    <td><span className={styles.platformTag}>{getPostPlatforms(p)}</span></td>
                    <td>
                      <span className={`${styles.status} ${styles[`status_${p.status}`] || ''}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className={styles.reach}>—</td>
                    <td className={styles.date}>{formatPostDate(p)}</td>
                    {hasZernioPosts && (
                      <td className={styles.actionsCell}>
                        {p.zernioPostId ? (
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.detailTrigger}
                              onClick={() => setSelectedOutcomePost(p)}
                              title="View platform outcomes"
                              aria-label={`View platform outcomes for ${p.title}`}
                            >
                              <ExternalLink size={14} />
                            </button>
                            
                            {(p.status === 'failed' || p.status === 'partial') && (
                              <button
                                className={styles.retryBtn}
                                onClick={() => setSelectedRetryPost(p)}
                                disabled={retryMutation.isPending && selectedRetryPost?.id === p.id}
                                aria-label={`Retry failed platforms for ${p.title}`}
                              >
                                <RotateCcw size={12} />
                                <span>Retry</span>
                              </button>
                            )}
                            
                            {p.status === 'scheduled' && (
                              <button
                                className={styles.cancelBtn}
                                onClick={() => setSelectedCancelPost(p)}
                                disabled={cancelMutation.isPending && selectedCancelPost?.id === p.id}
                                aria-label={`Cancel scheduled post ${p.title}`}
                              >
                                <X size={12} />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ErrorBoundary>

      {/* AI tip */}
      <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
        <div className={`glass-card ${styles.aiTip}`}>
          <div className={styles.aiTipIcon}><Sparkles size={18} /></div>
          <div>
            <div className={styles.aiTipTitle}>Gợi ý từ AI</div>
            <div className={styles.aiTipText}>
              Posts dạng <strong>Reel</strong> của bạn đang có engagement cao hơn 2.3x so với Photo.
              Thử tạo thêm Reel tuần này nhé — đặc biệt vào <strong>Thứ 3 & Thứ 5 lúc 19:00</strong>.
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }} className="btn-primary" onClick={() => navigate('/app/repurpose')} style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0 }}>
            Tạo ngay →
          </motion.button>
        </div>
      </ErrorBoundary>

      {/* Onboarding */}
      <OnboardingTour />

      {/* Platform outcomes modal */}
      {selectedOutcomePost && (
        <PlatformOutcomesModal
          post={selectedOutcomePost}
          open={Boolean(selectedOutcomePost)}
          onClose={() => setSelectedOutcomePost(null)}
          onRetry={
            selectedOutcomePost.platformTargets?.some(
              (t) => t.status?.toLowerCase() === 'failed'
            )
              ? () => {
                  setSelectedRetryPost(selectedOutcomePost)
                  setSelectedOutcomePost(null)
                }
              : undefined
          }
        />
      )}

      {/* Retry confirmation dialog */}
      {selectedRetryPost && (
        <RetryConfirmDialog
          failedTargets={selectedRetryPost.platformTargets?.filter(
            (t) => t.status?.toLowerCase() === 'failed'
          ) || []}
          open={Boolean(selectedRetryPost)}
          onCancel={() => setSelectedRetryPost(null)}
          onConfirm={async () => {
            await retryMutation.mutateAsync(selectedRetryPost.id)
          }}
        />
      )}

      {/* Cancel confirmation dialog */}
      {selectedCancelPost && (
        <CancelConfirmDialog
          post={selectedCancelPost}
          open={Boolean(selectedCancelPost)}
          onCancel={() => setSelectedCancelPost(null)}
          onConfirm={async () => {
            await cancelMutation.mutateAsync(selectedCancelPost.id)
          }}
        />
      )}
    </div>
  )
}
