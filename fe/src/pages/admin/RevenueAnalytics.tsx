import styles from './AdminLayout.module.css'
import TrendChart from './components/TrendChart'
import BarChart from './components/BarChart'
import { useState, useMemo } from 'react'
import { FaMoneyBillWave, FaCreditCard, FaCheckCircle, FaBuilding, FaSearch } from 'react-icons/fa'
import { useRevenueAnalytics } from '../../hooks/useRevenueAnalytics'
import { formatVnd } from './utils/currency'

export default function RevenueAnalytics() {
  const { data, isLoading } = useRevenueAnalytics()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all')

  const revenueMetrics = useMemo(() => {
    if (data?.Metrics || data?.metrics) return data.Metrics ?? data.metrics
    return isLoading ? [] : []
  }, [data, isLoading])

  const plansByUsage = useMemo(() => {
    if (data?.PlansByUsage || data?.plansByUsage) return data.PlansByUsage ?? data.plansByUsage
    return isLoading ? [] : []
  }, [data, isLoading])

  const trends = useMemo(() => {
    if (data?.Trends || data?.trends) {
      return data.Trends ?? data.trends
    }
    return null
  }, [data, isLoading])

  // Normalize monthly revenue data to ensure proper 12-month structure
  const normalizedMonthlyRevenue = useMemo(() => {
    const monthlyRevenue = trends?.monthlyRevenue ?? trends?.MonthlyRevenue ?? []
    
    // If we have exactly 12 months of data, use it as-is
    if (monthlyRevenue.length === 12) {
      return monthlyRevenue
    }
    
    // If we have partial data (e.g., only current month), normalize it
    if (monthlyRevenue.length > 0) {
      const normalized = Array(12).fill(0)
      // Place the last available value at its corresponding position
      // If we have 1 month of data, it goes to index 11 (December)
      // If we have 2 months, they go to indices 10 and 11, etc.
      for (let i = 0; i < monthlyRevenue.length; i++) {
        const targetIndex = 12 - monthlyRevenue.length + i
        if (targetIndex >= 0 && targetIndex < 12) {
          normalized[targetIndex] = monthlyRevenue[i]
        }
      }
      return normalized
    }
    
    return []
  }, [trends])

  const normalizedNewSubscriptions = useMemo(() => {
    const newSubscriptions = trends?.newSubscriptions ?? trends?.NewSubscriptions ?? []
    
    if (newSubscriptions.length === 12) {
      return newSubscriptions
    }
    
    if (newSubscriptions.length > 0) {
      const normalized = Array(12).fill(0)
      for (let i = 0; i < newSubscriptions.length; i++) {
        const targetIndex = 12 - newSubscriptions.length + i
        if (targetIndex >= 0 && targetIndex < 12) {
          normalized[targetIndex] = newSubscriptions[i]
        }
      }
      return normalized
    }
    
    return []
  }, [trends])

  const planGrowth = useMemo(() => {
    if (data?.PlanGrowth || data?.planGrowth) return data.PlanGrowth ?? data.planGrowth
    return isLoading ? [] : []
  }, [data, isLoading])

  const workspaceSubscriptions = useMemo(() => {
    if (data?.WorkspaceSubscriptions || data?.workspaceSubscriptions) return data.WorkspaceSubscriptions ?? data.workspaceSubscriptions
    return isLoading ? [] : []
  }, [data, isLoading])

  const filteredWorkspaceSubscriptions = useMemo(() => {
    let filtered = workspaceSubscriptions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((ws: any) =>
        ws.workspaceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.workspaceId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Plan filter
    if (selectedPlanFilter !== 'all') {
      filtered = filtered.filter((ws: any) =>
        ws.planName.toLowerCase() === selectedPlanFilter.toLowerCase()
      )
    }

    // Limit to 5 latest
    return filtered.slice(0, 5)
  }, [workspaceSubscriptions, searchTerm, selectedPlanFilter])

  const uniquePlans = useMemo(() => {
    const plans = new Set(workspaceSubscriptions.map((ws: any) => ws.planName))
    return Array.from(plans) as string[]
  }, [workspaceSubscriptions])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Phân tích doanh thu</h1>
          <div style={{ color: '#605d52' }}>Thống kê chi tiết về doanh thu và subscription</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
        {revenueMetrics.map((m: any) => (
          <div key={m.id} className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: m.id === 'revenue' ? '#10B981' : m.id === 'subscriptions' ? '#2563EB' : m.id === 'active' ? '#8B5CF6' : '#8F4FFF',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20
              }}>
                {m.id === 'revenue' && <FaMoneyBillWave />}
                {m.id === 'subscriptions' && <FaCreditCard />}
                {m.id === 'active' && <FaCheckCircle />}
                {m.id === 'workspaces' && <FaBuilding />}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#605d52', fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{m.id === 'revenue' ? formatVnd(m.value) : m.value}</div>
                <div style={{ fontSize: 12, color: m.trend === 'up' ? '#10B981' : '#FF4F4F', fontWeight: 600 }}>
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
        {/* Revenue Trend Chart */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Xu hướng doanh thu (12 tháng)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>
                {formatVnd(trends?.currentMonthRevenue ?? trends?.CurrentMonthRevenue ?? 0)}{' '}
                <span style={{fontSize: 14, color: '#10B981', fontWeight: 600}}>
                  {(trends?.revenueGrowth ?? trends?.RevenueGrowth ?? 0) >= 0 ? '+' : ''}{formatVnd(trends?.revenueGrowth ?? trends?.RevenueGrowth ?? 0)}
                </span>
              </div>
            </div>
          </div>
          <TrendChart data={normalizedMonthlyRevenue} />
          <div style={{ height: 16 }} />
          <div style={{ fontSize: 13, color: 'var(--color-body)', fontWeight: 600 }}>Subscription mới</div>
          <TrendChart data={normalizedNewSubscriptions} />
        </div>

        {/* Plans by Usage */}
        <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Gói đang sử dụng</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plansByUsage.length > 0 ? plansByUsage.map((plan: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i === plansByUsage.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{plan.planName}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{plan.workspaceCount} workspace</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>{formatVnd(plan.monthlyRevenue)}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{plan.percentage}%</div>
                </div>
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

      {/* Plan Growth */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Tăng trưởng theo gói</h3>
        <BarChart 
          data={planGrowth.map((p: any) => p.growth)} 
          labels={planGrowth.map((p: any) => p.planName)}
          colors={['#10B981', '#2563EB', '#8B5CF6', '#8F4FFF', '#FF4F4F']}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 11, color: '#666', fontWeight: 600 }}>
          {planGrowth.length > 0 ? planGrowth.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{p.planName}</span>
              <span style={{ color: p.growth >= 0 ? '#10B981' : '#FF4F4F' }}>
                {p.growth >= 0 ? '+' : ''}{p.growth} ({p.currentCount} hiện tại)
              </span>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* Workspace Subscriptions */}
      <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fff 0%, #f8f8f8 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Subscription theo Workspace (5 mới nhất)</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: 12 }} />
            <input
              type="text"
              placeholder="Tìm workspace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: 8,
                border: '1px solid #e5e5e5',
                fontSize: 12,
                background: '#fff'
              }}
            />
          </div>
          <select
            value={selectedPlanFilter}
            onChange={(e) => setSelectedPlanFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e5e5e5',
              fontSize: 12,
              background: '#fff'
            }}
          >
            <option value="all">Tất cả gói</option>
            {uniquePlans.map((plan: string) => (
              <option key={plan} value={plan.toLowerCase()}>{plan}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredWorkspaceSubscriptions.length > 0 ? filteredWorkspaceSubscriptions.map((ws: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i === filteredWorkspaceSubscriptions.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{ws.workspaceName}</div>
                <div style={{ fontSize: 11, color: '#888' }}>ID: {ws.workspaceId}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ws.status === 'Active' ? '#10B981' : '#8B5CF6' }}>
                  {ws.planName}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>{ws.status}</div>
              </div>
            </div>
          )) : (
            <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '20px 0' }}>
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
