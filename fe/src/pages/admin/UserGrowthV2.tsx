import { Building2, Link2, Search, UserCheck, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useUserGrowth } from '../../hooks/useUserGrowth'
import styles from './AdminModern.module.css'
import { Card, EmptyState, LoadingState, PageHeader, Pill, StatCard } from './components/AdminPrimitives'
import { ModernBarChart, ModernLineChart } from './components/ModernCharts'
import { formatNumber, monthLabels, normalizeMonths, pick, trendClass } from './adminViewUtils'

export default function UserGrowthV2() {
  const { data, isLoading, isError } = useUserGrowth()
  const [query, setQuery] = useState('')

  const metrics = useMemo(() => pick<any[]>(data, 'Metrics', 'metrics', []), [data])
  const recentUsers = useMemo(() => pick<any[]>(data, 'RecentUsers', 'recentUsers', []), [data])
  const activityTrends = pick<any>(data, 'ActivityTrends', 'activityTrends', {})
  const socialTrends = pick<any>(data, 'SocialAccountTrends', 'socialAccountTrends', {})
  const planDistribution = pick<any>(data, 'PlanDistribution', 'planDistribution', { labels: [], values: [] })
  const workspaceStats = pick<any>(data, 'WorkspaceStatistics', 'workspaceStatistics', {
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    avgAccountsPerWorkspace: 0,
    topWorkspaces: [],
  })

  const statById = (id: string) => metrics.find((item) => String(item.id).toLowerCase() === id)
  const filteredUsers = recentUsers.filter((user) => {
    const haystack = `${user.name ?? ''} ${user.email ?? ''} ${user.plan ?? ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div>
      <PageHeader
        eyebrow="Users"
        title="Tăng trưởng người dùng"
        subtitle="Theo dõi người dùng mới, workspace, tài khoản mạng xã hội và phân bổ gói dịch vụ."
        actions={
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', top: 11, left: 11, color: '#94a3b8' }} />
            <input className={styles.input} style={{ paddingLeft: 34 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm người dùng..." />
          </div>
        }
      />

      {isLoading ? <LoadingState /> : (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Tổng người dùng" value={statById('total')?.value ?? '0'} hint={statById('total')?.growth ?? 'Toàn hệ thống'} trendClassName={trendClass(statById('total')?.growth, styles)} icon={<UsersRound size={20} />} />
            <StatCard label="Đang hoạt động" value={statById('active')?.value ?? '0'} hint={statById('active')?.growth ?? '30 ngày gần nhất'} trendClassName={trendClass(statById('active')?.growth, styles)} icon={<UserCheck size={20} />} tone="#10b981" />
            <StatCard label="Tài khoản kết nối" value={statById('accounts')?.value ?? '0'} hint={statById('accounts')?.growth ?? 'Social accounts'} trendClassName={trendClass(statById('accounts')?.growth, styles)} icon={<Link2 size={20} />} tone="#8b5cf6" />
            <StatCard label="Workspace/User" value={statById('workspaces')?.value ?? '0'} hint={statById('workspaces')?.growth ?? 'Trung bình'} trendClassName={trendClass(statById('workspaces')?.growth, styles)} icon={<Building2 size={20} />} tone="#06b6d4" />
          </div>

          <div className={styles.grid2}>
            <Card title="Người dùng mới" meta="12 tháng gần nhất">
              <ModernLineChart data={normalizeMonths(activityTrends.NewUsers ?? activityTrends.newUsers)} labels={monthLabels} />
            </Card>
            <Card title="Tài khoản MXH được kết nối" meta="Tăng trưởng social accounts">
              <ModernLineChart data={normalizeMonths(socialTrends.MonthlyAccounts ?? socialTrends.monthlyAccounts)} labels={monthLabels} color="#8b5cf6" />
            </Card>
          </div>

          <div className={styles.grid3}>
            <StatCard label="Tổng workspace" value={formatNumber(workspaceStats.totalWorkspaces)} hint="Workspace đã tạo" icon={<Building2 size={20} />} />
            <StatCard label="Workspace hoạt động" value={formatNumber(workspaceStats.activeWorkspaces)} hint="Có hoạt động trong 30 ngày" icon={<UserCheck size={20} />} tone="#10b981" />
            <StatCard label="TB tài khoản/workspace" value={formatNumber(workspaceStats.avgAccountsPerWorkspace)} hint="Mức độ kết nối kênh" icon={<Link2 size={20} />} tone="#8b5cf6" />
          </div>

          <div className={styles.chartGrid}>
            <Card title="Người dùng mới đăng ký" meta="Danh sách gần đây nhất">
              {isError ? <EmptyState>Lỗi khi tải danh sách người dùng.</EmptyState> : filteredUsers.length === 0 ? <EmptyState>Không tìm thấy người dùng phù hợp.</EmptyState> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Người dùng</th>
                        <th>Gói</th>
                        <th>Tham gia</th>
                        <th>Hoạt động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.slice(0, 8).map((user: any) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.name ?? 'Người dùng'}</strong>
                            <div className={styles.itemMeta}>{user.email ?? '-'}</div>
                          </td>
                          <td><Pill tone={user.plan === 'Free' ? 'blue' : 'green'}>{user.plan ?? '-'}</Pill></td>
                          <td>{user.joined ?? '-'}</td>
                          <td>{user.active ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Phân bổ gói dịch vụ" meta="Tỷ trọng theo số người dùng/workspace">
              <ModernBarChart
                data={planDistribution.values ?? []}
                labels={planDistribution.labels ?? []}
                colors={['#2563eb', '#10b981', '#8b5cf6', '#06b6d4']}
                height={280}
              />
            </Card>
          </div>

          <Card title="Top workspace" meta="Xếp theo số thành viên và tài khoản kết nối">
            {workspaceStats.topWorkspaces?.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Workspace</th>
                      <th>Slug</th>
                      <th>Thành viên</th>
                      <th>Tài khoản MXH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceStats.topWorkspaces.slice(0, 8).map((workspace: any) => (
                      <tr key={workspace.id}>
                        <td><strong>{workspace.name}</strong></td>
                        <td>{workspace.slug}</td>
                        <td>{workspace.memberCount}</td>
                        <td>{workspace.accountCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState>Chưa có workspace nào trong hệ thống.</EmptyState>}
          </Card>
        </>
      )}
    </div>
  )
}
