import { useState, useEffect } from 'react'
import { Zap, Menu, X } from 'lucide-react'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <a href="#" className={styles.logo}>
          <span className={styles.logoIcon}><Zap size={18} /></span>
          <span className={styles.logoText}>TechNest</span>
        </a>

        {/* Desktop links */}
        <ul className={styles.links}>
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <a href={l.href} className={styles.link}>{l.label}</a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className={styles.cta}>
          <a href="#" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '14px' }}>Sign in</a>
          <a href="#pricing" className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>Start free</a>
        </div>

        {/* Mobile burger */}
        <button className={styles.burger} onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className={styles.drawer}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} className={styles.drawerLink} onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className={styles.drawerCta}>
            <a href="#" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Sign in</a>
            <a href="#pricing" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Start free</a>
          </div>
        </div>
      )}
    </nav>
  )
}
