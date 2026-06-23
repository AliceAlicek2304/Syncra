import styles from './AdminLayout.module.css'
import TrendChart from './components/TrendChart'
import BarChart from './components/BarChart'
import { useState, useMemo } from 'react'
import { FaNewspaper, FaCheckCircle, FaClock, FaEdit } from 'react-icons/fa'
import { usePostAnalytics } from '../../hooks/usePostAnalytics'

export default function PostAnalytics() {
  const { data, isLoading } = usePostAnalytics()
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const postMetrics = useMemo(() => {
    if (data?.Metrics || data?.metrics) return data.Metrics ?? data.metrics
    return isLoading ? [] : []
  }, [data, isLoading])

  const postsByStatus = useMemo(() => {
    if (data?.PostsByStatus || data?.postsByStatus) return data.PostsByStatus ?? data.postsByStatus
    return isLoading ? [] : []
  }, [data, isLoading])

  const postsByPlatform = useMemo(() => {
    if (data?.PostsByPlatform || data?.postsByPlatform) return data.PostsByPlatform ?? data.postsByPlatform
    return isLoading ? [] : []
  }, [data, isLoading])

  const filteredPostsByPlatform = useMemo(() => {
    if (selectedPlatform === 'all') return postsByPlatform
    return postsByPlatform.filter((p: any) => p.platform.toLowerCase() === selectedPlatform.toLowerCase())
  }, [postsByPlatform, selectedPlatform])

  const trends = useMemo(() => {
    if (data?.Trends || data?.trends) return data.Trends ?? data.trends
    return null
  }, [data, isLoading])

  const topPosters = useMemo(() => {
    if (data?.TopPosters || data?.topPosters) return data.TopPosters ?? data.topPosters
    return isLoading ? [] : []
  }, [data, isLoading])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Phân tích bài đăng</h1>
          <div style={{ color: '#605d52' }}>Thống kê chi tiết về bài đăng và hiệu suất đăng bài</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
        {postMetrics.map((m: any) => (
          <div key={m.id} className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: m.id === 'total' ? '#4F8FFF' : m.id === 'published' ? '#4FFF4F' : m.id === 'scheduled' ? '#FFC84F' : '#e5e5e5',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20
              }}>
                {m.id === 'total' && <FaNewspaper />}
                {m.id === 'published' && <FaCheckCircle />}
                {m.id === 'scheduled' && <FaClock />}
                {m.id === 'draft' && <FaEdit />}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#605d52', fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{m.value}</div>
                <div style={{ fontSize: 12, color: m.trend === 'up' ? '#4FFF4F' : '#FF4F4F', fontWeight: 600 }}>
                  {m.growth}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 20 }} />

      {/* Main Trends Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Line Chart */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Xu hướng bài đăng (12 tháng)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>
                {trends?.currentMonthPosts ?? trends?.CurrentMonthPosts ?? 0}{' '}
                <span style={{fontSize: 14, color: '#4FFF4F', fontWeight: 600}}>
                  {(trends?.postsGrowth ?? trends?.PostsGrowth ?? 0) >= 0 ? '+' : ''}{trends?.postsGrowth ?? trends?.PostsGrowth ?? 0}
                </span>
              </div>
            </div>
          </div>
          <TrendChart data={trends?.monthlyPosts ?? trends?.MonthlyPosts ?? []} />
          <div style={{ height: 16 }} />
          <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Bài đăng đã xuất bản</div>
          <TrendChart data={trends?.publishedPosts ?? trends?.PublishedPosts ?? []} />
        </div>

        {/* Posts by Status */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Trạng thái bài đăng</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {postsByStatus.length > 0 ? postsByStatus.map((status: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{status.status}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#4F8FFF' }}>{status.count}</div>
              </div>
            )) : (
              <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '20px 0' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* Posts by Platform */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Bài đăng theo nền tảng</h3>
            <select 
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 8, 
                border: '1px solid #e5e5e5', 
                fontSize: 12,
                background: '#fff'
              }}
            >
              <option value="all">Tất cả nền tảng</option>
              {postsByPlatform.map((p: any) => (
                <option key={p.platform} value={p.platform.toLowerCase()}>{p.platform}</option>
              ))}
            </select>
          </div>
          <BarChart 
            data={filteredPostsByPlatform.map((p: any) => p.count)} 
            labels={filteredPostsByPlatform.map((p: any) => p.platform)}
            colors={['#4F8FFF', '#4FFF4F', '#FFC84F', '#8F4FFF', '#FF4F4F']}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 11, color: '#666', fontWeight: 600 }}>
            {filteredPostsByPlatform.length > 0 ? filteredPostsByPlatform.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.platform}</span>
                <span>{p.count} ({p.percentage}%)</span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Top Posters */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Top người đăng bài</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topPosters.length > 0 ? topPosters.map((poster: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i === topPosters.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{poster.userName}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{poster.email}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#4F8FFF' }}>{poster.postCount}</div>
              </div>
            )) : (
              <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '20px 0' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
