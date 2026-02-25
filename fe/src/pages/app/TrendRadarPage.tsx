import { TrendingUp, BarChart2, Hash, Zap, Sparkles, Filter } from 'lucide-react'
import styles from './TrendRadarPage.module.css'

const TRENDING_TOPICS = [
  { id: 't1', topic: 'AI Workflow Automation', growth: '+142%', category: 'Tech', volume: '24.5K', sentiment: '🔥 Very High' },
  { id: 't2', topic: 'Digital Nomad Minimalism', growth: '+86%', category: 'Lifestyle', volume: '12.1K', sentiment: '✨ High' },
  { id: 't3', topic: 'Sustainable Creator Economy', growth: '+54%', category: 'Business', volume: '9.8K', sentiment: '📈 Rising' },
  { id: 't4', topic: 'Prompt Engineering for Artists', growth: '+120%', category: 'Tech', volume: '18.2K', sentiment: '🔥 Very High' },
  { id: 't5', topic: 'Slow Living content', growth: '+42%', category: 'Lifestyle', volume: '8.4K', sentiment: '📈 Rising' },
]

const POPULAR_HASHTAGS = [
  { tag: '#aitools', growth: '+210%', color: '#8b5cf6' },
  { tag: '#productivity', growth: '+85%', color: '#ec4899' },
  { tag: '#contentcreator', growth: '+120%', color: '#22d3ee' },
  { tag: '#solopreneur', growth: '+45%', color: '#f59e0b' },
  { tag: '#futureofwork', growth: '+160%', color: '#10b981' },
]

export default function TrendRadarPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className={styles.title}>AI Trend Radar</h1>
            <p className={styles.subtitle}>Khám phá xu hướng mới nhất được cá nhân hóa cho niche của bạn</p>
          </div>
        </div>
        <button className="btn-secondary" style={{ fontSize: 13 }}>
          <Filter size={14} /> Lọc theo Niche
        </button>
      </div>

      <div className={styles.body}>
        {/* Main Trends Table */}
        <div className={`glass-card ${styles.trendsCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>🔥 Xu hướng đang bùng nổ</h2>
            <span className={styles.cardBadge}>Cập nhật 5 phút trước</span>
          </div>
          
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Growth</th>
                  <th>Category</th>
                  <th>Volume</th>
                  <th>Sentiment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {TRENDING_TOPICS.map(t => (
                  <tr key={t.id}>
                    <td className={styles.topicName}>{t.topic}</td>
                    <td><span className={styles.growthTag}>{t.growth}</span></td>
                    <td><span className={styles.categoryTag}>{t.category}</span></td>
                    <td className={styles.volume}>{t.volume}</td>
                    <td><span className={styles.sentiment}>{t.sentiment}</span></td>
                    <td>
                      <button className={styles.useBtn}>
                        <Zap size={14} /> Tạo Content
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Hashtags & Stats */}
        <div className={styles.sidebar}>
          {/* Hashtags Card */}
          <div className={`glass-card ${styles.hashtagCard}`}>
            <h3 className={styles.sidebarTitle}><Hash size={18} /> Hashtag thịnh hành</h3>
            <div className={styles.hashtagList}>
              {POPULAR_HASHTAGS.map(h => (
                <div key={h.tag} className={styles.hashtagItem}>
                  <span className={styles.hashtagName} style={{ color: h.color }}>{h.tag}</span>
                  <span className={styles.hashtagGrowth}>{h.growth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Tip */}
          <div className={`glass-card ${styles.tipCard}`}>
            <div className={styles.tipIcon}><Sparkles size={20} /></div>
            <h3 className={styles.tipTitle}>Mẹo nội dung hôm nay</h3>
            <p className={styles.tipText}>
              Chủ đề <strong>"AI Workflow"</strong> đang có xu hướng tăng mạnh trên LinkedIn. 
              Hãy thử tạo một bài chia sẻ quy trình làm việc của bạn để thu hút engagement cao.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
