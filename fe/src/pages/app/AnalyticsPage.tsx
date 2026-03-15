import { TrendingUp, BarChart3, Users, Eye, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../../api/axios'
import CountingNumber from '../../components/CountingNumber'
import Heatmap from '../../components/Heatmap'
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

const INSIGHTS = [
  { icon: '🔥', text: 'Bài dạng Reel hiệu quả hơn 2.3x so với Photo trên Instagram của bạn.' },
  { icon: '⏰', text: 'Giờ vàng đăng bài: Thứ 3 & Thứ 5 lúc 19:00–21:00 trên TikTok.' },
  { icon: '📈', text: 'TikTok đang tăng trưởng nhanh nhất — tập trung vào đây sẽ tối ưu ROI.' },
  { icon: '💡', text: 'Hashtag #contentcreator & #aitools mang lại reach cao nhất tháng này.' },
]

const WEEKLY_BARS = [45, 60, 38, 85, 52, 90, 68]

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null)
  const [platforms, setPlatforms] = useState<PlatformAnalyticsDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const toUtc = new Date().toISOString()
        const fromUtc = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        
        const [overviewRes, platformRes] = await Promise.all([
          api.get('/analytics/overview', { params: { fromUtc, toUtc } }),
          api.get('/analytics/platforms', { params: { fromUtc, toUtc } }),
        ])

        setOverview(overviewRes.data)
        setPlatforms(platformRes.data)
      } catch (err) {
        console.error('Failed to fetch analytics', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
