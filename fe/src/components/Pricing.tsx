import { Check } from 'lucide-react'
import { useState } from 'react'
import styles from './Pricing.module.css'
import logo from '../assets/syncra-logo.png'

const PLANS = [
  {
    name: 'Free',
    icon: <img src={logo} alt="Syncra" style={{ width: 30, height: 30}} />,
    price: { monthly: 0, yearly: 0 },
    desc: 'Dành cho cá nhân bắt đầu quản lý nội dung Facebook.',
    features: [
      'Tối đa 1 thành viên workspace',
      'Tối đa 1 social account',
      'Tối đa 10 bài lên lịch / tháng',
      'Đăng bài Facebook cơ bản',
      'Phân tích dashboard cơ bản',
      'Giới hạn AI usage theo tháng',
    ],
    cta: 'Bắt đầu miễn phí',
    highlight: false,
  },
  {
    name: 'Pro',
    icon: <img src={logo} alt="Syncra" style={{ width: 30, height: 30}} />,
    price: { monthly: 19.99, yearly: 199.99 },
    desc: 'Dành cho creator/team nhỏ cần mở rộng số tài khoản và tần suất đăng.',
    features: [
      'Tối đa 3 workspace members',
      'Tối đa 5 social accounts',
      'Tối đa 100 bài lên lịch / tháng',
      'Quy trình đa tài khoản Facebook',
      'Phân tích nâng cao hơn Free',
      'Giới hạn AI usage theo tháng',
    ],
    cta: 'Dùng thử 14 ngày, sau đó mua gói Pro',
    highlight: true,
    badge: 'Phổ biến nhất',
  },
  {
    name: 'Team',
    icon: <img src={logo} alt="Syncra" style={{ width: 30, height: 30}} />,
    price: { monthly: 49.99, yearly: 499.99 },
    desc: 'Dành cho team/agencies quản lý nhiều tài khoản với sản lượng lớn.',
    features: [
      'Tối đa 10 thành viên workspace',
      'Tối đa 10 social accounts',
      'Tối đa 1000 bài lên lịch / tháng',
      'Quản trị tập trung đa tài khoản Facebook',
      'Phân tích chuyên sâu cho team',
      'Giới hạn AI usage theo tháng',
    ],
    cta: 'Mua gói Team',
    highlight: false,
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">Bảng giá</span>
          <h2 className="section-title">
            Bảng giá rõ ràng, minh bạch.<br />
            <span className="gradient-text">Nâng cấp khi bạn sẵn sàng.</span>
          </h2>
          <p className="section-sub" style={{ marginTop: 16, textAlign: 'center' }}>
            Free là mặc định. Pro dùng thử 14 ngày rồi phải mua để tiếp tục. Team là gói trả phí dành cho nhu cầu mở rộng.
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
                <span className={styles.price}>
                  ${yearly ? plan.price.yearly : plan.price.monthly}
                </span>
                <span className={styles.period}>{yearly ? ' / năm' : ' / tháng'}</span>
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
                className={plan.highlight ? 'btn-primary' : 'btn-ghost'}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className={styles.disclaimer}>
          Gói Free luôn dùng sẵn. Pro chỉ là trial 14 ngày rồi cần nâng cấp trả phí. Team là gói trả phí ngay từ đầu.
        </p>
      </div>
    </section>
  )
}
