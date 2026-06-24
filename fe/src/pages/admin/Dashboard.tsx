import styles from './AdminLayout.module.css'
import dashStyles from './AdminDashboard.module.css'
import TrendChart from './components/TrendChart'
import BarChart from './components/BarChart'
import DonutChart from './components/DonutChart'
import Sparkline from './components/Sparkline'
import ProgressRing from './components/ProgressRing'
import { useAdminOverview } from '../../hooks/useAdminOverview'
import { useRevenueAnalytics } from '../../hooks/useRevenueAnalytics'
import { useMemo, useState } from 'react'
import { FaTwitter, FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaPinterest, FaTelegram, FaSnapchat, FaReddit, FaDiscord, FaChartLine, FaUsers, FaMoneyBillWave, FaCheckCircle } from 'react-icons/fa'
import { formatVnd } from './utils/currency'

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2' },
  { id: 'facebook', name: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', icon: FaTiktok, color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: FaYoutube, color: '#FF0000' },
  { id: 'pinterest', name: 'Pinterest', icon: FaPinterest, color: '#BD081C' },
  { id: 'telegram', name: 'Telegram', icon: FaTelegram, color: '#0088cc' },
  { id: 'snapchat', name: 'Snapchat', icon: FaSnapchat, color: '#FFFC00' },
  { id: 'reddit', name: 'Reddit', icon: FaReddit, color: '#64748B' },
  { id: 'discord', name: 'Discord', icon: FaDiscord, color: '#5865F2' },
]

