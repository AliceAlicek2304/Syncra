import { Star } from 'lucide-react'
import styles from './Testimonials.module.css'

const TESTIMONIALS = [
  {
    name: 'Minh Anh',
    handle: '@minhanh.creates',
    platform: 'TikTok Creator · 280K followers',
    avatar: 'MA',
    color: '#ec4899',
    text: 'Syncra changed how I work. I used to spend 3 hours a day copying content across platforms. Now it takes 20 minutes and my engagement actually went up.',
    stars: 5,
  },
  {
    name: 'Quoc Bao',
    handle: '@quocbao.vlogs',
    platform: 'YouTube & Instagram · 120K',
    avatar: 'QB',
    color: '#8b5cf6',
    text: 'The scheduling feature alone is worth every penny. I batch-create content on Sundays and it automatically posts throughout the week. My audience grew 40% in 2 months.',
    stars: 5,
  },
  {
    name: 'Lan Huong',
    handle: '@lanhuong.food',
    platform: 'Food Creator · Multi-platform',
    avatar: 'LH',
    color: '#22d3ee',
    text: 'I tried 4 other tools before Syncra. None of them felt made for solo creators. This one actually gets it — simple, fast, and genuinely useful.',
    stars: 5,
  },
  {
    name: 'Tuan Kiet',
    handle: '@kietchanh.dev',
    platform: 'Tech Educator · 50K',
    avatar: 'TK',
    color: '#f59e0b',
    text: 'As a developer I\'m picky about tools. Syncra\'s reliability is excellent — never missed a scheduled post. The unified analytics dashboard is Chef\'s kiss.',
    stars: 5,
  },
  {
    name: 'Thu Ha',
    handle: '@thuha.lifestyle',
    platform: 'Lifestyle Creator · 95K',
    avatar: 'TH',
    color: '#10b981',
    text: 'I started with the free plan and upgraded after one week. The best-time scheduling is genuinely smart — my posts now get 2x the views they used to.',
    stars: 5,
  },
  {
    name: 'Duc Long',
    handle: '@duclong.fitness',
    platform: 'Fitness Coach · 200K',
    avatar: 'DL',
    color: '#f472b6',
    text: 'Managing 6 platforms used to feel impossible. Now it\'s my secret weapon. I spend more time creating and less time managing — exactly what I needed.',
    stars: 5,
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">Testimonials</span>
          <h2 className="section-title">
            Creators love Syncra.<br />
            <span className="gradient-text">See why.</span>
          </h2>
        </div>

        <div className={styles.grid}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} className={`glass-card ${styles.card}`}>
              <div className={styles.stars}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <p className={styles.text}>"{t.text}"</p>
              <div className={styles.author}>
                <div
                  className={styles.avatar}
                  style={{ background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}40` }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorHandle}>{t.handle}</div>
                  <div className={styles.authorPlatform}>{t.platform}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
