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
  const expectedRevenue = normalizeMonths(trends.monthlyRevenue ?? trends.MonthlyRevenue)
  const actualRevenue = normalizeMonths(trends.actualRevenue ?? trends.ActualRevenue)

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
        title="Phan tich doanh thu"
        subtitle="Tach rieng subscription dang ky, MRR du kien va tien thuc thu tu payment thanh cong."
        actions={
          <>
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} />
              <input className={styles.inputSearch} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tim workspace..." />
            </div>
            <select className={styles.select} value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="all">Tat ca goi</option>
              {planNames.map((item) => <option key={item} value={String(item).toLowerCase()}>{String(item)}</option>)}
            </select>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Thuc thu thang nay" value={formatVnd(statById('actual_revenue')?.value ?? trends.currentMonthActualRevenue ?? trends.CurrentMonthActualRevenue)} hint="Tien da nhan tu SePay" icon={<WalletCards size={20} />} tone="#10b981" />
            <StatCard label="MRR du kien" value={formatVnd(statById('mrr')?.value ?? trends.currentMonthRevenue ?? trends.CurrentMonthRevenue)} hint="Tinh theo goi active" icon={<CreditCard size={20} />} />
            <StatCard label="Tong da thu" value={formatVnd(statById('total_collected')?.value ?? 0)} hint="Luy ke payment thanh cong" icon={<CheckCircle2 size={20} />} tone="#8b5cf6" />
            <StatCard label="Tong subscription" value={statById('subscriptions')?.value ?? '0'} hint={statById('subscriptions')?.growth ?? 'Tat ca goi'} trendClassName={trendClass(statById('subscriptions')?.growth, styles)} icon={<CreditCard size={20} />} />
            <StatCard label="Subscription active" value={statById('active')?.value ?? '0'} hint={statById('active')?.growth ?? 'Dang hieu luc'} trendClassName={trendClass(statById('active')?.growth, styles)} icon={<CheckCircle2 size={20} />} tone="#8b5cf6" />
            <StatCard label="Workspace tra phi" value={statById('workspaces')?.value ?? '0'} hint={statById('workspaces')?.growth ?? 'Dang su dung'} trendClassName={trendClass(statById('workspaces')?.growth, styles)} icon={<Building2 size={20} />} tone="#06b6d4" />
          </div>

          <div className={styles.chartGrid}>
            <Card title="Xu huong doanh thu" meta="Thuc thu va MRR du kien trong 12 thang gan nhat">
              <ModernLineChart
                labels={monthLabels}
                datasets={[
                  { label: 'Thuc thu', data: actualRevenue, color: '#10b981' },
                  { label: 'MRR du kien', data: expectedRevenue, color: '#2563eb' },
                ]}
                formatter={formatVnd}
              />
            </Card>
            <Card title="Goi dang su dung" meta="Subscription, thuc thu va MRR theo goi">
              {plansByUsage.length === 0 ? <EmptyState /> : (
                <div className={styles.list}>
                  {plansByUsage.map((item) => (
                    <div className={styles.listItem} key={item.planCode ?? item.planName}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className={styles.itemTitle}>{item.planName}</div>
                        <div className={styles.itemMeta}>{formatNumber(item.workspaceCount)} workspace - {item.percentage ?? 0}%</div>
                        <div className={styles.progress}>
                          <div className={styles.progressFill} style={{ width: `${Math.min(100, item.percentage ?? 0)}%`, background: '#10b981' }} />
                        </div>
                      </div>
                      <div className={styles.rightValue}>
                        <div>{formatVnd(item.actualRevenue)}</div>
                        <div className={styles.itemMeta}>MRR {formatVnd(item.monthlyRevenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card title="Subscription moi" meta="So luong dang ky moi theo thang">
              <ModernBarChart data={normalizeMonths(trends.newSubscriptions ?? trends.NewSubscriptions)} labels={monthLabels} colors={monthLabels.map((_, index) => index === 11 ? '#2563eb' : '#bfdbfe')} />
            </Card>
            <Card title="Tang truong theo goi" meta="Chenh lech so luong subscription">
              <ModernBarChart
                data={planGrowth.map((item) => item.growth ?? 0)}
                labels={planGrowth.map((item) => item.planName ?? '-')}
                colors={planGrowth.map((item) => Number(item.growth ?? 0) >= 0 ? '#10b981' : '#ef4444')}
              />
            </Card>
          </div>

          <Card title="Subscription theo workspace" meta="Danh sach co the loc theo workspace va goi">
            {filteredSubscriptions.length === 0 ? <EmptyState>Khong tim thay subscription phu hop.</EmptyState> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Workspace</th>
                      <th>Goi</th>
                      <th>Trang thai</th>
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