// TRIỆT TIÊU: Loại bỏ toàn bộ các mảng số liệu chạy đều ngẫu nhiên từ M1-M12 ở fallback dữ liệu mẫu
const fallbackMock = {
  metrics: [
    { id: 'posts', title: 'Bài viết đã đăng', value: '0' },
    { id: 'scheduled', title: 'Bài viết lên lịch', value: '0' },
    { id: 'accounts', title: 'Tài khoản MXH', value: 0 },
    { id: 'workspaces', title: 'Workspaces', value: 0 },
  ],
  activities: [],
  postsByPlatform: {
    twitter: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    linkedin: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    facebook: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    instagram: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tiktok: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    youtube: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  engagementByPlatform: {
    all: { published: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], scheduled: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], failed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  },
  userConversion: {
    newUsers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    activeUsers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    nonActiveUsers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
}

const calculateSuccessRate = (published: number[] = [], failed: number[] = []) => {
  const pubSum = published.reduce((a, b) => a + b, 0);
  const failSum = failed.reduce((a, b) => a + b, 0);
  const total = pubSum + failSum;
  return total > 0 ? ((pubSum / total) * 100).toFixed(1) : '0.0';
};

export default function AdminDashboard() {
  const { data, isLoading, isError } = useAdminOverview()
  const { data: revenueData } = useRevenueAnalytics()
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [chartPlatform, setChartPlatform] = useState<string>('all')

  const yearlyLabels = useMemo(() => Array.from({ length: 12 }, (_, i) => `M${i + 1}`), []);

  const metrics = useMemo(() => {
    if (data?.overview?.Metrics || data?.overview?.metrics) return data.overview.Metrics ?? data.overview.metrics
    return isLoading ? [] : fallbackMock.metrics
  }, [data, isLoading])

  const activities = useMemo(() => {
    if (data?.overview?.RecentActivities || data?.overview?.recentActivities) return data.overview.RecentActivities ?? data.overview.recentActivities
    return isLoading ? [] : fallbackMock.activities
  }, [data, isLoading])

  const postsByPlatform = useMemo(() => {
    const postsData = data?.overview?.PostsByPlatform ?? data?.overview?.postsByPlatform
    const sanitized: any = {
      twitter: Array(12).fill(0), linkedin: Array(12).fill(0), facebook: Array(12).fill(0),
      instagram: Array(12).fill(0), tiktok: Array(12).fill(0), youtube: Array(12).fill(0),
    }

    if (postsData && Object.keys(postsData).length > 0) {
      Object.keys(postsData).forEach((key) => {
        const arr = postsData[key]
        if (Array.isArray(arr)) {
          if (arr.length === 12) {
            sanitized[key] = arr
          } else if (arr.length > 0) {
            sanitized[key][11] = arr[arr.length - 1] // Ép giá trị mới nhất về M12
          }
        }
      })
      return sanitized
    }
    
    return isLoading ? sanitized : fallbackMock.postsByPlatform
  }, [data, isLoading])

  const postStatusTrends = useMemo(() => {
    const raw =
      data?.overview?.EngagementByPlatform?.all ||
      data?.overview?.EngagementByPlatform?.All ||
      data?.overview?.engagementByPlatform?.all
    const cleanEmpty = { published: Array(12).fill(0), scheduled: Array(12).fill(0), failed: Array(12).fill(0) }

    if (raw) {
      if (Array.isArray(raw.published) && raw.published.length === 12) return raw
      if (Array.isArray(raw.published) && raw.published.length > 0) cleanEmpty.published[11] = raw.published[raw.published.length - 1]
      if (Array.isArray(raw.scheduled) && raw.scheduled.length > 0) cleanEmpty.scheduled[11] = raw.scheduled[raw.scheduled.length - 1]
      if (Array.isArray(raw.failed) && raw.failed.length > 0) cleanEmpty.failed[11] = raw.failed[raw.failed.length - 1]
      return cleanEmpty
    }

    return fallbackMock.engagementByPlatform.all
  }, [data])

  // FIX TRIỆT ĐỂ: Ép mảng doanh thu tổng hợp dứt khoát về 0 từ M1->M11. Chỉ gán vào M12 số thực.
  const revenueTrendData = useMemo(() => {
    const monthlyRevenue = revenueData?.trends?.monthlyRevenue ?? revenueData?.Trends?.MonthlyRevenue ?? []
    if (!Array.isArray(monthlyRevenue)) return Array(12).fill(0)
    if (monthlyRevenue.length >= 12) return monthlyRevenue.slice(-12).map(Number)
    return [...Array(12 - monthlyRevenue.length).fill(0), ...monthlyRevenue.map(Number)]
  }, [revenueData])

  // FIX TRIỆT ĐỂ: Các mảng nhỏ sparkline và biểu đồ doanh thu chi tiết cũng ép cứng về 0 từ M1 -> M11
  const revenueByPlan = useMemo(() => {
    const freeRevenue = revenueData?.plansByUsage?.find((p: any) => p.planCode === 'FREE')?.monthlyRevenue || 0
    const proRevenue = revenueData?.plansByUsage?.find((p: any) => p.planCode === 'PRO')?.monthlyRevenue || 0
    const teamRevenue = revenueData?.plansByUsage?.find((p: any) => p.planCode === 'TEAM')?.monthlyRevenue || 0

    const baseFree = Array(12).fill(0); baseFree[11] = freeRevenue;
    const basePro = Array(12).fill(0); basePro[11] = proRevenue;
    const baseTeam = Array(12).fill(0); baseTeam[11] = teamRevenue;

    return { free: baseFree, pro: basePro, team: baseTeam }
  }, [revenueData])

  const userConversion = useMemo(() => {
    const uc = data?.overview?.UserConversion || data?.overview?.userConversion
    const cleanEmpty = { newUsers: Array(12).fill(0), activeUsers: Array(12).fill(0), nonActiveUsers: Array(12).fill(0) }

    if (uc) {
      if (Array.isArray(uc.newUsers) && uc.newUsers.length === 12) return uc
      if (Array.isArray(uc.newUsers) && uc.newUsers.length > 0) cleanEmpty.newUsers[11] = uc.newUsers[uc.newUsers.length - 1]
      if (Array.isArray(uc.activeUsers) && uc.activeUsers.length > 0) cleanEmpty.activeUsers[11] = uc.activeUsers[uc.activeUsers.length - 1]
      if (Array.isArray(uc.nonActiveUsers) && uc.nonActiveUsers.length > 0) cleanEmpty.nonActiveUsers[11] = uc.nonActiveUsers[uc.nonActiveUsers.length - 1]
      return cleanEmpty
    }
    return fallbackMock.userConversion
  }, [data])

  const currentPosts = useMemo(() => {
    if (chartPlatform === 'all') {
      const allPosts: number[] = []
      const platformKeys = Object.keys(postsByPlatform)
      if (platformKeys.length === 0) return Array(12).fill(0)
      
      for (let i = 0; i < 12; i++) {
        let monthPosts = 0
        platformKeys.forEach(key => {
          const platformData = postsByPlatform[key]
          if (platformData && platformData[i] !== undefined) {
            monthPosts += platformData[i]
          }
        })
        allPosts.push(monthPosts)
      }
      return allPosts
    }
    return postsByPlatform[chartPlatform] || Array(12).fill(0)
  }, [postsByPlatform, chartPlatform])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Bảng điều khiển Admin</h1>
          <div style={{ color: '#605d52' }}>Tổng quan hệ thống quản lý mạng xã hội Syncra</div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 20, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#605d52', fontWeight: 600 }}>Lọc hệ thống:</span>
          <button
            onClick={() => setSelectedPlatform('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: selectedPlatform === 'all' ? '2px solid var(--color-primary)' : '1px solid #e5e5e5',
              background: selectedPlatform === 'all' ? 'var(--color-primary)' : '#fff',
              color: selectedPlatform === 'all' ? '#fff' : '#333',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Tất cả hệ thống
          </button>
        </div>
      </div>

      <div className={dashStyles.metricsRow}>
        {metrics.map((m:any) => {
          const actualValue = typeof m.value === 'string' ? parseFloat(m.value.replace(/,/g, '')) : (m.value || 0);
          const sparklineData = Array(12).fill(0);
          sparklineData[11] = actualValue; // Chỉ hiển thị chấm mốc ở tháng cuối
          
          return (
            <div key={m.id} className={dashStyles.metricCard} style={{ 
              background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div className={dashStyles.metricTitle}>{m.title}</div>
                {m.id === 'posts' && <FaChartLine color="#FF4F4F" size={18} />}
                {m.id === 'scheduled' && <FaCheckCircle color="#10B981" size={18} />}
                {m.id === 'accounts' && <FaUsers color="#2563EB" size={18} />}
                {m.id === 'workspaces' && <FaMoneyBillWave color="#8B5CF6" size={18} />}
              </div>
              <div className={dashStyles.metricValue}>{m.value}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Sparkline data={sparklineData} color={m.id === 'posts' ? '#FF4F4F' : m.id === 'scheduled' ? '#10B981' : m.id === 'accounts' ? '#2563EB' : '#8B5CF6'} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                Bài viết theo nền tảng (12 tháng)
                <select 
                  value={chartPlatform} 
                  onChange={(e) => setChartPlatform(e.target.value)}
                  style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12, background: '#fff', cursor: 'pointer' }}
                >
                  <option value="all">Tất cả nền tảng</option>
                  {PLATFORMS.slice(0, 6).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#333', marginTop: 4 }}>
                {chartPlatform === 'all' ? (metrics.find((m:any)=>m.id==='posts')?.value ?? '0') : (currentPosts[11] || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#939084' }}>Xu hướng năm</div>
              <Sparkline data={currentPosts} color="#FF4F4F" />
            </div>
          </div>
          <div style={{ height: 220 }}>
            <TrendChart data={currentPosts} labels={yearlyLabels} />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className={styles.card} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff' }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Tài khoản MXH mới</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{data?.overview?.newAccounts24h ?? '0'}</div>
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>24 giờ qua</div>
          </div>

          <div className={styles.card} style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff' }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Tỷ lệ thành công</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {calculateSuccessRate(postStatusTrends.published, postStatusTrends.failed)}%
            </div>
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>12 tháng qua</div>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Bài viết đã đăng</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{(postStatusTrends.published[11] ?? 0).toLocaleString()}</div>
            </div>
            <ProgressRing value={postStatusTrends.published[11] ?? 0} max={100} color="#10B981" />
          </div>
          <BarChart data={postStatusTrends.published} colors={postStatusTrends.published.map(() => '#10B981')} labels={yearlyLabels} />
        </div>

        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Bài viết lên lịch</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{(postStatusTrends.scheduled[11] ?? 0).toLocaleString()}</div>
            </div>
            <ProgressRing value={postStatusTrends.scheduled[11] ?? 0} max={50} color="#2563EB" />
          </div>
          <BarChart data={postStatusTrends.scheduled} colors={postStatusTrends.scheduled.map(() => '#2563EB')} labels={yearlyLabels} />
        </div>

        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Bài viết thất bại</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{(postStatusTrends.failed[11] ?? 0).toLocaleString()}</div>
            </div>
            <ProgressRing value={postStatusTrends.failed[11] ?? 0} max={10} color="#FF4F4F" />
          </div>
          <BarChart data={postStatusTrends.failed} colors={postStatusTrends.failed.map(() => '#FF4F4F')} labels={yearlyLabels} />
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Doanh thu tổng hợp theo các gói (12 tháng)</h3>
          <div style={{ height: 200 }}>
            <TrendChart data={revenueTrendData} labels={yearlyLabels} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150, padding: 12, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 12, color: '#605d52', marginBottom: 4 }}>Free</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#8B5CF6' }}>{formatVnd(revenueByPlan.free[11])}</div>
              <Sparkline data={revenueByPlan.free} color="#8B5CF6" />
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: 12, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 12, color: '#605d52', marginBottom: 4 }}>Pro</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{formatVnd(revenueByPlan.pro[11])}</div>
              <Sparkline data={revenueByPlan.pro} color="#2563EB" />
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: 12, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 12, color: '#605d52', marginBottom: 4 }}>Team</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#8F4FFF' }}>{formatVnd(revenueByPlan.team[11])}</div>
              <Sparkline data={revenueByPlan.team} color="#8F4FFF" />
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Phân bố nền tảng</h3>
          <DonutChart 
            data={Object.keys(postsByPlatform).map(k => (postsByPlatform[k] as number[]).reduce((a,b)=>a+b,0))} 
            labels={Object.keys(postsByPlatform).map(k => PLATFORMS.find(p => p.id === k)?.name || k)}
            colors={Object.keys(postsByPlatform).map(k => PLATFORMS.find(p => p.id === k)?.color || '#999')}
          />
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Chuyển đổi người dùng</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaUsers color="#2563EB" size={20} />
              <div style={{ fontSize: 18, fontWeight: 700 }}>{userConversion.newUsers[11] ?? 0}</div>
            </div>
          </div>
          <TrendChart data={userConversion.newUsers} labels={yearlyLabels} />
        </div>

        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Hoạt động người dùng</h3>
          <TrendChart data={userConversion.activeUsers} labels={yearlyLabels} />
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Tổng quan phân bổ bài đăng tổng hợp</h3>
        <BarChart 
          data={currentPosts} 
          colors={yearlyLabels.map((_, i) => i === 11 ? '#1877F2' : '#e5e5e5')}
          labels={yearlyLabels}
        />
      </div>

      <div style={{ height: 20 }} />

      <div className={styles.card}>
        <h3 style={{ marginTop: 0 }}>Hoạt động hệ thống gần đây</h3>
        {isLoading ? (
          <div>Đang tải dữ liệu...</div>
        ) : isError ? (
          <div>Lỗi khi tải dữ liệu hệ thống.</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #eaeaea' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
              <thead style={{ background: '#fafafa', borderBottom: '1px solid #eaeaea' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Loại</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nền tảng</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Thời gian</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Người dùng</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a:any, i:number) => {
                  const platform = PLATFORMS.find(p => p.id === a.platform)
                  const Icon = platform?.icon
                  const isSuccess = a.status === 'Success'
                  const isFailed = a.status === 'Failed'
                  
                  return (
                    <tr key={a.id} style={{ borderBottom: i === activities.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', color: '#666' }}>{a.id}</td>
                      <td style={{ padding: '12px 16px' }}>{a.type}</td>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {Icon && <Icon size={14} color={platform?.color} />}
                        <span>{platform?.name || a.platform || '-'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: isSuccess ? 'rgba(79, 255, 79, 0.15)' : isFailed ? 'rgba(255, 79, 79, 0.15)' : 'rgba(79, 143, 255, 0.15)',
                          color: isSuccess ? '#2eab2e' : isFailed ? '#e63946' : '#2a6fdb'
                        }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{a.when}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{a.user}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
