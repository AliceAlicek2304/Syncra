import { PenSquare, Clock4, Rocket } from 'lucide-react'
import styles from './HowItWorks.module.css'

const STEPS = [
  {
    step: '01',
    icon: <PenSquare size={28} />,
    title: 'Create your content',
    desc: 'Write your post once in the editor. TechNest auto-formats it for every platform automatically.',
  },
  {
    step: '02',
    icon: <Clock4 size={28} />,
    title: 'Schedule or post now',
    desc: 'Choose when to publish — instantly or at the optimal predicted time for maximum engagement.',
  },
  {
    step: '03',
    icon: <Rocket size={28} />,
    title: 'Grow your audience',
    desc: 'Watch your analytics across all platforms in one view. Double down on what works.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section}>
      {/* Background glow */}
      <div className={styles.glow} />
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">How it works</span>
          <h2 className="section-title">
            From idea to viral —<br />
            <span className="gradient-text">in 3 simple steps.</span>
          </h2>
        </div>

        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.step} className={styles.stepWrapper}>
              <div className={`glass-card ${styles.card}`}>
                <div className={styles.stepNum}>{s.step}</div>
                <div className={styles.iconBox}>{s.icon}</div>
                <h3 className={styles.title}>{s.title}</h3>
                <p className={styles.desc}>{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={styles.connector}>
                  <div className={styles.line} />
                  <div className={styles.arrow}>→</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
