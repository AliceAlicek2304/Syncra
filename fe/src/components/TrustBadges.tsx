import { Shield, Lock, RefreshCcw, Headphones, Award, CreditCard } from 'lucide-react'
import styles from './TrustBadges.module.css'

const BADGES = [
  { icon: <Shield size={20} />, label: 'SOC 2 Compliant' },
  { icon: <Lock size={20} />, label: 'SSL Encrypted' },
  { icon: <RefreshCcw size={20} />, label: '99.9% Uptime' },
  { icon: <Headphones size={20} />, label: '24/7 Support' },
  { icon: <Award size={20} />, label: 'GDPR Ready' },
  { icon: <CreditCard size={20} />, label: 'No contracts' },
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
          <p className={styles.stripLabel}>Works with all your favourite platforms</p>
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
              Ready to grow your audience <span className="gradient-text">10x faster?</span>
            </h2>
            <p className={styles.ctaSub}>
              Join 2,400+ creators who already trust TechNest. Free plan — no credit card required.
            </p>
            <div className={styles.ctaActions}>
              <a href="#pricing" className="btn-primary">Start for free today</a>
              <a href="#features" className="btn-secondary">Explore features</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
