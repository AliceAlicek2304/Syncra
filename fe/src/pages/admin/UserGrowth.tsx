import styles from './AdminLayout.module.css'
import dashStyles from './AdminDashboard.module.css'
import TrendChart from './components/TrendChart'
import BarChart from './components/BarChart'
import Sparkline from './components/Sparkline'
import { useState, useMemo } from 'react'
import { FaUsers, FaUserPlus, FaUserCheck, FaShareAlt, FaCrown } from 'react-icons/fa'
import { useUserGrowth } from '../../hooks/useUserGrowth'

// 1. Định nghĩa cấu trúc kiểu dữ liệu cho Metric để TypeScript hiểu
interface MetricItem {
  id: string
  title: string
  value: string | number
  growth: string
  trend: string
}

// Thêm kiểu dữ liệu MetricItem[] cho mảng fallback
const fallbackMetrics: MetricItem[] = [
  { id: 'total', title: 'Tổng người dùng', value: '0', growth: '0', trend: 'flat' },
  { id: 'active', title: 'Đang hoạt động (30d)', value: '0', growth: '0', trend: 'flat' },
  { id: 'accounts', title: 'Tài khoản kết nối', value: '0', growth: '0', trend: 'flat' },
  { id: 'workspaces', title: 'Trung bình Workspace/User', value: '0', growth: '0', trend: 'flat' },
]

const fallbackRecentUsers: any[] = []

