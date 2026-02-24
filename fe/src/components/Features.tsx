import {
  PenLine, CalendarClock, BarChart3, Globe2,
  Sparkles, Repeat2,
} from 'lucide-react'
import styles from './Features.module.css'

const FEATURES = [
  {
    icon: <PenLine size={22} />,
    title: 'Smart Content Editor',
    desc: 'Write once and auto-adapt your copy for each platform\'s tone, length, and format — TikTok, LinkedIn, Instagram, and beyond.',
    color: '#8b5cf6',
  },
  {
    icon: <CalendarClock size={22} />,
    title: 'Intelligent Scheduling',
    desc: 'Pick the best time to post based on your audience activity. Set it and forget it — TechNest handles the rest.',
    color: '#ec4899',
  },
  {
    icon: <Globe2 size={22} />,
    title: 'Multi-Platform Publishing',
    desc: 'Publish to TikTok, Instagram, YouTube, LinkedIn, X, and Facebook simultaneously from a single dashboard.',
    color: '#22d3ee',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Unified Analytics',
    desc: 'Track reach, engagement, and follower growth across every platform in one clean real-time dashboard.',
    color: '#f59e0b',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'AI Writing Assistant',
    desc: 'Get caption ideas, hashtag suggestions, and SEO-friendly hooks powered by AI. Save hours every week.',
    color: '#10b981',
    badge: 'Coming soon',
  },
  {
    icon: <Repeat2 size={22} />,
    title: 'Content Recycling',
    desc: 'Automatically re-schedule high-performing evergreen content to maximize its long-term reach.',
    color: '#f472b6',
  },
]

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">Features</span>
          <h2 className="section-title">
            Everything a creator needs.<br />
            <span className="gradient-text">Nothing they don't.</span>
          </h2>
          <p className="section-sub" style={{ marginTop: 16 }}>
            Built specifically for solo creators and small teams who want
            professional-grade tools without enterprise complexity.
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map(f => (
            <div key={f.title} className={`glass-card ${styles.card}`}>
              <div
                className={styles.iconWrap}
                style={{ background: `${f.color}20`, color: f.color }}
              >
                {f.icon}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.titleRow}>
                  <h3 className={styles.title}>{f.title}</h3>
                  {f.badge && <span className={styles.badge}>{f.badge}</span>}
                </div>
                <p className={styles.desc}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
