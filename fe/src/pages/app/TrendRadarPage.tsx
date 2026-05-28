import { TrendingUp, Hash, Zap, Sparkles, Filter, AlertTriangle, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '../../context/WorkspaceContext'
import { trendsApi } from '../../api/trends'
import Skeleton from '../../components/Skeleton'
import styles from './TrendRadarPage.module.css'

const getSentimentClass = (sentiment: string) => {
  const s = sentiment.toLowerCase()
  if (s.includes('tích cực') || s.includes('positive') || s.includes('high')) return styles.sentimentPositive
  if (s.includes('tiêu cực') || s.includes('negative')) return styles.sentimentNegative
  return styles.sentimentNeutral
}

export default function TrendRadarPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['trends', workspaceId],
    queryFn: () => trendsApi.getTrends(workspaceId!),
    enabled: Boolean(workspaceId),
  })

  // Loading skeleton
  if (isLoading) {
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
        </div>
        <div className={styles.body}>
          <div className={styles.trendsCard}>
            <div className={styles.cardHeader}>
              <Skeleton width="180px" height="24px" />
              <Skeleton width="120px" height="20px" borderRadius="100px" />
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
                  {Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width="140px" height="18px" /></td>
                      <td><Skeleton width="60px" height="18px" /></td>
                      <td><Skeleton width="80px" height="18px" /></td>
                      <td><Skeleton width="50px" height="18px" /></td>
                      <td><Skeleton width="70px" height="18px" borderRadius="100px" /></td>
                      <td><Skeleton width="90px" height="28px" borderRadius="8px" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={styles.sidebar}>
            <div className={styles.hashtagCard}>
              <Skeleton width="120px" height="20px" style={{ marginBottom: 16 }} />
              <div className={styles.hashtagList}>
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className={styles.hashtagItem} style={{ border: 'none', background: 'transparent', padding: 0 }}>
                    <Skeleton width="100%" height="38px" borderRadius="12px" />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.tipCard}>
              <Skeleton width="40px" height="40px" borderRadius="50%" style={{ marginBottom: 12 }} />
              <Skeleton width="150px" height="20px" style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height="16px" style={{ marginBottom: 6 }} />
              <Skeleton width="80%" height="16px" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
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
        </div>
        <div className={styles.body}>
          <div className={styles.trendsCard}>
            <div className={styles.errorState}>
              <AlertTriangle size={32} className={styles.errorIcon} />
              <h3 className={styles.errorTitle}>Không thể tải xu hướng</h3>
              <p className={styles.errorText}>{(error as { message?: string })?.message || 'Đã có lỗi xảy ra khi tải dữ liệu xu hướng.'}</p>
              <button className={styles.retryBtn} onClick={() => refetch()}>
                <RefreshCw size={14} /> Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!data || (data.trendingTopics.length === 0 && data.popularHashtags.length === 0)) {
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
        </div>
        <div className={styles.body}>
          <div className={styles.trendsCard}>
            <div className={styles.emptyState}>
              <Sparkles size={32} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>Chưa có dữ liệu xu hướng</h3>
              <p className={styles.emptyText}>Kết nối tài khoản mạng xã hội để nhận xu hướng được cá nhân hóa.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { trendingTopics, popularHashtags, tip } = data

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
        <button className={styles.filterBtn}>
          <Filter size={14} /> Lọc theo Niche
        </button>
      </div>

      <div className={styles.body}>
        {/* Main Trends Table */}
        <div className={styles.trendsCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>🔥 Xu hướng đang bùng nổ</h2>
            <span className={styles.cardBadge}>Cập nhật từ Zernio</span>
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
                {trendingTopics.map(t => (
                  <tr key={t.id}>
                    <td className={styles.topicName}>{t.topic}</td>
                    <td><span className={styles.growthTag}>{t.growth}</span></td>
                    <td><span className={styles.categoryTag}>{t.category}</span></td>
                    <td className={styles.volume}>{t.volume}</td>
                    <td>
                      <span className={getSentimentClass(t.sentiment)}>
                        {t.sentiment}
                      </span>
                    </td>
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
          <div className={styles.hashtagCard}>
            <h3 className={styles.sidebarTitle}><Hash size={18} /> Hashtag thịnh hành</h3>
            <div className={styles.hashtagList}>
              {popularHashtags.map(h => (
                <div key={h.tag} className={styles.hashtagItem}>
                  <span className={styles.hashtagName} style={{ color: h.color }}>{h.tag}</span>
                  <span className={styles.hashtagGrowth}>{h.growth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Tip */}
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}><Sparkles size={20} /></div>
            <h3 className={styles.tipTitle}>Mẹo nội dung hôm nay</h3>
            <p className={styles.tipText}>{tip}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
