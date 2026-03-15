import { TrendingUp, BarChart3, Globe2, CalendarClock, Sparkles, ArrowUpRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import OnboardingTour from '../../components/OnboardingTour'
import CountingNumber from '../../components/CountingNumber'
import styles from './DashboardPage.module.css'

const QUICK_STATS = [
  { label: 'Tổng lượt reach', value: 128400, delta: '+24%', icon: <TrendingUp size={18} />, color: '#8b5cf6', isK: true },
  { label: 'Engagement rate', value: 8, delta: '+11%', icon: <BarChart3 size={18} />, color: '#ec4899', isPercent: true },
  { label: 'Platforms kết nối', value: 6, delta: 'active', icon: <Globe2 size={18} />, color: '#22d3ee' },
  { label: 'Posts đã schedule', value: 12, delta: 'tháng này', icon: <CalendarClock size={18} />, color: '#f59e0b' },
]

const RECENT_POSTS = [
  { title: 'Tips làm content cho người mới bắt đầu', platform: 'TikTok', status: 'published', reach: '24.1K', date: 'Hôm nay 19:00' },
  { title: 'AI Tools miễn phí thay đổi workflow của mình', platform: 'Instagram', status: 'scheduled', reach: '—', date: 'Mai 08:00' },
  { title: 'Day in my life làm content creator 😅', platform: 'TikTok', status: 'scheduled', reach: '—', date: 'Thứ 5 20:00' },
  { title: '5 lỗi sai khi mới bắt đầu làm YouTube', platform: 'YouTube', status: 'draft', reach: '—', date: 'Chưa lên lịch' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={styles.page}>

      <div className={styles.welcome}>
        <div>
          <h1 className={styles.title}>Chào buổi tối, {user?.displayName?.split(' ')[0] || 'bạn'} 👋</h1>
          <p className={styles.subtitle}>Đây là tổng quan hiệu suất content của bạn hôm nay.</p>
        </div>
      </div>


      <div className={styles.statsGrid}>
        {QUICK_STATS.map(s => (
          <div key={s.label} className={`glass-card ${styles.statCard}`}>
            <div className={styles.statIcon} style={{ color: s.color, background: `${s.color}18` }}>
              {s.icon}
            </div>
            <div className={styles.statValue}>
              <CountingNumber
                value={s.value}
                format={(v) => {
                  if (s.isK) return `${(v / 1000).toFixed(1)}K`
                  if (s.isPercent) return `${v}.4%`
                  return v.toString()
                }}
              />
            </div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statDelta} style={{ color: s.delta.startsWith('+') ? '#22c55e' : s.color }}>
              {s.delta}
            </div>
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Platform</th>
              <th>Trạng thái</th>
              <th>Reach</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_POSTS.map(p => (
              <tr key={p.title}>
                <td className={styles.postTitle}>{p.title}</td>
                <td><span className={styles.platformTag}>{p.platform}</span></td>
                <td>
                  <span className={`${styles.status} ${styles[`status_${p.status}`]}`}>
                    {p.status === 'published' ? '✅ Đã đăng' : p.status === 'scheduled' ? '⏰ Scheduled' : '📝 Draft'}
                  </span>
                </td>
                <td className={styles.reach}>{p.reach}</td>
                <td className={styles.date}>{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className={`glass-card ${styles.aiTip}`}>
        <div className={styles.aiTipIcon}><Sparkles size={18} /></div>
        <div>
          <div className={styles.aiTipTitle}>Gợi ý từ AI</div>
          <div className={styles.aiTipText}>
            Posts dạng <strong>Reel</strong> của bạn đang có engagement cao hơn 2.3x so với Photo.
            Thử tạo thêm Reel tuần này nhé — đặc biệt vào <strong>Thứ 3 & Thứ 5 lúc 19:00</strong>.
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
