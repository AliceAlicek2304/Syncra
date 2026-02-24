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
            <span>New · AI content suggestions coming soon</span>
          </div>

          <h1 className={styles.headline}>
            Create once.<br />
            <span className="gradient-text">Post everywhere.</span><br />
            Grow faster.
          </h1>

          <p className={styles.sub}>
            TechNest helps content creators write, schedule, and publish to
            every platform — all from one beautiful dashboard. No more
            copy-pasting. No more missed posts.
          </p>

          <div className={styles.actions}>
            <a href="#pricing" className="btn-primary">
              Start for free <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" className="btn-secondary">
              <Play size={14} /> See how it works
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
              <strong>+2,400</strong> creators already growing with TechNest
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
                Performance Overview
              </div>
              <span className={styles.dashBadge}>Live</span>
            </div>

            {/* Stat cards */}
            <div className={styles.miniCards}>
              {[
                { icon: <TrendingUp size={15} />, label: 'Reach', value: '128K', delta: '+24%' },
                { icon: <BarChart2 size={15} />, label: 'Engagement', value: '8.4%', delta: '+11%' },
                { icon: <Globe size={15} />, label: 'Platforms', value: '6', delta: 'active' },
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
              <div className={styles.chartLabel}>Weekly posts</div>
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
              <div className={styles.notifTitle}>Post published!</div>
              <div className={styles.notifSub}>TikTok · 2 sec ago</div>
            </div>
          </div>
          <div className={`glass-card ${styles.notifB}`}>
            <span className={styles.notifIcon}>⏰</span>
            <div>
              <div className={styles.notifTitle}>Scheduled</div>
              <div className={styles.notifSub}>Instagram · 3h from now</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
