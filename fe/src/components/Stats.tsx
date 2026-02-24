import styles from './Stats.module.css'

const STATS = [
  { value: '2,400+', label: 'Active creators' },
  { value: '6', label: 'Platforms supported' },
  { value: '98%', label: 'Uptime SLA' },
  { value: '12M+', label: 'Posts scheduled' },
]

export default function Stats() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={`glass-card ${styles.grid}`}>
          {STATS.map((s, i) => (
            <div key={s.label} className={styles.item}>
              <div className={styles.value}>{s.value}</div>
              <div className={styles.label}>{s.label}</div>
              {i < STATS.length - 1 && <div className={styles.divider} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
