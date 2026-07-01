import { Activity, CalendarClock, CheckCircle2, CircleDollarSign, Layers3, Newspaper, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { useAdminOverview } from '../../hooks/useAdminOverview'
import { useRevenueAnalytics } from '../../hooks/useRevenueAnalytics'
import styles from './AdminModern.module.css'
import { formatVnd } from './utils/currency'
import { Card, EmptyState, LoadingState, PageHeader, Pill, StatCard } from './components/AdminPrimitives'
import { ModernBarChart, ModernDonutChart, ModernLineChart } from './components/ModernCharts'
import { asNumber, formatNumber, monthLabels, normalizeMonths, pick, platformColor, sum, trendClass } from './adminViewUtils'

const emptyStatus = { published: Array(12).fill(0), scheduled: Array(12).fill(0), failed: Array(12).fill(0) }

export default function DashboardV2() {
  const { data, isLoading, isError } = useAdminOverview()
  const { data: revenueData } = useRevenueAnalytics()
  const overview = data?.overview ?? {}

  const metrics = useMemo(() => pick<any[]>(overview, 'Metrics', 'metrics', []), [overview])
  const activities = useMemo(() => pick<any[]>(overview, 'RecentActivities', 'recentActivities', []), [overview])
  const postsByPlatform = useMemo(() => pick<Record<string, number[]>>(overview, 'PostsByPlatform', 'postsByPlatform', {}), [overview])
  const engagement = useMemo(() => {
    const raw = pick<any>(overview, 'EngagementByPlatform', 'engagementByPlatform', {})
    const all = raw.all ?? raw.All ?? {}
    return {
      published: normalizeMonths(all.published ?? all.Published ?? emptyStatus.published),
      scheduled: normalizeMonths(all.scheduled ?? all.Scheduled ?? emptyStatus.scheduled),
      failed: normalizeMonths(all.failed ?? all.Failed ?? emptyStatus.failed),
    }
  }, [overview])

  const expectedRevenueTrend = normalizeMonths(revenueData?.trends?.monthlyRevenue ?? revenueData?.Trends?.MonthlyRevenue ?? [])
  const actualRevenueTrend = normalizeMonths(revenueData?.trends?.actualRevenue ?? revenueData?.Trends?.ActualRevenue ?? [])
  const totalPostsByMonth = useMemo(() => {
    const values = Object.values(postsByPlatform).map((item) => normalizeMonths(item))
    return monthLabels.map((_, index) => values.reduce((total, item) => total + asNumber(item[index]), 0))
  }, [postsByPlatform])

  const statById = (id: string) => metrics.find((item) => String(item.id).toLowerCase() === id)
  const platformEntries = Object.entries(postsByPlatform).map(([platform, values]) => ({
    platform,
    count: sum(normalizeMonths(values)),
  }))
  // posted = sum of all platform publish counts (consistent with postsByPlatform breakdown)
  const posted = platformEntries.reduce((acc, item) => acc + item.count, 0) || sum(engagement.published)
  const failed = sum(engagement.failed)
  const successRate = posted + failed > 0 ? (posted / (posted + failed)) * 100 : 0

  return (
    <div>
      <PageHeader
        eyebrow="System overview"
        title="Bảng điều khiển Admin"
        subtitle="Theo dõi sức khỏe nội dung, người dùng, workspace và doanh thu trên toàn hệ thống Syncra."
        actions={<span className={styles.badge}>Dữ liệu production</span>}
      />

      {isLoading ? <LoadingState /> : (
        <>
          <div className={styles.statsGrid}>
            <StatCard
              label="Bài viết đã đăng"
              value={statById('posts')?.value ?? formatNumber(posted)}
              hint={statById('posts')?.growth ?? `${formatNumber(posted)} trong 12 tháng`}
              trendClassName={trendClass(statById('posts')?.growth, styles)}
              icon={<Newspaper size={20} />}
              tone="#2563eb"
            />
            <StatCard
              label="Bài viết lên lịch"
              value={statById('scheduled')?.value ?? formatNumber(sum(engagement.scheduled))}
              hint={statById('scheduled')?.growth ?? 'Đang chờ xuất bản'}
              trendClassName={trendClass(statById('scheduled')?.growth, styles)}
              icon={<CalendarClock size={20} />}
              tone="#8b5cf6"
            />
            <StatCard
              label="Tài khoản MXH"
              value={statById('accounts')?.value ?? '0'}
              hint={statById('accounts')?.growth ?? 'Kết nối hiện có'}
              trendClassName={trendClass(statById('accounts')?.growth, styles)}
              icon={<UsersRound size={20} />}
              tone="#10b981"
            />
            <StatCard
              label="Doanh thu tháng"
              value={formatVnd(revenueData?.trends?.currentMonthActualRevenue ?? revenueData?.Trends?.CurrentMonthActualRevenue ?? 0)}
              hint="Tien thuc thu trong thang"
              icon={<CircleDollarSign size={20} />}
              tone="#06b6d4"
            />
          </div>

          <div className={styles.chartGrid}>
            <Card title="Xu hướng vận hành" meta="Bài đăng, lịch đăng và lỗi trong 12 tháng gần nhất">
              <ModernLineChart
                labels={monthLabels}
                datasets={[
                  { label: 'Đã đăng', data: engagement.published, color: '#2563eb' },
                  { label: 'Lên lịch', data: engagement.scheduled, color: '#8b5cf6' },
                  { label: 'Thất bại', data: engagement.failed, color: '#ef4444' },
                ]}
              />
            </Card>

            <Card title="Chất lượng xuất bản" meta="Tỷ lệ thành công theo dữ liệu hiện có">
              <div className={styles.list}>
                <div className={styles.listItem}>
                  <div>
                    <div className={styles.itemTitle}>Tỷ lệ thành công</div>
                    <div className={styles.itemMeta}>Đã đăng / đã đăng + thất bại</div>
                  </div>
                  <div className={styles.rightValue}>{successRate.toFixed(1)}%</div>
                </div>
                <div className={styles.progress}>
                  <div className={styles.progressFill} style={{ width: `${Math.min(100, successRate)}%`, background: '#10b981' }} />
                </div>
                <div className={styles.listItem}>
                  <div>
                    <div className={styles.itemTitle}>Tài khoản mới</div>
                    <div className={styles.itemMeta}>24 giờ qua</div>
                  </div>
                  <div className={styles.rightValue}>{overview.newAccounts24h ?? overview.NewAccounts24h ?? 0}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card title="Doanh thu 12 thang" meta="Thuc thu va MRR du kien tu API revenue">
              <ModernLineChart
                labels={monthLabels}
                datasets={[
                  { label: 'Thuc thu', data: actualRevenueTrend, color: '#10b981' },
                  { label: 'MRR du kien', data: expectedRevenueTrend, color: '#2563eb' },
                ]}
                formatter={formatVnd}
              />
            </Card>
            <Card title="Nền tảng nội dung" meta="Phân bổ bài đăng theo kênh">
              <ModernDonutChart
                data={platformEntries.map((item) => item.count)}
                labels={platformEntries.map((item) => item.platform)}
                colors={platformEntries.map((item) => platformColor(item.platform))}
              />
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card title="Bài đăng theo tháng" meta="Tổng hợp tất cả nền tảng">
              <ModernBarChart data={totalPostsByMonth} labels={monthLabels} colors={totalPostsByMonth.map((_, index) => index === 11 ? '#2563eb' : '#bfdbfe')} />
            </Card>
            <Card title="Hoạt động gần đây" meta="Các sự kiện mới nhất trong hệ thống">
              {isError ? <EmptyState>Lỗi khi tải dữ liệu hệ thống.</EmptyState> : activities.length === 0 ? <EmptyState /> : (
                <div className={styles.list}>
                  {activities.slice(0, 6).map((activity: any) => (
                    <div className={styles.listItem} key={activity.id}>
                      <div>
                        <div className={styles.itemTitle}>{activity.type ?? 'Hoạt động'}</div>
                        <div className={styles.itemMeta}>{activity.user ?? '-'} • {activity.when ?? '-'}</div>
                      </div>
                      <Pill tone={activity.status === 'Failed' ? 'rose' : activity.status === 'Success' ? 'green' : 'blue'}>{activity.status ?? 'Unknown'}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.grid3}>
            <StatCard label="Tổng đã đăng" value={formatNumber(posted)} hint="12 tháng gần nhất" icon={<CheckCircle2 size={20} />} tone="#10b981" />
            <StatCard label="Đang chờ lịch" value={formatNumber(sum(engagement.scheduled))} hint="Theo trạng thái bài viết" icon={<Activity size={20} />} tone="#8b5cf6" />
            <StatCard label="Nền tảng có dữ liệu" value={formatNumber(platformEntries.filter((item) => item.count > 0).length)} hint="Kênh phát sinh bài đăng" icon={<Layers3 size={20} />} tone="#06b6d4" />
          </div>
        </>
      )}
    </div>
  )
}
