import styles from './AdminLayout.module.css'
import dashStyles from './AdminDashboard.module.css'
import TrendChart from './components/TrendChart'
import BarChart from './components/BarChart'
import Sparkline from './components/Sparkline'
import RadarChart from '../../components/RadarChart'
import { useState, useMemo } from 'react'
import { FaUsers, FaUserPlus, FaUserCheck, FaShareAlt, FaCrown } from 'react-icons/fa'
import { useUserGrowth } from '../../hooks/useUserGrowth'

// Mock Data - fallback
const fallbackMetrics = [
  { id: 'total', title: 'Tổng người dùng', value: '1,452', growth: '+124', trend: 'up' },
  { id: 'active', title: 'Đang hoạt động (30d)', value: '890', growth: '+45', trend: 'up' },
  { id: 'accounts', title: 'Tài khoản kết nối', value: '3,214', growth: '+312', trend: 'up' },
  { id: 'workspaces', title: 'Trung bình Workspace/User', value: '1.8', growth: '+0.2', trend: 'up' },
]

const fallbackRecentUsers = [
  { id: 'U-001', name: 'Alice Nguyen', email: 'alice@example.com', plan: 'Pro', joined: '10 mins ago', active: 'Just now' },
  { id: 'U-002', name: 'Bob Smith', email: 'bob.smith@company.com', plan: 'Starter', joined: '1 hour ago', active: '1 hour ago' },
  { id: 'U-003', name: 'Charlie Tran', email: 'charlie.t@agency.io', plan: 'Enterprise', joined: '3 hours ago', active: '5 mins ago' },
  { id: 'U-004', name: 'Diana Prince', email: 'diana@amazon.org', plan: 'Pro', joined: '5 hours ago', active: '2 hours ago' },
  { id: 'U-005', name: 'Evan Davis', email: 'evan.d@startup.co', plan: 'Starter', joined: '1 day ago', active: '1 day ago' },
]

const fallbackRadarData = [
  { label: 'Facebook', value: 0.9 },
  { label: 'Instagram', value: 0.8 },
  { label: 'Twitter/X', value: 0.6 },
  { label: 'LinkedIn', value: 0.85 },
  { label: 'TikTok', value: 0.4 },
  { label: 'YouTube', value: 0.5 },
]

const fallbackActivityTrends = {
  newUsers: [45, 52, 48, 55, 62, 68, 75, 82, 88, 95, 102, 108],
  activeUsers: [320, 335, 328, 342, 356, 370, 384, 398, 412, 426, 440, 454],
}

const fallbackActivityDistribution = [150, 300, 250, 100, 50, 40]

