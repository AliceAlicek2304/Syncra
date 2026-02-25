import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, Sparkles, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft, Menu, TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AICoach from '../../components/AICoach'
import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/app/ai', icon: <Sparkles size={18} />, label: 'AI Assistant', badge: 'NEW' },
  { to: '/app/trends', icon: <TrendingUp size={18} />, label: 'Trend Radar' },
  { to: '/app/calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
  { to: '/app/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={`${styles.layout} ${collapsed ? styles.collapsed : ''}`}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Logo + collapse */}
        <div className={styles.sidebarTop}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoIcon}><Zap size={16} /></span>
            {!collapsed && <span className={styles.logoText}>TechNest</span>}
          </a>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: settings + user */}
        <div className={styles.sidebarBottom}>
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}><Settings size={18} /></span>
            {!collapsed && <span className={styles.navLabel}>Settings</span>}
          </NavLink>

          <div className={styles.userRow}>
            <div className={styles.avatar}>{user?.avatar}</div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name}</span>
                <span className={styles.userPlan}>{user?.plan} plan</span>
              </div>
            )}
            {!collapsed && (
              <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Floating AI Coach */}
      <AICoach />
    </div>
  )
}
