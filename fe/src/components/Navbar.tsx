import { useState, useEffect, useRef } from 'react'
import { Menu, X, Plug, Lightbulb, Calendar, BarChart2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import styles from './Navbar.module.css'
import logo from '../assets/syncra-logo.png'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
]

const USER_MENU = [
  { label: 'Connections', icon: Plug, path: '/app/connections' },
  { label: 'Ideas', icon: Lightbulb, path: '/app/ideas' }, 
  { label: 'Calendar', icon: Calendar, path: '/app/calendar' },
  { label: 'Analytics', icon: BarChart2, path: '/app/analytics' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()
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
    navigate('/login')
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
        <motion.a 
          href="#" 
          className={styles.logo}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img src={logo} alt="Syncra" className={styles.logoImg} />
          <span className={styles.logoText}>Syncra</span>
        </motion.a>

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
                <span className={styles.avatarCircle}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName || user.email} />
                  ) : (
                    (user.displayName || user.email).charAt(0).toUpperCase()
                  )}
                </span>
                <div className={styles.avatarInfo}>
                  <span className={styles.avatarName}>{user.displayName || user.email}</span>
                  <span className={styles.avatarPlan}>Free Plan</span>
                </div>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownHandle}>{user.email}</span>
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
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '14px' }}
                onClick={handleLogin}
              >
                Sign in
              </motion.button>
              <motion.a 
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                href="#pricing" 
                className="btn-primary" 
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                Start free
              </motion.a>
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
                onClick={() => { navigate('/app/connections'); setMenuOpen(false) }}
              >
                Connections
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
                <motion.a whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }} href="#pricing" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Start free</motion.a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
