import { Building2, CheckCircle2, CreditCard, Search, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRevenueAnalytics } from '../../hooks/useRevenueAnalytics'
import styles from './AdminModern.module.css'
import { formatVnd } from './utils/currency'
import { Card, EmptyState, LoadingState, PageHeader, Pill, StatCard } from './components/AdminPrimitives'
import { ModernBarChart, ModernLineChart } from './components/ModernCharts'
import { formatNumber, monthLabels, normalizeMonths, pick, trendClass } from './adminViewUtils'

export default function RevenueAnalyticsV2() {
  const { data, isLoading } = useRevenueAnalytics()
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState('all')

  const metrics = useMemo(() => pick<any[]>(data, 'Metrics', 'metrics', []), [data])
  const plansByUsage = useMemo(() => pick<any[]>(data, 'PlansByUsage', 'plansByUsage', []), [data])
  const planGrowth = useMemo(() => pick<any[]>(data, 'PlanGrowth', 'planGrowth', []), [data])
  const workspaceSubscriptions = useMemo(() => pick<any[]>(data, 'WorkspaceSubscriptions', 'workspaceSubscriptions', []), [data])
  const trends = pick<any>(data, 'Trends', 'trends', {})
  const statById = (id: string) => metrics.find((item) => String(item.id).toLowerCase() === id)

  const planNames = Array.from(new Set(workspaceSubscriptions.map((item) => item.planName).filter(Boolean)))
  const filteredSubscriptions = workspaceSubscriptions.filter((item) => {
    const matchesQuery = `${item.workspaceName ?? ''} ${item.workspaceId ?? ''}`.toLowerCase().includes(query.toLowerCase())
    const matchesPlan = plan === 'all' || String(item.planName).toLowerCase() === plan
    return matchesQuery && matchesPlan
  })

  return (
    <div>
      <PageHeader
        eyebrow="Revenue"
        title="Phân tích doanh thu"
        subtitle="Theo dõi MRR, subscription, workspace trả phí và tăng trưởng theo từng gói."
        actions={
          <>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', top: 11, left: 11, color: '#94a3b8' }} />
              <input className={styles.input} style={{ paddingLeft: 34 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm workspace..." />
            </div>
            <select className={styles.select} value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="all">Tất cả gói</option>
              {planNames.map((item) => <option key={item} value={String(item).toLowerCase()}>{String(item)}</option>)}
            </select>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Doanh thu tháng" value={formatVnd(statById('revenue')?.value ?? trends.currentMonthRevenue ?? trends.CurrentMonthRevenue)} hint={statById('revenue')?.growth ?? 'MRR hiện tại'} trendClassName={trendClass(statById('revenue')?.growth, styles)} icon={<WalletCards size={20} />} tone="#10b981" />
            <StatCard label="Tổng subscription" value={statById('subscriptions')?.value ?? '0'} hint={statById('subscriptions')?.growth ?? 'Tất cả gói'} trendClassName={trendClass(statById('subscriptions')?.growth, styles)} icon={<CreditCard size={20} />} />
            <StatCard label="Subscription active" value={statById('active')?.value ?? '0'} hint={statById('active')?.growth ?? 'Đang hiệu lực'} trendClassName={trendClass(statById('active')?.growth, styles)} icon={<CheckCircle2 size={20} />} tone="#8b5cf6" />
            <StatCard label="Workspace trả phí" value={statById('workspaces')?.value ?? '0'} hint={statById('workspaces')?.growth ?? 'Đang sử dụng'} trendClassName={trendClass(statById('workspaces')?.growth, styles)} icon={<Building2 size={20} />} tone="#06b6d4" />
          </div>

          <div className={styles.chartGrid}>
            <Card title="Xu hướng doanh thu" meta="12 tháng gần nhất, đơn vị VND">
              <ModernLineChart
                data={normalizeMonths(trends.monthlyRevenue ?? trends.MonthlyRevenue)}
                labels={monthLabels}
                formatter={formatVnd}
              />
            </Card>
            <Card title="Gói đang sử dụng" meta="Doanh thu và tỷ trọng theo gói">
              {plansByUsage.length === 0 ? <EmptyState /> : (
                <div className={styles.list}>
                  {plansByUsage.map((item) => (
                    <div className={styles.listItem} key={item.planCode ?? item.planName}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className={styles.itemTitle}>{item.planName}</div>
                        <div className={styles.itemMeta}>{formatNumber(item.workspaceCount)} workspace • {item.percentage ?? 0}%</div>
                        <div className={styles.progress}>
                          <div className={styles.progressFill} style={{ width: `${Math.min(100, item.percentage ?? 0)}%`, background: '#10b981' }} />
                        </div>
                      </div>
                      <div className={styles.rightValue}>{formatVnd(item.monthlyRevenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card title="Subscription mới" meta="Số lượng đăng ký mới theo tháng">
              <ModernBarChart data={normalizeMonths(trends.newSubscriptions ?? trends.NewSubscriptions)} labels={monthLabels} colors={monthLabels.map((_, index) => index === 11 ? '#2563eb' : '#bfdbfe')} />
            </Card>
            <Card title="Tăng trưởng theo gói" meta="Chênh lệch số lượng subscription">
              <ModernBarChart
                data={planGrowth.map((item) => item.growth ?? 0)}
                labels={planGrowth.map((item) => item.planName ?? '-')}
                colors={planGrowth.map((item) => Number(item.growth ?? 0) >= 0 ? '#10b981' : '#ef4444')}
              />
            </Card>
          </div>

          <Card title="Subscription theo workspace" meta="Danh sách mới nhất, có thể lọc theo workspace và gói">
            {filteredSubscriptions.length === 0 ? <EmptyState>Không tìm thấy subscription phù hợp.</EmptyState> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Workspace</th>
                      <th>Gói</th>
                      <th>Trạng thái</th>
                      <th>Workspace ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.slice(0, 10).map((item: any) => (
                      <tr key={`${item.workspaceId}-${item.planName}`}>
                        <td><strong>{item.workspaceName}</strong></td>
                        <td><Pill tone="green">{item.planName}</Pill></td>
                        <td>{item.status}</td>
                        <td>{item.workspaceId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
