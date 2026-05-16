import { TrendingUp, BarChart3, Globe2, CalendarClock, Sparkles, ArrowUpRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import styles from './DashboardPage.module.css'

const STATUS_LABELS: Record<Post['status'], string> = {
  idea: '💡 Idea',
  draft: '📝 Draft',
  scheduled: '⏰ Scheduled',
  published: '✅ Published',
  publishing: '🔄 Publishing',
  failed: '❌ Failed',
}

function useDashboardData(workspaceId?: string) {
  const summary = useQuery({
    queryKey: ['dashboard-summary', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => analyticsApi.getWorkspaceSummary(workspaceId!, 30),
    staleTime: 60_000,
  })

  const recentPosts = useQuery({
    queryKey: ['dashboard-recent-posts', workspaceId],
    enabled: Boolean(workspaceId),
      queryFn: () => postsApi.getPosts(workspaceId!, { pageSize: 4 }),
  })

  const integrations = useQuery({
    queryKey: ['dashboard-integrations', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const res = await api.get(`workspaces/${workspaceId}/integrations`)
      return res.data as { id: string; providerId: string }[]
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

  const isLoading = summary.isLoading || recentPosts.isLoading || integrations.isLoading
  const isError = summary.isError || recentPosts.isError || integrations.isError

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
            <button className={styles.seeAll} onClick={() => navigate('/app/calendar')}>
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
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4].map(i => (
                  <tr key={i}>
                    <td colSpan={5}><SkeletonLoader height="36px" /></td>
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
                </tr>
              </thead>
              <tbody>
                {posts.slice(0, 4).map((p) => (
                  <tr key={p.id}>
                    <td className={styles.postTitle}>{p.title}</td>
                    <td><span className={styles.platformTag}>{getPostPlatforms(p)}</span></td>
                    <td>
                      <span className={`${styles.status} ${styles[`status_${p.status}`] || ''}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className={styles.reach}>—</td>
                    <td className={styles.date}>{formatPostDate(p)}</td>
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
    </div>
  )
}
