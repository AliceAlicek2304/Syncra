import type { ReactNode } from 'react'
import styles from '../AdminModern.module.css'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      {actions && <div className={styles.toolbar}>{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = '#2563eb',
  trendClassName,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: ReactNode
  tone?: string
  trendClassName?: string
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.iconBox} style={{ color: tone, backgroundColor: `${tone}14` }}>{icon}</div>
      </div>
      <div className={styles.statValue}>{value}</div>
      {hint && <div className={`${styles.statHint} ${trendClassName ?? ''}`}>{hint}</div>}
    </div>
  )
}

export function Card({
  title,
  meta,
  actions,
  children,
}: {
  title: string
  meta?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {meta && <div className={styles.cardMeta}>{meta}</div>}
        </div>
        {actions}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  )
}

export function EmptyState({ children = 'Chưa có dữ liệu' }: { children?: ReactNode }) {
  return <div className={styles.empty}>{children}</div>
}

export function LoadingState() {
  return <div className={styles.loading}>Đang tải dữ liệu...</div>
}

export function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'rose' }) {
  const className = tone === 'green' ? styles.pillGreen : tone === 'rose' ? styles.pillRose : ''
  return <span className={`${styles.pill} ${className}`}>{children}</span>
}
