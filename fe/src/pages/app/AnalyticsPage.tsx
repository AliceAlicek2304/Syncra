import { TrendingUp, TrendingDown, Minus, BarChart3, Users, Eye, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../../api/axios'
import CountingNumber from '../../components/CountingNumber'
import Heatmap from '../../components/Heatmap'
import { useWorkspace } from '../../context/WorkspaceContext'
import styles from './AnalyticsPage.module.css'

// Backend API response interfaces
interface AnalyticsDataPoint {
  total: string
  date: string
}

interface AnalyticsData {
  label: string
  data: AnalyticsDataPoint[]
  percentageChange: number
}

interface WeeklyReachDto {
  weekStart: string
  reach: number
}

interface HeatmapSlotDto {
  dayOfWeek: number
  hour: number
  score: number
}

interface WorkspaceAnalyticsSummaryDto {
  totalReach: number
  engagementRate: number
  followerGrowth: number
  totalPosts: number
  weeklyReach: WeeklyReachDto[]
}

interface HeatmapDto {
  slots: HeatmapSlotDto[]
}

// Frontend display interfaces
interface AnalyticsOverviewDto {
  totalReach: number
  totalEngagement: number
  engagementRate: number
  totalPosts: number
  followerGrowth: number
}

interface PlatformAnalyticsDto {
  platform: string
  reach: number
  engagement: number
  postCount: number
  growth: number
  trend: 'up' | 'down' | 'neutral'
}

interface IntegrationDto {
  id?: string
  platform?: string
  providerId?: string
  isActive?: boolean
}

const INSIGHTS = [
  { icon: '🔥', text: 'Bài dạng Reel hiệu quả hơn 2.3x so với Photo trên Instagram của bạn.' },
  { icon: '⏰', text: 'Giờ vàng đăng bài: Thứ 3 & Thứ 5 lúc 19:00–21:00 trên TikTok.' },
  { icon: '📈', text: 'TikTok đang tăng trưởng nhanh nhất — tập trung vào đây sẽ tối ưu ROI.' },
  { icon: '💡', text: 'Hashtag #contentcreator & #aitools mang lại reach cao nhất tháng này.' },
]



export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace()
  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null)
  const [platforms, setPlatforms] = useState<PlatformAnalyticsDto[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapDto | null>(null)
  const [weeklyReach, setWeeklyReach] = useState<WeeklyReachDto[]>([])
  const [deltas, setDeltas] = useState({ reach: '0%', engagement: '0%', followers: '0%', posts: '0%' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!activeWorkspace) {
        setOverview({ totalReach: 0, totalEngagement: 0, engagementRate: 0, totalPosts: 0, followerGrowth: 0 })
        setPlatforms([])
        setHeatmapData(null)
        setWeeklyReach([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // 1. Get workspace summary (overview + weekly reach + follower growth)
        const summaryRes = await api.get<WorkspaceAnalyticsSummaryDto>(
          `/workspaces/${activeWorkspace.id}/analytics/summary`,
          { params: { date: 30 } }
        )
        const summary = summaryRes.data

        // 2. Get heatmap data
        const heatmapRes = await api.get<HeatmapDto>(
          `/workspaces/${activeWorkspace.id}/analytics/heatmap`,
          { params: { date: 90 } }
        )
        const heatmap = heatmapRes.data

        // 3. Get integrations for platform analytics
        const integrationsRes = await api.get(`/workspaces/${activeWorkspace.id}/integrations`)
        const integrations = Array.isArray(integrationsRes.data) ? integrationsRes.data as IntegrationDto[] : []

        const activeIntegrations = integrations.filter((i) => i?.isActive !== false && i.id)

        // 4. Get analytics for each integration
        const platformAnalyticsResults = await Promise.allSettled(
          activeIntegrations.map((integration) =>
            api.get<AnalyticsData[]>(
              `/workspaces/${activeWorkspace.id}/analytics/${integration.id}`,
              { params: { date: 30 } }
            )
          )
        )

        // 5. Map integration analytics to platform data
        const mappedPlatforms: PlatformAnalyticsDto[] = platformAnalyticsResults
          .map((result, index): PlatformAnalyticsDto | null => {
            if (result.status !== 'fulfilled') return null

            const integration = activeIntegrations[index]
            const analyticsData = result.value.data || []

            // Extract all data points with dates
            const allPoints = analyticsData
              .flatMap(d => d.data)
              .map(p => ({ date: new Date(p.date), value: parseInt(p.total) || 0 }))
              .sort((a, b) => b.date.getTime() - a.date.getTime())

            // Calculate current and previous period reach (split by midpoint date)
            const midpoint = Math.floor(allPoints.length / 2)
            const currentPeriod = allPoints.slice(0, midpoint || 1)
            const previousPeriod = allPoints.slice(midpoint || 1)
            
            const currentReach = currentPeriod.reduce((sum, p) => sum + p.value, 0)
            const previousReach = previousPeriod.reduce((sum, p) => sum + p.value, 0)

            // Calculate growth percentage
            const growth = previousReach > 0 
              ? Math.round(((currentReach - previousReach) / previousReach) * 100)
              : (currentReach > 0 ? 100 : 0)

            // Extract metrics from AnalyticsData labels
            const reach = sumAnalyticsData(analyticsData, ['Page Impressions', 'Views'])
            const engagement = sumAnalyticsData(analyticsData, ['Posts Engagement', 'Likes', 'Comments', 'Shares'])
            const postCount = sumAnalyticsData(analyticsData, ['Posts'])

            // Determine trend based on growth
            const trend = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'

            return {
              platform: integration.platform || integration.providerId || 'Unknown',
              reach,
              engagement,
              postCount,
              growth,
              trend,
            }
          })
          .filter((p): p is PlatformAnalyticsDto => p !== null)

        // 6. Set state with real data
        setOverview({
          totalReach: summary.totalReach,
          totalEngagement: Math.round(summary.totalReach * summary.engagementRate / 100), // Calculate from rate
          engagementRate: summary.engagementRate,
          totalPosts: summary.totalPosts,
          followerGrowth: summary.followerGrowth,
        })
        setPlatforms(mappedPlatforms)
        setHeatmapData(heatmap)
        setWeeklyReach(summary.weeklyReach || [])

        // Calculate percentage changes from weekly reach (compare last 2 weeks)
        const sortedWeeks = [...(summary.weeklyReach || [])].sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
        const thisWeek = sortedWeeks[0]?.reach || 0
        const lastWeek = sortedWeeks[1]?.reach || 0
        const reachDelta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0)
        setDeltas({
          reach: `${reachDelta >= 0 ? '+' : ''}${reachDelta}%`,
          engagement: `+${Math.round(summary.engagementRate)}%`,
          followers: `+${summary.followerGrowth}`,
          posts: `${summary.totalPosts} posts`,
        })

      } catch (err) {
        console.error('Failed to fetch analytics', err)
        setOverview({ totalReach: 0, totalEngagement: 0, engagementRate: 0, totalPosts: 0, followerGrowth: 0 })
        setPlatforms([])
        setHeatmapData(null)
        setWeeklyReach([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeWorkspace])

  // Helper function to sum analytics data by labels
  const sumAnalyticsData = (data: AnalyticsData[], labels: string[]): number => {
    return data
      .filter(d => labels.includes(d.label))
      .flatMap(d => d.data)
      .reduce((sum, point) => sum + (parseInt(point.total) || 0), 0)
  }

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
          { icon: <Eye size={18} />, label: 'Total Reach', value: overview?.totalReach || 0, delta: deltas.reach, color: '#8b5cf6', isK: true },
          { icon: <Heart size={18} />, label: 'Avg. Engagement', value: overview?.engagementRate || 0, delta: deltas.engagement, color: '#ec4899', isPercent: true },
          { icon: <Users size={18} />, label: 'Follower Growth', value: overview?.followerGrowth || 0, delta: 'this month', color: '#22d3ee' },
          { icon: <BarChart3 size={18} />, label: 'Total Posts', value: overview?.totalPosts || 0, delta: 'across platforms', color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className={`glass-card ${styles.metricCard}`}>
            <div className={styles.metricIcon} style={{ color: m.color, background: `${m.color}18` }}>{m.icon}</div>
            <div className={styles.metricValue}>
              <CountingNumber 
                value={m.value} 
                format={(v) => {
                  if (m.isK) return v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString()
                  if (m.isPercent) return `${v}%`
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
            <h2 className={styles.chartTitle}>Reach theo tuần</h2>
            <span className={styles.cardSub}>7 tuần gần nhất</span>
          </div>
            <div className={styles.chartWrap}>
              <div className={styles.bars}>
                {weeklyReach.slice(-7).map((week, i) => {
                  const maxReach = Math.max(...weeklyReach.map(w => w.reach), 1)
                  const height = (week.reach / maxReach) * 100
                  const weekDate = new Date(week.weekStart)
                  const weekLabel = `${weekDate.getDate()}/${weekDate.getMonth() + 1}`
                  return (
                    <div key={i} className={styles.barWrap}>
                      <div className={styles.barVal}>{week.reach >= 1000 ? `${(week.reach/1000).toFixed(1)}K` : week.reach}</div>
                      <div className={styles.bar} style={{ height: `${height}%` }} />
                      <span className={styles.barDay}>{weekLabel}</span>
                    </div>
                  )
                })}
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
        <Heatmap data={heatmapData || undefined} />
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
                  <span className={styles.growth} style={{ color: p.growth >= 0 ? '#22c55e' : '#ef4444' }}>
                    {p.growth >= 0 ? '+' : ''}{p.growth}%
                  </span>
                </td>
                <td className={styles.engagement}>{p.engagement.toLocaleString()}</td>
                <td className={styles.posts}>{p.postCount}</td>
                <td>
                  {p.trend === 'up' && <TrendingUp size={16} color="#22c55e" />}
                  {p.trend === 'down' && <TrendingDown size={16} color="#ef4444" />}
                  {p.trend === 'neutral' && <Minus size={16} color="#94a3b8" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