export default function AdminUserGrowth() {
  const { data, isLoading, isError } = useUserGrowth()
  const [timePeriod, setTimePeriod] = useState<string>('30d')

  console.log('UserGrowth component - data:', data)
  console.log('UserGrowth component - isLoading:', isLoading)
  console.log('UserGrowth component - isError:', isError)

  const userGrowthMetrics = useMemo(() => {
    if (data?.Metrics || data?.metrics) {
      console.log('Using real metrics data')
      return data.Metrics ?? data.metrics
    }
    console.log('Using fallback metrics')
    return isLoading ? [] : fallbackMetrics
  }, [data, isLoading])

  const recentUsers = useMemo(() => {
    if (data?.RecentUsers || data?.recentUsers) {
      console.log('Using real recentUsers data')
      return data.RecentUsers ?? data.recentUsers
    }
    console.log('Using fallback recentUsers')
    return isLoading ? [] : fallbackRecentUsers
  }, [data, isLoading])

  const radarData = useMemo(() => {
    if (data?.PlatformRadar || data?.platformRadar) {
      console.log('Using real radarData')
      return data.PlatformRadar ?? data.platformRadar
    }
    console.log('Using fallback radarData')
    return isLoading ? [] : fallbackRadarData
  }, [data, isLoading])

  const userActivityTrends = useMemo(() => {
    if (data?.ActivityTrends || data?.activityTrends) {
      console.log('Using real activityTrends')
      return data.ActivityTrends ?? data.activityTrends
    }
    console.log('Using fallback activityTrends')
    return isLoading ? { newUsers: [], activeUsers: [] } : fallbackActivityTrends
  }, [data, isLoading])

  const activityDistribution = useMemo(() => {
    if (data?.ActivityDistribution || data?.activityDistribution) {
      console.log('Using real activityDistribution')
      return data.ActivityDistribution ?? data.activityDistribution
    }
    console.log('Using fallback activityDistribution')
    return isLoading ? [] : fallbackActivityDistribution
  }, [data, isLoading])

  const retentionChurn = useMemo(() => {
    if (data?.RetentionChurn || data?.retentionChurn) {
      console.log('Using real retentionChurn')
      return data.RetentionChurn ?? data.retentionChurn
    }
    console.log('Using fallback retentionChurn')
    return null
  }, [data, isLoading])

  const recentPlanChanges = useMemo(() => {
    if (data?.RecentPlanChanges || data?.recentPlanChanges) {
      console.log('Using real recentPlanChanges')
      return data.RecentPlanChanges ?? data.recentPlanChanges
    }
    console.log('Using fallback recentPlanChanges')
    return []
  }, [data, isLoading])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Người dùng & Tài khoản</h1>
          <div style={{ color: '#605d52' }}>Phân tích chuyên sâu về gia tăng người dùng và mức độ hoạt động</div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className={styles.card} style={{ marginBottom: 20, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#605d52', fontWeight: 600 }}>Thời gian:</span>
          {['7d', '30d', '90d', '12m'].map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: timePeriod === period ? '2px solid var(--color-primary)' : '1px solid #e5e5e5',
                background: timePeriod === period ? 'var(--color-primary)' : '#fff',
                color: timePeriod === period ? '#fff' : '#333',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {period === '7d' ? '7 ngày' : period === '30d' ? '30 ngày' : period === '90d' ? '90 ngày' : '12 tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className={dashStyles.metricsRow}>
        {userGrowthMetrics.map((m) => (
          <div key={m.id} className={dashStyles.metricCard} style={{ 
            background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div className={dashStyles.metricTitle}>{m.title}</div>
              {m.id === 'total' && <FaUsers color="#4F8FFF" size={18} />}
              {m.id === 'active' && <FaUserCheck color="#4FFF4F" size={18} />}
              {m.id === 'accounts' && <FaShareAlt color="#FF4F4F" size={18} />}
              {m.id === 'workspaces' && <FaUserPlus color="#FFC84F" size={18} />}
            </div>
            <div className={dashStyles.metricValue}>{m.value}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: m.trend === 'up' ? '#4FFF4F' : '#FF4F4F' }}>
                {m.growth}
              </span>
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
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Xu hướng người dùng hoạt động (12 tháng)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>
                {userActivityTrends?.currentActiveUsers ?? userActivityTrends?.CurrentActiveUsers ?? userActivityTrends?.activeUsers?.length > 0 ? userActivityTrends.activeUsers[userActivityTrends.activeUsers.length - 1] : 0}{' '}
                <span style={{fontSize: 14, color: '#4FFF4F', fontWeight: 600}}>
                  {(userActivityTrends?.activeUsersGrowth ?? userActivityTrends?.ActiveUsersGrowth ?? 0) >= 0 ? '+' : ''}{userActivityTrends?.activeUsersGrowth ?? userActivityTrends?.ActiveUsersGrowth ?? 0}
                </span>
              </div>
            </div>
          </div>
          <TrendChart data={userActivityTrends?.activeUsers ?? userActivityTrends?.ActiveUsers ?? []} />
          <div style={{ height: 16 }} />
          <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Xu hướng người dùng đăng ký mới</div>
          <TrendChart data={userActivityTrends?.newUsers ?? userActivityTrends?.NewUsers ?? []} />
        </div>

        {/* Radar Chart */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, width: '100%' }}>Nền tảng kết nối phổ biến</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RadarChart data={radarData} size={280} />
          </div>
          <div style={{ width: '100%', marginTop: 16, fontSize: 12, color: '#605d52', textAlign: 'center' }}>
            Dữ liệu dựa trên tỷ lệ tài khoản đã liên kết của người dùng.
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* Additional Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Mức độ đăng bài của người dùng</h3>
          <BarChart 
            data={activityDistribution} 
            colors={['#e5e5e5', '#FFC84F', '#4FFF4F', '#4F8FFF', '#8F4FFF', '#FF4F4F']}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: '#666', fontWeight: 600 }}>
            <span>0 post</span>
            <span>1-5</span>
            <span>6-10</span>
            <span>11-50</span>
            <span>51-100</span>
            <span>100+</span>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* Retention & Deep Dive Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Churn & Retention */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
             Tỷ lệ giữ chân & Rời bỏ
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: '#605d52' }}>Tỷ lệ giữ chân (Retention)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4FFF4F' }}>
                {retentionChurn?.retentionRate ?? retentionChurn?.RetentionRate ?? 0}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#605d52' }}>Tỷ lệ rời bỏ (Churn Rate)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#FF4F4F' }}>
                {retentionChurn?.churnRate ?? retentionChurn?.ChurnRate ?? 0}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Xu hướng Churn (6 tháng)</div>
          <TrendChart data={retentionChurn?.churnTrend ?? retentionChurn?.ChurnTrend ?? [0, 0, 0, 0, 0, 0]} labels={['T1', 'T2', 'T3', 'T4', 'T5', 'T6']} />
        </div>

        {/* Recent Plan Changes */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
             Thay đổi gói gần đây
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentPlanChanges.length > 0 ? (
              recentPlanChanges.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i === recentPlanChanges.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{p.user}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{p.time}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      color: p.action === 'Nâng cấp' ? '#4FFF4F' : p.action === 'Hạ cấp' ? '#FFC84F' : '#FF4F4F' 
                    }}>
                      {p.action}
                    </span>
                    <div style={{ fontSize: 11, color: '#666' }}>{p.from} → {p.to}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '20px 0' }}>
                Chưa có thay đổi gói nào
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* User Table */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Người dùng mới & Nổi bật</h3>
          <button style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e5e5', background: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Xem tất cả
          </button>
        </div>
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #eaeaea' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', background: '#fff' }}>
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #eaeaea' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#605d52' }}>ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#605d52' }}>Người dùng</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#605d52' }}>Gói</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#605d52' }}>Tham gia</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#605d52' }}>Hoạt động cuối</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i === recentUsers.length - 1 ? 'none' : '1px solid #f0f0f0', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', color: '#666', fontWeight: 500 }}>{u.id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: 20, 
                      fontSize: 11, 
                      fontWeight: 600,
                      background: u.plan === 'Pro' ? 'rgba(79, 143, 255, 0.15)' : u.plan === 'Enterprise' ? 'rgba(143, 79, 255, 0.15)' : 'rgba(255, 200, 79, 0.15)',
                      color: u.plan === 'Pro' ? '#2a6fdb' : u.plan === 'Enterprise' ? '#6b2adb' : '#d49b22',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {u.plan === 'Enterprise' && <FaCrown size={10} />}
                      {u.plan}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{u.joined}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{u.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
