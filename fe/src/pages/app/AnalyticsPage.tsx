import { TrendingUp, BarChart3, Users, Eye, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../../api/axios'
import CountingNumber from '../../components/CountingNumber'
import Heatmap from '../../components/Heatmap'
import { useWorkspace } from '../../context/WorkspaceContext'
import styles from './AnalyticsPage.module.css'

interface AnalyticsOverviewDto {
  totalReach: number
  totalEngagement: number
  engagementRate: number
  totalPosts: number
}

interface PlatformAnalyticsDto {
  platform: string
  reach: number
  engagement: number
  postCount: number
}

interface IntegrationDto {
  platform?: string
  providerId?: string
  isActive?: boolean
}

interface ProviderErrorDto {
  code?: string
  message?: string
}

interface ProviderAnalyticsResultDto {
  isSuccess?: boolean
  providerId?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  impressions?: number
  reach?: number
  engagementRate?: number
  error?: ProviderErrorDto
}

const INSIGHTS = [
  { icon: '🔥', text: 'Bài dạng Reel hiệu quả hơn 2.3x so với Photo trên Instagram của bạn.' },
  { icon: '⏰', text: 'Giờ vàng đăng bài: Thứ 3 & Thứ 5 lúc 19:00–21:00 trên TikTok.' },
  { icon: '📈', text: 'TikTok đang tăng trưởng nhanh nhất — tập trung vào đây sẽ tối ưu ROI.' },
  { icon: '💡', text: 'Hashtag #contentcreator & #aitools mang lại reach cao nhất tháng này.' },
]

const WEEKLY_BARS = [45, 60, 38, 85, 52, 90, 68]

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace()
  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null)
  const [platforms, setPlatforms] = useState<PlatformAnalyticsDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!activeWorkspace) {
        setOverview({ totalReach: 0, totalEngagement: 0, engagementRate: 0, totalPosts: 0 })
        setPlatforms([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        const endDate = new Date().toISOString()
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const integrationsRes = await api.get(`/workspaces/${activeWorkspace.id}/integrations`)
        const integrations = Array.isArray(integrationsRes.data) ? integrationsRes.data as IntegrationDto[] : []

        const providerIds = integrations
          .filter((i) => i?.isActive !== false)
          .map((i) => (i.platform || i.providerId || '').toLowerCase())
          .filter(Boolean)

        if (providerIds.length === 0) {
          setOverview({ totalReach: 0, totalEngagement: 0, engagementRate: 0, totalPosts: 0 })
          setPlatforms([])
          return
        }

        const analyticsResults = await Promise.allSettled(
          providerIds.map((providerId) =>
            api.get<ProviderAnalyticsResultDto>(
              `/workspaces/${activeWorkspace.id}/analytics/${providerId}/account`,
              { params: { startDate, endDate } }
            )
          )
        )

        const mappedPlatforms: PlatformAnalyticsDto[] = analyticsResults
          .map((result, index): PlatformAnalyticsDto | null => {
            if (result.status !== 'fulfilled') return null

            const providerId = providerIds[index]
            const data = result.value.data || {}
            if (data.isSuccess === false) {
              console.warn(`Analytics fetch failed for ${providerId}: ${data.error?.message || 'unknown error'}`)
              return null
            }

            const views = data.views || 0
            const reach = data.reach || data.impressions || views
            const likes = data.likes || 0
            const comments = data.comments || 0
            const shares = data.shares || 0
            const engagement = likes + comments + shares

            return {
              platform: providerId,
              reach,
              engagement,
              // Account analytics API does not currently return post count.
              postCount: 0,
            }
          })
          .filter((p): p is PlatformAnalyticsDto => p !== null)

        const totalReach = mappedPlatforms.reduce((sum, p) => sum + p.reach, 0)
        const totalEngagement = mappedPlatforms.reduce((sum, p) => sum + p.engagement, 0)
        const engagementRate = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0

        setPlatforms(mappedPlatforms)
        setOverview({
          totalReach,
          totalEngagement,
          engagementRate,
          totalPosts: 0,
        })
      } catch (err) {
        console.error('Failed to fetch analytics', err)
        setOverview({ totalReach: 0, totalEngagement: 0, engagementRate: 0, totalPosts: 0 })
        setPlatforms([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeWorkspace])

  if (loading) {
    return <div style={{ padding: 40, color: '#fff' }}>Loading Analytics...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Performance Analytics</h1>
          <p className={styles.subtitle}>Tổng quan hiệu suất content tháng này</p>
        </div>
        <span className={styles.dateBadge}>Feb 1 – Feb 24, 2026</span>
      </div>


      <div className={styles.metricsRow}>
        {[
          { icon: <Eye size={18} />, label: 'Total Reach', value: overview?.totalReach || 0, delta: '+24%', color: '#8b5cf6', isK: true },
          { icon: <Heart size={18} />, label: 'Avg. Engagement', value: overview?.engagementRate || 0, delta: '+11%', color: '#ec4899', isPercent: true },
          { icon: <Users size={18} />, label: 'Follower Growth', value: 1240, delta: 'this month', color: '#22d3ee' },
          { icon: <BarChart3 size={18} />, label: 'Total Posts', value: overview?.totalPosts || 0, delta: 'across platforms', color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className={`glass-card ${styles.metricCard}`}>
            <div className={styles.metricIcon} style={{ color: m.color, background: `${m.color}18` }}>{m.icon}</div>
            <div className={styles.metricValue}>
              <CountingNumber 
                value={m.value} 
                format={(v) => {
                  if (m.isK) return `${(v/1000).toFixed(1)}K`
                  if (m.isPercent) return `${v}.4%`
                  if (m.label === 'Follower Growth') return `+${v.toLocaleString()}`
                  return v.toString()
                }}
              />
            </div>
            <div className={styles.metricLabel}>{m.label}</div>
            <div className={styles.metricDelta} style={{ color: m.delta.startsWith('+') ? '#22c55e' : m.color }}>{m.delta}</div>
          </div>
        ))}
      </div>

      <div className={styles.row2}>

        <div className={`glass-card ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Reach theo tuần</h2>
            <span className={styles.cardSub}>7 ngày gần nhất</span>
          </div>
          <div className={styles.chartWrap}>
            <div className={styles.bars}>
              {WEEKLY_BARS.map((h, i) => (
                <div key={i} className={styles.barWrap}>
                  <div className={styles.barVal}>{Math.round(h * 1.5)}K</div>
                  <div className={styles.bar} style={{ height: `${h}%` }} />
                  <span className={styles.barDay}>{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        <div className={`glass-card ${styles.insightCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>✨ AI Insights</h2>
            <span className={styles.cardSub}>Gợi ý cải thiện</span>
          </div>
          <div className={styles.insightList}>
            {INSIGHTS.map((ins, i) => (
              <div key={i} className={styles.insightItem}>
                <span className={styles.insightEmoji}>{ins.icon}</span>
                <p className={styles.insightText}>{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className={`glass-card ${styles.heatmapCard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>📅 Giờ vàng đăng bài</h2>
          <span className={styles.cardSub}>Phân tích dựa trên tương tác của audience</span>
        </div>
        <Heatmap />
        <div className={styles.heatmapLegend}>
          <span>Less active</span>
          <div className={styles.legendBar} />
          <span>Most active</span>
        </div>
      </div>


      <div className={`glass-card ${styles.tableCard}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Hiệu suất từng nền tảng</h2>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Reach</th>
              <th>Tăng trưởng</th>
              <th>Engagement</th>
              <th>Số bài</th>
              <th>Xu hướng</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map(p => (
              <tr key={p.platform}>
                <td><span className={styles.platformName}>{p.platform || 'Unknown'}</span></td>
                <td className={styles.reach}>{p.reach.toLocaleString()}</td>
                <td>
                  <span className={styles.growth} style={{ color: '#22c55e' }}>
                    +{(Math.random() * 20 + 1).toFixed(1)}%
                  </span>
                </td>
                <td className={styles.engagement}>{p.engagement.toLocaleString()}</td>
                <td className={styles.posts}>{p.postCount}</td>
                <td>
                  <TrendingUp size={16} color="#22c55e" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
