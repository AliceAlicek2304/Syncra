import { CheckCircle2, Clock3, Edit3, Newspaper, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePostAnalytics } from '../../hooks/usePostAnalytics'
import styles from './AdminModern.module.css'
import { Card, EmptyState, LoadingState, PageHeader, Pill, StatCard } from './components/AdminPrimitives'
import { ModernBarChart, ModernDonutChart, ModernLineChart } from './components/ModernCharts'
import { formatNumber, monthLabels, normalizeMonths, pick, platformColor, trendClass } from './adminViewUtils'

export default function PostAnalyticsV2() {
  const { data, isLoading } = usePostAnalytics()
  const [platform, setPlatform] = useState('all')

  const metrics = useMemo(() => pick<any[]>(data, 'Metrics', 'metrics', []), [data])
  const postsByStatus = useMemo(() => pick<any[]>(data, 'PostsByStatus', 'postsByStatus', []), [data])
  const postsByPlatform = useMemo(() => pick<any[]>(data, 'PostsByPlatform', 'postsByPlatform', []), [data])
  const topPosters = useMemo(() => pick<any[]>(data, 'TopPosters', 'topPosters', []), [data])
  const trends = pick<any>(data, 'Trends', 'trends', {})

  const statById = (id: string) => metrics.find((item) => String(item.id).toLowerCase() === id)
  const filteredPlatforms = platform === 'all'
    ? postsByPlatform
    : postsByPlatform.filter((item) => String(item.platform).toLowerCase() === platform)

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Phân tích bài đăng"
        subtitle="Theo dõi volume nội dung, trạng thái xuất bản, nền tảng và nhóm người dùng tạo bài nhiều nhất."
        actions={
          <select className={styles.select} value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="all">Tất cả nền tảng</option>
            {postsByPlatform.map((item) => <option key={item.platform} value={String(item.platform).toLowerCase()}>{item.platform}</option>)}
          </select>
        }
      />

      {isLoading ? <LoadingState /> : (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Tổng bài viết" value={statById('total')?.value ?? '0'} hint={statById('total')?.growth ?? 'Tất cả trạng thái'} trendClassName={trendClass(statById('total')?.growth, styles)} icon={<Newspaper size={20} />} />
            <StatCard label="Đã xuất bản" value={statById('published')?.value ?? '0'} hint={statById('published')?.growth ?? 'Published'} trendClassName={trendClass(statById('published')?.growth, styles)} icon={<CheckCircle2 size={20} />} tone="#10b981" />
            <StatCard label="Lên lịch" value={statById('scheduled')?.value ?? '0'} hint={statById('scheduled')?.growth ?? 'Scheduled'} trendClassName={trendClass(statById('scheduled')?.growth, styles)} icon={<Clock3 size={20} />} tone="#8b5cf6" />
            <StatCard label="Bản nháp" value={statById('draft')?.value ?? '0'} hint={statById('draft')?.growth ?? 'Draft'} trendClassName={trendClass(statById('draft')?.growth, styles)} icon={<Edit3 size={20} />} tone="#06b6d4" />
          </div>

          <div className={styles.chartGrid}>
            <Card title="Xu hướng bài đăng" meta="Tổng bài và bài đã xuất bản trong 12 tháng">
              <ModernLineChart
                labels={monthLabels}
                datasets={[
                  { label: 'Tổng bài', data: normalizeMonths(trends.monthlyPosts ?? trends.MonthlyPosts), color: '#2563eb' },
                  { label: 'Đã xuất bản', data: normalizeMonths(trends.publishedPosts ?? trends.PublishedPosts), color: '#10b981' },
                ]}
              />
            </Card>
            <Card title="Trạng thái bài đăng" meta="Tỷ trọng theo trạng thái hiện tại">
              <ModernDonutChart
                data={postsByStatus.map((item) => item.count ?? 0)}
                labels={postsByStatus.map((item) => item.status ?? '-')}
                colors={['#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b']}
              />
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card title="Bài đăng theo nền tảng" meta="Có thể lọc theo từng kênh">
              <ModernBarChart
                data={filteredPlatforms.map((item) => item.count ?? 0)}
                labels={filteredPlatforms.map((item) => item.platform ?? '-')}
                colors={filteredPlatforms.map((item) => platformColor(item.platform ?? ''))}
              />
              <div className={styles.list}>
                {filteredPlatforms.length === 0 ? <EmptyState /> : filteredPlatforms.map((item) => (
                  <div className={styles.listItem} key={item.platform}>
                    <div>
                      <div className={styles.itemTitle}>{item.platform}</div>
                      <div className={styles.itemMeta}>{item.percentage ?? 0}% tổng bài đăng</div>
                    </div>
                    <div className={styles.rightValue}>{formatNumber(item.count)}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Top người đăng bài" meta="Người dùng tạo nhiều nội dung nhất">
              {topPosters.length === 0 ? <EmptyState /> : (
                <div className={styles.list}>
                  {topPosters.slice(0, 8).map((poster, index) => (
                    <div className={styles.listItem} key={`${poster.email}-${index}`}>
                      <div>
                        <div className={styles.itemTitle}>{poster.userName ?? 'Người dùng'}</div>
                        <div className={styles.itemMeta}>{poster.email ?? '-'}</div>
                      </div>
                      <Pill tone="green">{formatNumber(poster.postCount)} bài</Pill>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Tóm tắt vận hành nội dung" meta="Các chỉ số chính của tháng hiện tại">
            <div className={styles.grid3}>
              <StatCard label="Bài tháng này" value={formatNumber(trends.currentMonthPosts ?? trends.CurrentMonthPosts)} hint="Current month" icon={<Search size={20} />} />
              <StatCard label="Tăng trưởng" value={formatNumber(trends.postsGrowth ?? trends.PostsGrowth)} hint="So với kỳ trước" icon={<CheckCircle2 size={20} />} tone="#10b981" />
              <StatCard label="Nền tảng đang dùng" value={formatNumber(postsByPlatform.length)} hint="Có dữ liệu bài đăng" icon={<Newspaper size={20} />} tone="#8b5cf6" />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
