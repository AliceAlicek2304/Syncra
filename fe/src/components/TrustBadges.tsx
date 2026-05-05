import { Shield, Lock, RefreshCcw, Headphones, Award, CreditCard } from 'lucide-react'
import styles from './TrustBadges.module.css'

const BADGES = [
  { icon: <Shield size={20} />, label: 'Tuân thủ SOC 2' },
  { icon: <Lock size={20} />, label: 'Mã hoá SSL' },
  { icon: <RefreshCcw size={20} />, label: 'Uptime 99.9%' },
  { icon: <Headphones size={20} />, label: 'Hỗ trợ 24/7' },
  { icon: <Award size={20} />, label: 'Sẵn sàng cho GDPR' },
  { icon: <CreditCard size={20} />, label: 'Không ràng buộc hợp đồng' },
]

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'X (Twitter)', 'Facebook']

export default function TrustBadges() {
  return (
    <section className={styles.section}>
      <div className="container">
        {/* Trust badges */}
        <div className={styles.badgesRow}>
          {BADGES.map(b => (
            <div key={b.label} className={`glass-card ${styles.badge}`}>
              <span className={styles.badgeIcon}>{b.icon}</span>
              <span className={styles.badgeLabel}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Platform logos strip */}
        <div className={styles.platformStrip}>
          <p className={styles.stripLabel}>Hoạt động với các nền tảng bạn dùng nhiều nhất</p>
          <div className={styles.platformList}>
            {PLATFORMS.map(p => (
              <div key={p} className={styles.platformChip}>{p}</div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div className={`glass-card ${styles.ctaBanner}`}>
          <div className={styles.ctaGlow} />
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>
              Sẵn sàng tăng trưởng tệp người xem <span className="gradient-text">nhanh hơn 10 lần?</span>
            </h2>
            <p className={styles.ctaSub}>
              Hơn 2.400 creator đã tin dùng Syncra. Gói Free không cần thẻ tín dụng.
            </p>
            <div className={styles.ctaActions}>
              <a href="#pricing" className="btn-primary">Bắt đầu miễn phí</a>
              <a href="#features" className="btn-secondary">Khám phá tính năng</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
