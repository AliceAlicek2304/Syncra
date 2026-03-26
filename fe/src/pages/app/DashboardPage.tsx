import { TrendingUp, BarChart3, Globe2, CalendarClock, Sparkles, ArrowUpRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api } from '../../api/axios'
import OnboardingTour from '../../components/OnboardingTour'
import CountingNumber from '../../components/CountingNumber'
import styles from './DashboardPage.module.css'

interface PostDto {
  id: string
  title?: string
  content?: string
  status: string
  integrationId?: string | null
  scheduledAtUtc?: string
  publishedAtUtc?: string
  createdAtUtc?: string
}

interface WorkspaceAnalyticsSummaryDto {
  totalPosts: number
}

interface IntegrationDto {
  id: string
  platform: string
  isActive: boolean
}

interface DisplayPost extends PostDto {
  platforms: string[]
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function formatPostDate(post: PostDto): string {
  const dateStr = post.scheduledAtUtc || post.publishedAtUtc || post.createdAtUtc
  if (!dateStr) return '—'

  const d = new Date(dateStr)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.round(diff / 86400000)

  if (days === 0) return `Hôm nay ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  if (days === 1) return `Mai ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  if (days === -1) return 'Hôm qua'
  if (days < 0) return d.toLocaleDateString('vi-VN')

  const weekDays = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  return `${weekDays[d.getDay()]} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getStatusLabel(status: string) {
  switch (status?.toLowerCase()) {
    case 'published':
      return '✅ Đã đăng'
    case 'scheduled':
      return '⏰ Scheduled'
    case 'draft':
      return '📝 Draft'
    case 'failed':
      return '❌ Thất bại'
    default:
      return status
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()

  const [recentPosts, setRecentPosts] = useState<DisplayPost[]>([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [publishedCount, setPublishedCount] = useState(0)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [platformCount, setPlatformCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) {
      setRecentPosts([])
      setTotalPosts(0)
      setPublishedCount(0)
      setScheduledCount(0)
      setPlatformCount(0)
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        const [summaryRes, integrationsRes, recentPostsRes] = await Promise.all([
          api.get<WorkspaceAnalyticsSummaryDto>(`/workspaces/${activeWorkspace.id}/analytics/summary`, {
            params: { date: 30 }
          }),
          api.get<IntegrationDto[]>(`/workspaces/${activeWorkspace.id}/integrations`),
          api.get<PostDto[]>(`/workspaces/${activeWorkspace.id}/posts`, {
            params: { page: 1, pageSize: 6 }
          })
        ])

        const integrations = Array.isArray(integrationsRes.data) ? integrationsRes.data : []
        const integrationById = new Map(integrations.map((i) => [i.id, i]))

        const mapPostToDisplay = (post: PostDto): DisplayPost => {
          const integration = post.integrationId ? integrationById.get(post.integrationId) : undefined
          return {
            ...post,
            platforms: integration?.platform ? [integration.platform] : []
          }
        }

        const recentItems = Array.isArray(recentPostsRes.data) ? recentPostsRes.data : []
        setRecentPosts(recentItems.map(mapPostToDisplay))

        const workspaceTotalPosts = summaryRes.data?.totalPosts ?? 0
        setTotalPosts(workspaceTotalPosts)

        const allPosts: PostDto[] = []
        const pageSize = 100
        let page = 1

        while (allPosts.length < workspaceTotalPosts) {
          const pageRes = await api.get<PostDto[]>(`/workspaces/${activeWorkspace.id}/posts`, {
            params: { page, pageSize }
          })
          const pageItems = Array.isArray(pageRes.data) ? pageRes.data : []

          if (pageItems.length === 0) break
          allPosts.push(...pageItems)

          if (pageItems.length < pageSize) break
          page += 1
        }

        const normalizedAllPosts = allPosts.map(mapPostToDisplay)
        setPublishedCount(normalizedAllPosts.filter((p) => p.status?.toLowerCase() === 'published').length)
        setScheduledCount(normalizedAllPosts.filter((p) => p.status?.toLowerCase() === 'scheduled').length)
        setPlatformCount(new Set(normalizedAllPosts.flatMap((p) => p.platforms)).size)
      } catch {
        setRecentPosts([])
        setTotalPosts(0)
        setPublishedCount(0)
        setScheduledCount(0)
        setPlatformCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [activeWorkspace])

  const QUICK_STATS = [
    { label: 'Tổng posts', value: totalPosts, delta: 'toàn workspace', icon: <TrendingUp size={18} />, color: '#8b5cf6' },
    { label: 'Đã publish', value: publishedCount, delta: 'dữ liệu thực tế', icon: <BarChart3 size={18} />, color: '#ec4899' },
    { label: 'Platforms', value: platformCount, delta: 'đã dùng trong posts', icon: <Globe2 size={18} />, color: '#22d3ee' },
    { label: 'Đã lên lịch', value: scheduledCount, delta: 'đang chờ', icon: <CalendarClock size={18} />, color: '#f59e0b' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.title}>{getGreeting()}, {user?.displayName?.split(' ')[0] || 'bạn'} 👋</h1>
          <p className={styles.subtitle}>Đây là tổng quan content workspace của bạn.</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {QUICK_STATS.map((s) => (
          <div key={s.label} className={`glass-card ${styles.statCard}`}>
            <div className={styles.statIcon} style={{ color: s.color, background: `${s.color}18` }}>
              {s.icon}
            </div>
            <div className={styles.statValue}>
              <CountingNumber value={s.value} format={(v) => v.toString()} />
            </div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statDelta} style={{ color: s.color }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className={`glass-card ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Posts gần đây</h2>
          <button className={styles.seeAll} onClick={() => navigate('/app/calendar')}>
            Xem tất cả <ArrowUpRight size={13} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
            Đang tải...
          </div>
        ) : recentPosts.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
            Chưa có post nào. <button className={styles.seeAll} onClick={() => navigate('/app/calendar')}>Tạo post đầu tiên →</button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Platform</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map((p) => (
                <tr key={p.id}>
                  <td className={styles.postTitle}>
                    {p.title || (p.content ? p.content.substring(0, 50) + (p.content.length > 50 ? '…' : '') : '(Không có tiêu đề)')}
                  </td>
                  <td>
                    {(p.platforms ?? []).map((pl) => (
                      <span key={pl} className={styles.platformTag} style={{ marginRight: 4 }}>{pl}</span>
                    ))}
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[`status_${p.status?.toLowerCase()}`]}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className={styles.date}>{formatPostDate(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`glass-card ${styles.aiTip}`}>
        <div className={styles.aiTipIcon}><Sparkles size={18} /></div>
        <div>
          <div className={styles.aiTipTitle}>Gợi ý từ AI</div>
          <div className={styles.aiTipText}>
            Hãy lên kế hoạch content đều đặn. Dùng <strong>AI Idea Generator</strong> để tạo ý tưởng bài viết
            phù hợp với niche và audience của bạn — <strong>nhanh hơn 10x</strong> so với brainstorm tay.
          </div>
        </div>
        <button className="btn-primary" onClick={() => navigate('/app/ai')} style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0 }}>
          Tạo ngay →
        </button>
      </div>

      <OnboardingTour />
    </div>
  )
}