export default function UserGrowth() {
  const { data, isLoading, isError } = useUserGrowth()
  const [timeRange, setTimeRange] = useState<string>('12m')

  const yearlyLabels = useMemo(() => Array.from({ length: 12 }, (_, i) => `M${i + 1}`), [])

  // Định rõ mảng trả về sẽ tuân thủ kiểu MetricItem[]
  const metrics = useMemo<MetricItem[]>(() => {
    if (data?.Metrics || data?.metrics) return data.Metrics ?? data.metrics
    return isLoading ? [] : fallbackMetrics
  }, [data, isLoading])

  const recentUsers = useMemo(() => {
    if (data?.RecentUsers || data?.recentUsers) return data.RecentUsers ?? data.recentUsers
    return isLoading ? [] : fallbackRecentUsers
  }, [data, isLoading])

  const userGrowthTrend = useMemo(() => {
    // Use real API data for user growth trends
    if (data?.ActivityTrends?.NewUsers || data?.activityTrends?.newUsers) {
      const newUsers = data.ActivityTrends?.NewUsers ?? data.activityTrends?.newUsers ?? []
      if (Array.isArray(newUsers) && newUsers.length === 12) return newUsers
    }
    return Array(12).fill(0)
  }, [data])

  const accountGrowthTrend = useMemo(() => {
    // Use real API data for social account trends
    if (data?.SocialAccountTrends?.MonthlyAccounts || data?.socialAccountTrends?.monthlyAccounts) {
      const monthlyAccounts = data.SocialAccountTrends?.MonthlyAccounts ?? data.socialAccountTrends?.monthlyAccounts ?? []
      if (Array.isArray(monthlyAccounts) && monthlyAccounts.length === 12) return monthlyAccounts
    }
    return Array(12).fill(0)
  }, [data])

  const planDistribution = useMemo(() => {
    if (data?.PlanDistribution || data?.planDistribution) return data.PlanDistribution ?? data.planDistribution
    return { labels: ['Free', 'Pro', 'Team'], values: [65, 25, 10] }
  }, [data])

  const workspaceStats = useMemo(() => {
    if (data?.WorkspaceStatistics || data?.workspaceStatistics) {
      return data.WorkspaceStatistics ?? data.workspaceStatistics
    }
    return {
      totalWorkspaces: 0,
      activeWorkspaces: 0,
      avgAccountsPerWorkspace: 0,
      topWorkspaces: []
    }
  }, [data])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Tăng trưởng người dùng</h1>
          <div style={{ color: '#605d52' }}>Phân tích số lượng người dùng và tài khoản liên kết trên hệ thống</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, background: '#fff', cursor: 'pointer' }}
          >
            <option value="12m">12 tháng qua</option>
          </select>
        </div>
      </div>

      <div className={dashStyles.metricsRow}>
        {/* FIX TẠI ĐÂY: Sử dụng kiểu MetricItem cụ thể thay vì any */}
        {metrics.map((m: MetricItem) => {
          const val = typeof m.value === 'string' ? parseFloat(m.value.replace(/,/g, '')) : (m.value || 0)
          const sparkData = Array(12).fill(0)
          sparkData[11] = val 

          return (
            <div key={m.id} className={dashStyles.metricCard} style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div className={dashStyles.metricTitle}>{m.title}</div>
                {m.id === 'total' && <FaUsers color="#4F8FFF" size={18} />}
                {m.id === 'active' && <FaUserCheck color="#4FFF4F" size={18} />}
                {m.id === 'accounts' && <FaShareAlt color="#FFC84F" size={18} />}
                {m.id === 'workspaces' && <FaUserPlus color="#8F4FFF" size={18} />}
              </div>
              <div className={dashStyles.metricValue}>{m.value}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Sparkline data={sparkData} color={m.id === 'total' ? '#4F8FFF' : m.id === 'active' ? '#4FFF4F' : m.id === 'accounts' ? '#FFC84F' : '#8F4FFF'} />
                <span style={{ fontSize: 11, color: '#2eab2e', fontWeight: 600 }}>{m.growth}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className={styles.card} style={{ background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: '#333' }}>Xu hướng tăng trưởng người dùng (12 tháng)</h3>
          <div style={{ height: 220 }}>
            <TrendChart data={userGrowthTrend} labels={yearlyLabels} />
          </div>
        </div>

        <div className={styles.card} style={{ background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: '#333' }}>Tài khoản mạng xã hội được kết nối (12 tháng)</h3>
          <div style={{ height: 220 }}>
            <TrendChart data={accountGrowthTrend} labels={yearlyLabels} />
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* Workspace Statistics Section */}
      <div className={styles.card} style={{ background: '#fff' }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: '#333' }}>Thống kê Workspace</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Tổng Workspace</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{workspaceStats.totalWorkspaces}</div>
          </div>
          <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Workspace hoạt động (30d)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#4FFF4F' }}>{workspaceStats.activeWorkspaces}</div>
          </div>
          <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>TB tài khoản/Workspace</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#4F8FFF' }}>{workspaceStats.avgAccountsPerWorkspace}</div>
          </div>
        </div>

        <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#333' }}>Top 5 Workspace theo số thành viên</h4>
        {workspaceStats.topWorkspaces && workspaceStats.topWorkspaces.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #eaeaea' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
              <thead style={{ background: '#fafafa', borderBottom: '1px solid #eaeaea' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Tên Workspace</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Slug</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Số thành viên</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Tài khoản MXH</th>
                </tr>
              </thead>
              <tbody>
                {workspaceStats.topWorkspaces.map((w: any, i: number) => (
                  <tr 
                    key={w.id} 
                    style={{ borderBottom: i === workspaceStats.topWorkspaces.length - 1 ? 'none' : '1px solid #f0f0f0' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{w.name}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{w.slug}</td>
                    <td style={{ padding: '12px 16px', color: '#4F8FFF', fontWeight: 600 }}>{w.memberCount}</td>
                    <td style={{ padding: '12px 16px', color: '#FFC84F', fontWeight: 600 }}>{w.accountCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>Không có workspace nào trong hệ thống.</div>
        )}
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className={styles.card}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Người dùng mới đăng ký gần đây</h3>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Đang tải dữ liệu...</div>
          ) : isError ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#ff4f4f' }}>Lỗi khi tải danh sách người dùng.</div>
          ) : recentUsers.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>Không có người dùng mới trong hệ thống.</div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #eaeaea' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                <thead style={{ background: '#fafafa', borderBottom: '1px solid #eaeaea' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Người dùng</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Gói sử dụng</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Tham gia</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'left' }}>Hoạt động</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u: any, i: number) => (
                    <tr 
                      key={u.id} 
                      style={{ borderBottom: i === recentUsers.length - 1 ? 'none' : '1px solid #f0f0f0', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
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
                      <td style={{ padding: '12px 16px', color: '#666' }}>{u.joined}</td>
                      <td style={{ padding: '12px 16px', color: '#2eab2e', fontWeight: 500 }}>{u.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.card} style={{ background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Tỷ lệ phân bổ gói dịch vụ</h3>
          <div style={{ height: 180, marginTop: 20 }}>
            <BarChart 
              data={planDistribution.values} 
              labels={planDistribution.labels} 
              colors={['#FFC84F', '#4F8FFF', '#8F4FFF']} 
            />
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {planDistribution.labels.map((l: string, idx: number) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ['#FFC84F', '#4F8FFF', '#8F4FFF'][idx] }} />
                  {l}
                </span>
                <span style={{ fontWeight: 600 }}>{planDistribution.values[idx]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}