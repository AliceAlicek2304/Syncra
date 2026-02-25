import { TrendingUp, TrendingDown, BarChart3, Users, Eye, Heart } from 'lucide-react'
import CountingNumber from '../../components/CountingNumber'
import Heatmap from '../../components/Heatmap'
import styles from './AnalyticsPage.module.css'

const PLATFORMS_DATA = [
  { name: 'TikTok', reach: '72.4K', growth: '+34%', engagement: '9.2%', posts: 18, trend: 'up' },
  { name: 'Instagram', reach: '31.2K', growth: '+12%', engagement: '6.8%', posts: 22, trend: 'up' },
  { name: 'YouTube', reach: '14.8K', growth: '+8%', engagement: '5.1%', posts: 6, trend: 'up' },
  { name: 'LinkedIn', reach: '6.3K', growth: '-3%', engagement: '4.2%', posts: 8, trend: 'down' },
  { name: 'X', reach: '2.9K', growth: '+5%', engagement: '3.1%', posts: 12, trend: 'up' },
  { name: 'Facebook', reach: '0.8K', growth: '-8%', engagement: '1.4%', posts: 4, trend: 'down' },
]

const INSIGHTS = [
  { icon: '🔥', text: 'Bài dạng Reel hiệu quả hơn 2.3x so với Photo trên Instagram của bạn.' },
  { icon: '⏰', text: 'Giờ vàng đăng bài: Thứ 3 & Thứ 5 lúc 19:00–21:00 trên TikTok.' },
  { icon: '📈', text: 'TikTok đang tăng trưởng nhanh nhất — tập trung vào đây sẽ tối ưu ROI.' },
  { icon: '💡', text: 'Hashtag #contentcreator & #aitools mang lại reach cao nhất tháng này.' },
]

const WEEKLY_BARS = [45, 60, 38, 85, 52, 90, 68]

export default function AnalyticsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Performance Analytics</h1>
          <p className={styles.subtitle}>Tổng quan hiệu suất content tháng này</p>
        </div>
        <span className={styles.dateBadge}>Feb 1 – Feb 24, 2026</span>
      </div>

      {/* Top metrics */}
      <div className={styles.metricsRow}>
        {[
          { icon: <Eye size={18} />, label: 'Total Reach', value: 128400, delta: '+24%', color: '#8b5cf6', isK: true },
          { icon: <Heart size={18} />, label: 'Avg. Engagement', value: 8, delta: '+11%', color: '#ec4899', isPercent: true },
          { icon: <Users size={18} />, label: 'Follower Growth', value: 1240, delta: 'this month', color: '#22d3ee' },
          { icon: <BarChart3 size={18} />, label: 'Total Posts', value: 70, delta: 'across 6 platforms', color: '#f59e0b' },
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
        {/* Weekly chart */}
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

        {/* AI Insights */}
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

      {/* Best Time to Post Heatmap */}
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

      {/* Platform breakdown */}
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
            {PLATFORMS_DATA.map(p => (
              <tr key={p.name}>
                <td><span className={styles.platformName}>{p.name}</span></td>
                <td className={styles.reach}>{p.reach}</td>
                <td>
                  <span className={styles.growth} style={{ color: p.growth.startsWith('+') ? '#22c55e' : '#ef4444' }}>
                    {p.growth}
                  </span>
                </td>
                <td className={styles.engagement}>{p.engagement}</td>
                <td className={styles.posts}>{p.posts}</td>
                <td>
                  {p.trend === 'up'
                    ? <TrendingUp size={16} color="#22c55e" />
                    : <TrendingDown size={16} color="#ef4444" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
