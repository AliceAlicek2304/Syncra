import { useState, useEffect, useRef } from 'react'
import { Zap, Menu, X, LayoutDashboard, Lightbulb, Calendar, BarChart2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
]

const USER_MENU = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Ideas', icon: Lightbulb, path: '/app/ideas' }, 
  { label: 'Calendar', icon: Calendar, path: '/app/calendar' },
  { label: 'Analytics', icon: BarChart2, path: '/app/analytics' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogin = () => {
    login()
    navigate('/app/dashboard')
  }

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/')
  }

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <a href="#" className={styles.logo}>
          <span className={styles.logoIcon}><Zap size={18} /></span>
          <span className={styles.logoText}>Syncra</span>
        </a>

        {/* Desktop links */}
        <ul className={styles.links}>
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <a href={l.href} className={styles.link}>{l.label}</a>
            </li>
          ))}
        </ul>

        {/* CTA / Avatar */}
        <div className={styles.cta}>
          {user ? (
            <div className={styles.avatarWrapper} ref={dropdownRef}>
              <button
                className={styles.avatarBtn}
                onClick={() => setDropdownOpen(o => !o)}
                aria-label="User menu"
              >
                <span className={styles.avatarCircle}>{user.avatar}</span>
                <div className={styles.avatarInfo}>
                  <span className={styles.avatarName}>{user.name}</span>
                  <span className={styles.avatarPlan}>{user.plan}</span>
                </div>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownHandle}>{user.handle}</span>
                  </div>
                  {USER_MENU.map(item => (
                    <button
                      key={item.path}
                      className={styles.dropdownItem}
                      onClick={() => { navigate(item.path); setDropdownOpen(false) }}
                    >
                      <item.icon size={15} />
                      {item.label}
                    </button>
                  ))}
                  <div className={styles.dropdownDivider} />
                  <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={handleLogout}>
                    <LogOut size={15} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '14px' }}
                onClick={handleLogin}
              >
                Sign in
              </button>
              <a href="#pricing" className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>Start free</a>
            </>
          )}
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
            {user ? (
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { navigate('/app/dashboard'); setMenuOpen(false) }}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { handleLogin(); setMenuOpen(false) }}
                >
                  Sign in
                </button>
                <a href="#pricing" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Start free</a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
