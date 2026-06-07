import styles from './AdminLayout.module.css'
import dashStyles from './AdminDashboard.module.css'
import TrendChart from './components/TrendChart'
import { useAdminOverview } from '../../hooks/useAdminOverview'
import { useMemo, useState } from 'react'
import { FaTwitter, FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube, FaPinterest, FaTelegram, FaSnapchat, FaReddit, FaDiscord } from 'react-icons/fa'

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
  { id: 'reddit', name: 'Reddit', icon: FaReddit, color: '#FF4500' },
  { id: 'discord', name: 'Discord', icon: FaDiscord, color: '#5865F2' },
]

const fallbackMock = {
  metrics: [
    { id: 'posts', title: 'Bài viết đã đăng', value: '12,450' },
    { id: 'scheduled', title: 'Bài viết lên lịch', value: '2,340' },
    { id: 'accounts', title: 'Tài khoản MXH', value: 856 },
    { id: 'workspaces', title: 'Workspaces', value: 125 },
  ],
  activities: [
    { id: 'P-1024', type: 'Publish', status: 'Success', when: '2m', user: 'alice@acme.com', platform: 'twitter' },
    { id: 'P-1023', type: 'Schedule', status: 'Scheduled', when: '10m', user: 'bob@acme.com', platform: 'linkedin' },
    { id: 'P-1022', type: 'Publish', status: 'Failed', when: '1h', user: 'carol@acme.com', platform: 'facebook' },
    { id: 'P-1021', type: 'Connect', status: 'Success', when: '2h', user: 'dave@acme.com', platform: 'instagram' },
  ],
  postsByPlatform: {
    twitter: [120, 145, 132, 156, 178, 190, 210, 225, 240, 255, 270, 285],
    linkedin: [85, 92, 98, 105, 112, 118, 125, 132, 138, 145, 152, 158],
    facebook: [200, 215, 230, 245, 260, 275, 290, 305, 320, 335, 350, 365],
    instagram: [65, 72, 78, 85, 92, 98, 105, 112, 118, 125, 132, 138],
    tiktok: [45, 52, 58, 65, 72, 78, 85, 92, 98, 105, 112, 118],
    youtube: [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
  },
  engagementByPlatform: {
    twitter: { likes: [1200, 1350, 1280, 1420, 1560, 1680, 1800, 1920, 2040, 2160, 2280, 2400], shares: [80, 95, 88, 102, 115, 128, 140, 152, 164, 176, 188, 200] },
    facebook: { likes: [2500, 2650, 2580, 2720, 2860, 3000, 3140, 3280, 3420, 3560, 3700, 3840], shares: [150, 165, 158, 172, 185, 198, 210, 222, 234, 246, 258, 270] },
    instagram: { likes: [1800, 1950, 1880, 2020, 2160, 2300, 2440, 2580, 2720, 2860, 3000, 3140], shares: [120, 135, 128, 142, 155, 168, 180, 192, 204, 216, 228, 240] },
    linkedin: { likes: [800, 950, 880, 1020, 1160, 1300, 1440, 1580, 1720, 1860, 2000, 2140], shares: [60, 75, 68, 82, 95, 108, 120, 132, 144, 156, 168, 180] },
    tiktok: { likes: [3500, 3650, 3580, 3720, 3860, 4000, 4140, 4280, 4420, 4560, 4700, 4840], shares: [200, 215, 208, 222, 235, 248, 260, 272, 284, 296, 308, 320] },
    youtube: { likes: [1500, 1650, 1580, 1720, 1860, 2000, 2140, 2280, 2420, 2560, 2700, 2840], shares: [100, 115, 108, 122, 135, 148, 160, 172, 184, 196, 208, 220] },
  },
  revenueByPlan: {
    starter: [1200, 1350, 1280, 1420, 1560, 1680, 1800, 1920, 2040, 2160, 2280, 2400],
    pro: [2800, 2950, 2880, 3020, 3160, 3300, 3440, 3580, 3720, 3860, 4000, 4140],
    enterprise: [4500, 4650, 4580, 4720, 4860, 5000, 5140, 5280, 5420, 5560, 5700, 5840],
  },
  userConversion: {
    newUsers: [45, 52, 48, 55, 62, 68, 75, 82, 88, 95, 102, 108],
    activeUsers: [320, 335, 328, 342, 356, 370, 384, 398, 412, 426, 440, 454],
    nonActiveUsers: [180, 175, 178, 172, 168, 165, 162, 158, 155, 152, 148, 145],
  },
  errors: [
    { id: 'E-9001', level: 'error', message: 'Failed to publish to Twitter - Rate limit exceeded', when: '8m' },
    { id: 'E-9002', level: 'warning', message: 'LinkedIn API response delayed', when: '1h' },
  ],
}

export default function AdminDashboard() {
  const { data, isLoading, isError } = useAdminOverview()
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const metrics = useMemo(() => {
    if (data?.overview?.metrics) return data.overview.metrics
    return fallbackMock.metrics
  }, [data])

  const activities = useMemo(() => {
    if (data?.overview?.recentActivities) return data.overview.recentActivities
    return fallbackMock.activities
  }, [data])

  const postsByPlatform = useMemo(() => {
    if (data?.overview?.postsByPlatform) return data.overview.postsByPlatform
    return fallbackMock.postsByPlatform
  }, [data])

  const engagementByPlatform = useMemo(() => {
    if (data?.overview?.engagementByPlatform) return data.overview.engagementByPlatform
    return fallbackMock.engagementByPlatform
  }, [data])

  const revenueByPlan = useMemo(() => {
    if (data?.overview?.revenueByPlan) return data.overview.revenueByPlan
    return fallbackMock.revenueByPlan
  }, [data])

  const userConversion = useMemo(() => {
    if (data?.overview?.userConversion) return data.overview.userConversion
    return fallbackMock.userConversion
  }, [data])

  const recentErrors = useMemo(() => {
    if (data?.overview?.errors) return data.overview.errors
    return fallbackMock.errors
  }, [data])

  const currentEngagement = useMemo(() => {
    if (selectedPlatform === 'all') {
      // Sum data across all platforms for each month
      const allLikes: number[] = []
      const allShares: number[] = []
      const platformKeys = Object.keys(engagementByPlatform) as (keyof typeof engagementByPlatform)[]
      
      for (let i = 0; i < 12; i++) {
        let monthLikes = 0
        let monthShares = 0
        platformKeys.forEach(key => {
          const platformData = engagementByPlatform[key]
          if (platformData && platformData.likes[i] !== undefined) {
            monthLikes += platformData.likes[i]
          }
          if (platformData && platformData.shares[i] !== undefined) {
            monthShares += platformData.shares[i]
          }
        })
        allLikes.push(monthLikes)
        allShares.push(monthShares)
      }
      return { likes: allLikes, shares: allShares }
    }
    return engagementByPlatform[selectedPlatform as keyof typeof engagementByPlatform] || { likes: [], shares: [] }
  }, [engagementByPlatform, selectedPlatform])

  const currentPosts = useMemo(() => {
    if (selectedPlatform === 'all') {
      // Sum data across all platforms for each month
      const allPosts: number[] = []
      const platformKeys = Object.keys(postsByPlatform) as (keyof typeof postsByPlatform)[]
      
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
    return postsByPlatform[selectedPlatform as keyof typeof postsByPlatform] || []
  }, [postsByPlatform, selectedPlatform])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Bảng điều khiển Admin</h1>
          <div style={{ color: '#605d52' }}>Tổng quan hệ thống quản lý mạng xã hội Syncra</div>
        </div>
      </div>

      {/* Platform Filter */}
      <div className={styles.card} style={{ marginBottom: 20, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#605d52', fontWeight: 600 }}>Lọc theo nền tảng:</span>
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
            Tất cả
          </button>
          {PLATFORMS.slice(0, 6).map((platform) => {
            const Icon = platform.icon
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: selectedPlatform === platform.id ? '2px solid var(--color-primary)' : '1px solid #e5e5e5',
                  background: selectedPlatform === platform.id ? 'var(--color-primary)' : '#fff',
                  color: selectedPlatform === platform.id ? '#fff' : '#333',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon size={14} />
                {platform.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className={dashStyles.metricsRow}>
        {metrics.map((m:any) => (
          <div key={m.id} className={dashStyles.metricCard}>
            <div className={dashStyles.metricTitle}>{m.title}</div>
            <div className={dashStyles.metricValue}>{m.value}</div>
            <div className={dashStyles.metricSpark} aria-hidden />
          </div>
        ))}
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)' }}>
                Bài viết theo nền tảng (12 tháng)
                {selectedPlatform !== 'all' && ` - ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}`}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.find((m:any)=>m.id==='posts')?.value ?? '—'}</div>
            </div>
            <div style={{ color: '#939084' }}>Tổng số bài viết</div>
          </div>
          <TrendChart data={currentPosts.length > 0 ? currentPosts : [120, 145, 132, 156, 178, 190, 210, 225, 240, 255, 270, 285]} />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className={styles.card}>
            <div style={{ fontSize: 13, color: 'var(--color-body)' }}>Tài khoản MXH mới</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{data?.overview?.newAccounts24h ?? '—'}</div>
            <div style={{ marginTop: 8, color: '#939084' }}>24 giờ qua</div>
          </div>

          <div className={styles.card}>
            <div style={{ fontSize: 13, color: 'var(--color-body)' }}>Top Workspaces</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {(data?.workspaces?.slice(0,5) ?? [{name:'Acme', members:24},{name:'Beta', members:18}]).map((w:any, idx:number) => (
                <li key={idx} style={{ padding: '8px 0' }}>{w.name} — {w.members ?? w.memberCount ?? '-'} thành viên</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)' }}>
                Lượt thích (12 tháng)
                {selectedPlatform !== 'all' && ` - ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}`}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{(currentEngagement.likes?.slice(-1)?.[0] ?? '—').toLocaleString()}</div>
            </div>
            <div style={{ color: '#939084' }}>Tổng quan</div>
          </div>
          <TrendChart data={currentEngagement.likes.length > 0 ? currentEngagement.likes : [4500, 5200, 4800, 5600, 6100, 6800, 7200, 7800, 8200, 8900, 9400, 10200]} />
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: 13, color: 'var(--color-body)' }}>
            Lượt chia sẻ (12 tháng)
            {selectedPlatform !== 'all' && ` - ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}`}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{(currentEngagement.shares?.slice(-1)?.[0] ?? '—').toLocaleString()}</div>
          <div style={{ height: 8 }} />
          <TrendChart data={currentEngagement.shares.length > 0 ? currentEngagement.shares : [180, 210, 195, 240, 275, 310, 340, 380, 410, 450, 490, 540]} />
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* Revenue by Plan Chart */}
      <div className={styles.card}>
        <h3 style={{ marginTop: 0 }}>Doanh thu theo gói (12 tháng)</h3>
        <div style={{ height: 200 }}>
          <TrendChart data={revenueByPlan.starter} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#605d52', marginBottom: 4 }}>Starter</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>${(revenueByPlan.starter.slice(-1)[0] * 12).toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#605d52', marginBottom: 4 }}>Pro</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>${(revenueByPlan.pro.slice(-1)[0] * 12).toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#605d52', marginBottom: 4 }}>Enterprise</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>${(revenueByPlan.enterprise.slice(-1)[0] * 12).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* User Conversion Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Chuyển đổi người dùng (12 tháng)</h3>
          <TrendChart data={userConversion.newUsers} />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#605d52' }}>Người dùng mới</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{userConversion.newUsers.slice(-1)[0]}</div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Hoạt động người dùng</h3>
          <TrendChart data={userConversion.activeUsers} />
          <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#605d52' }}>Đang hoạt động</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{userConversion.activeUsers.slice(-1)[0]}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#605d52' }}>Không hoạt động</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{userConversion.nonActiveUsers.slice(-1)[0]}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Bài viết theo nền tảng (tuần)</h3>
          <TrendChart data={postsByPlatform.facebook ?? [200, 215, 230, 245, 260, 275, 290, 305, 320, 335, 350, 365]} />
          <div style={{ height: 12 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--color-body)' }}>Tổng lượt tương tác</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{((currentEngagement.likes?.reduce((a:number,b:number)=>a+b,0) ?? 0) + (currentEngagement.shares?.reduce((a:number,b:number)=>a+b,0) ?? 0)).toLocaleString()}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--color-body)' }}>Lỗi đăng bài gần đây</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {recentErrors.map((e:any) => (
                  <li key={e.id} style={{ padding: '6px 0', fontSize: 12 }}>{e.id} — {e.message} <span style={{ color: '#939084' }}>({e.when})</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Top Workspaces</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {(data?.workspaces?.slice(0,6) ?? [{name:'Acme', members:24},{name:'Beta', members:18},{name:'Gamma', members:14}]).map((w:any, idx:number) => (
              <li key={idx} style={{ padding: '8px 0', display:'flex', justifyContent:'space-between' }}>{w.name}<span style={{ color:'#939084' }}>{w.members ?? w.memberCount ?? '-'}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ height: 20 }} />

      <div className={styles.card}>
        <h3 style={{ marginTop: 0 }}>Hoạt động hệ thống gần đây</h3>
        {isLoading ? (
          <div>Đang tải dữ liệu...</div>
        ) : isError ? (
          <div>Lỗi khi tải dữ liệu admin — hiển thị dữ liệu mẫu.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Loại</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Nền tảng</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Trạng thái</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Khi</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Người</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a:any) => {
                const platform = PLATFORMS.find(p => p.id === a.platform)
                const Icon = platform?.icon
                return (
                  <tr key={a.id}>
                    <td style={{ padding: 8 }}>{a.id}</td>
                    <td style={{ padding: 8 }}>{a.type}</td>
                    <td style={{ padding: 8 }}>
                      {Icon ? <Icon size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> : null}
                      {platform?.name || a.platform || '-'}
                    </td>
                    <td style={{ padding: 8 }}>{a.status}</td>
                    <td style={{ padding: 8 }}>{a.when}</td>
                    <td style={{ padding: 8 }}>{a.user}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
