import { Play, ArrowRight, TrendingUp, BarChart2, Globe } from 'lucide-react'
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background orbs */}
      <div className={styles.orbPurple} />
      <div className={styles.orbPink} />
      <div className={styles.orbCyan} />

      <div className={`container ${styles.inner}`}>
        {/* Left: copy */}
        <div className={styles.copy}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <span>Mới · Gợi ý nội dung bằng AI sắp ra mắt</span>
          </div>

          <h1 className={styles.headline}>
            Tạo một lần.<br />
            <span className="gradient-text">Đăng khắp nơi.</span><br />
            Tăng trưởng nhanh hơn.
          </h1>

          <p className={styles.sub}>
            Syncra giúp creator viết, lên lịch và đăng nội dung lên mọi nền tảng
            từ một dashboard duy nhất. Không còn copy-paste thủ công. Không còn bỏ lỡ bài đăng.
          </p>

          <div className={styles.actions}>
            <a href="#pricing" className="btn-primary">
              Bắt đầu miễn phí <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" className="btn-secondary">
              <Play size={14} /> Xem cách hoạt động
            </a>
          </div>

          <div className={styles.socialProof}>
            <div className={styles.avatars}>
              {['A', 'B', 'C', 'D', 'E'].map((l, i) => (
                <div key={l} className={styles.avatar} style={{ zIndex: 5 - i }}>
                  {l}
                </div>
              ))}
            </div>
            <p className={styles.proofText}>
              <strong>+2.400</strong> creator đang tăng trưởng cùng Syncra
            </p>
          </div>
        </div>

        {/* Right: mock dashboard */}
        <div className={styles.visual}>
          <div className={`glass-card ${styles.dashboard}`}>
            {/* Header row */}
            <div className={styles.dashHeader}>
              <div className={styles.dashTitle}>
                <span className={styles.statusDot} />
                Tổng quan hiệu suất
              </div>
              <span className={styles.dashBadge}>Trực tiếp</span>
            </div>

            {/* Stat cards */}
            <div className={styles.miniCards}>
              {[
                { icon: <TrendingUp size={15} />, label: 'Lượt tiếp cận', value: '128K', delta: '+24%' },
                { icon: <BarChart2 size={15} />, label: 'Tương tác', value: '8.4%', delta: '+11%' },
                { icon: <Globe size={15} />, label: 'Nền tảng', value: '6', delta: 'đang hoạt động' },
              ].map(c => (
                <div key={c.label} className={`glass-card ${styles.miniCard}`}>
                  <div className={styles.miniCardIcon}>{c.icon}</div>
                  <div className={styles.miniCardLabel}>{c.label}</div>
                  <div className={styles.miniCardValue}>{c.value}</div>
                  <div className={styles.miniCardDelta}>{c.delta}</div>
                </div>
              ))}
            </div>

            {/* Chart bars */}
            <div className={styles.chartArea}>
              <div className={styles.chartLabel}>Bài đăng theo tuần</div>
              <div className={styles.bars}>
                {[40, 65, 50, 80, 55, 90, 72].map((h, i) => (
                  <div key={i} className={styles.barWrap}>
                    <div
                      className={styles.bar}
                      style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                    />
                    <span className={styles.barDay}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform pills */}
            <div className={styles.platforms}>
              {['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'X', 'Facebook'].map(p => (
                <span key={p} className={styles.platformPill}>{p}</span>
              ))}
            </div>
          </div>

          {/* Floating notifications */}
          <div className={`glass-card ${styles.notifA}`}>
            <span className={styles.notifIcon}>✅</span>
            <div>
              <div className={styles.notifTitle}>Đã đăng bài!</div>
              <div className={styles.notifSub}>TikTok · 2 giây trước</div>
            </div>
          </div>
          <div className={`glass-card ${styles.notifB}`}>
            <span className={styles.notifIcon}>⏰</span>
            <div>
              <div className={styles.notifTitle}>Đã lên lịch</div>
              <div className={styles.notifSub}>Instagram · sau 3 giờ nữa</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
