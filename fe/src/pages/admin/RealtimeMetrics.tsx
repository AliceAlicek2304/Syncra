import { Activity, AlertTriangle, CheckCircle2, Clock3, CreditCard, LogIn, Newspaper, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import adminApi, { type ActivityEvent, type ActivityEventsResponse } from '../../api/admin'
import styles from './AdminModern.module.css'
import { Card, EmptyState, LoadingState, PageHeader, StatCard } from './components/AdminPrimitives'

const groups = [
  { key: 'all', label: 'Tất cả' },
  { key: 'auth', label: 'Đăng nhập' },
  { key: 'post', label: 'Bài đăng' },
  { key: 'billing', label: 'Thanh toán' },
]

const statusOptions = [
  { key: 'all', label: 'Tất cả trạng thái' },
  { key: 'success', label: 'Thành công' },
  { key: 'failed', label: 'Thất bại' },
  { key: 'info', label: 'Thông tin' },
]

const groupMeta: Record<string, { label: string; tone: string; icon: ReactNode }> = {
  auth: { label: 'Đăng nhập', tone: '#2563eb', icon: <LogIn size={18} /> },
  post: { label: 'Bài đăng', tone: '#8b5cf6', icon: <Newspaper size={18} /> },
  billing: { label: 'Thanh toán', tone: '#10b981', icon: <CreditCard size={18} /> },
  system: { label: 'Hệ thống', tone: '#06b6d4', icon: <Activity size={18} /> },
}

const statusMeta: Record<string, { label: string; className: string; icon: ReactNode }> = {
  success: { label: 'Thành công', className: styles.statusPublished, icon: <CheckCircle2 size={14} /> },
  failed: { label: 'Thất bại', className: styles.statusFailed, icon: <AlertTriangle size={14} /> },
  info: { label: 'Thông tin', className: styles.statusScheduled, icon: <Clock3 size={14} /> },
}

export default function RealtimeMetrics() {
  const [group, setGroup] = useState('all')
  const [status, setStatus] = useState('all')
  const [data, setData] = useState<ActivityEventsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const response = await adminApi.listActivityEvents({ group, status, limit: 80 })
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được realtime metrics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [group, status])

  useEffect(() => {
    const timer = window.setInterval(() => loadEvents(true), 15000)
    return () => window.clearInterval(timer)
  }, [group, status])

  const counts = useMemo(() => {
    const byGroup = Object.fromEntries((data?.groupCounts24h ?? []).map(item => [item.key, item.count]))
    const byStatus = Object.fromEntries((data?.statusCounts24h ?? []).map(item => [item.key, item.count]))
    return { byGroup, byStatus }
  }, [data])

  const total24h = (data?.groupCounts24h ?? []).reduce((sum, item) => sum + item.count, 0)

  return (
    <div>
      <PageHeader
        eyebrow="Realtime metrics"
        title="Nhật ký hoạt động 7 ngày"
        subtitle="Theo dõi đăng nhập, bài đăng và thanh toán theo thời gian gần thực. Log chi tiết tự giữ trong 7 ngày."
        actions={
          <button className={styles.secondaryAction} onClick={() => loadEvents(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? styles.spin : ''} />
            Làm mới
          </button>
        }
      />

      <div className={styles.statsGrid}>
        <StatCard label="Tổng event 24h" value={total24h.toLocaleString('vi-VN')} hint="Chỉ log nghiệp vụ cần thiết" icon={<Activity size={20} />} tone="#2563eb" />
        <StatCard label="Đăng nhập" value={(counts.byGroup.auth ?? 0).toLocaleString('vi-VN')} hint="auth.login" icon={<LogIn size={20} />} tone="#06b6d4" />
        <StatCard label="Bài đăng" value={(counts.byGroup.post ?? 0).toLocaleString('vi-VN')} hint="created, published, failed" icon={<Newspaper size={20} />} tone="#8b5cf6" />
        <StatCard label="Thanh toán" value={(counts.byGroup.billing ?? 0).toLocaleString('vi-VN')} hint="checkout, paid, subscription" icon={<CreditCard size={20} />} tone="#10b981" />
      </div>

      <Card
        title="Activity feed"
        meta={`Hiển thị tối đa 80 event mới nhất. Retention: ${data?.retentionDays ?? 7} ngày.`}
        actions={
          <div className={styles.toolbar}>
            <select className={styles.select} value={group} onChange={event => setGroup(event.target.value)}>
              {groups.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <select className={styles.select} value={status} onChange={event => setStatus(event.target.value)}>
              {statusOptions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>
        }
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState>Không tải được log: {error}</EmptyState>
        ) : data && data.events.length > 0 ? (
          <div className={styles.timelineList}>
            {data.events.map(event => <ActivityRow key={event.id} event={event} />)}
          </div>
        ) : (
          <EmptyState>Chưa có event. Khi user đăng nhập, tạo bài hoặc thanh toán, log sẽ xuất hiện ở đây.</EmptyState>
        )}
      </Card>
    </div>
  )
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const group = groupMeta[event.eventGroup] ?? groupMeta.system
  const status = statusMeta[event.status] ?? statusMeta.info

  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineIcon} style={{ color: group.tone, background: `${group.tone}14`, borderColor: `${group.tone}33` }}>
        {group.icon}
      </div>
      <div className={styles.timelineBody}>
        <div className={styles.timelineHeader}>
          <div>
            <div className={styles.itemTitle}>{event.title}</div>
            <div className={styles.itemMeta}>
              {group.label} · {event.eventType}
              {event.userEmail ? ` · ${event.userEmail}` : ''}
              {event.workspaceName ? ` · ${event.workspaceName}` : ''}
            </div>
          </div>
          <span className={`${styles.statusBadge} ${status.className}`}>{status.icon}{status.label}</span>
        </div>
        {event.description && <div className={styles.timelineDescription}>{event.description}</div>}
        <div className={styles.timelineFooter}>
          <span>{formatDateTime(event.createdAtUtc)}</span>
          {event.subjectType && event.subjectId && <span>{event.subjectType}: {event.subjectId.slice(0, 8)}</span>}
        </div>
      </div>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}
