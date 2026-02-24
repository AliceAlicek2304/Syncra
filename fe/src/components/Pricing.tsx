import { Check, Sparkles, Zap } from 'lucide-react'
import { useState } from 'react'
import styles from './Pricing.module.css'

const PLANS = [
  {
    name: 'Starter',
    icon: <Sparkles size={18} />,
    price: { monthly: 0, yearly: 0 },
    desc: 'Perfect for getting started.',
    features: [
      '3 connected platforms',
      '10 scheduled posts/month',
      'Basic analytics',
      'Content editor',
      'Community support',
    ],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Creator',
    icon: <Zap size={18} />,
    price: { monthly: 19, yearly: 15 },
    desc: 'For serious content creators.',
    features: [
      '6 connected platforms',
      'Unlimited scheduled posts',
      'Advanced analytics',
      'Best-time scheduling',
      'Content recycling',
      'Priority support',
      'AI suggestions (beta)',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Pro',
    icon: <Zap size={18} />,
    price: { monthly: 49, yearly: 39 },
    desc: 'For teams & power creators.',
    features: [
      'Everything in Creator',
      'Up to 5 team members',
      'Custom brand kits',
      'White-label reports',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start 14-day trial',
    highlight: false,
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">Pricing</span>
          <h2 className="section-title">
            Simple, transparent pricing.<br />
            <span className="gradient-text">Scale when you're ready.</span>
          </h2>
          <p className="section-sub" style={{ marginTop: 16, textAlign: 'center' }}>
            Start free. No credit card required. Upgrade anytime.
          </p>

          {/* Toggle */}
          <div className={styles.toggle}>
            <span className={!yearly ? styles.toggleActive : ''}>Monthly</span>
            <button
              className={`${styles.toggleBtn} ${yearly ? styles.toggleBtnOn : ''}`}
              onClick={() => setYearly(y => !y)}
              aria-label="Toggle billing period"
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={yearly ? styles.toggleActive : ''}>
              Yearly <span className={styles.saveBadge}>Save 20%</span>
            </span>
          </div>
        </div>

        <div className={styles.grid}>
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`glass-card ${styles.card} ${plan.highlight ? styles.cardHighlight : ''}`}
            >
              {plan.badge && (
                <div className={styles.popularBadge}>{plan.badge}</div>
              )}
              <div className={styles.planHeader}>
                <div className={styles.planIconName}>
                  <div className={styles.planIcon}>{plan.icon}</div>
                  <span className={styles.planName}>{plan.name}</span>
                </div>
                <p className={styles.planDesc}>{plan.desc}</p>
              </div>

              <div className={styles.priceRow}>
                <span className={styles.currency}>$</span>
                <span className={styles.price}>
                  {plan.price.monthly === 0
                    ? '0'
                    : yearly
                    ? plan.price.yearly
                    : plan.price.monthly}
                </span>
                <span className={styles.period}>
                  {plan.price.monthly === 0 ? '/ forever' : '/ month'}
                </span>
              </div>

              <ul className={styles.featureList}>
                {plan.features.map(f => (
                  <li key={f} className={styles.featureItem}>
                    <Check size={14} className={styles.checkIcon} />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={plan.highlight ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
              >
                  {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className={styles.disclaimer}>
          All plans include a 14-day money-back guarantee. No contracts.
        </p>
      </div>
    </section>
  )
}
