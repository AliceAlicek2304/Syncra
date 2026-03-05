import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, Lightbulb, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft, Menu, PenSquare, TrendingUp, Repeat
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCreatePostModal } from '../../context/createPostModalContext'
import CreatePostModal from '../../components/CreatePostModal'
import { shortId } from '../../utils/shortId'
import Toast, { type ToastItem } from '../../components/Toast'
import AICoach from '../../components/AICoach'
import MeshBackground from '../../components/MeshBackground'
import CommandPalette from '../../components/CommandPalette'
import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/app/ideas', icon: <Lightbulb size={18} />, label: 'Ideas' },
  { to: '/app/repurpose', icon: <Repeat size={18} />, label: 'AI Repurpose', badge: 'NEW' },
  { to: '/app/trends', icon: <TrendingUp size={18} />, label: 'Trend Radar' },
  { to: '/app/calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
  { to: '/app/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const { state, openCreatePost, closeCreatePost } = useCreatePostModal()

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    setToasts(prev => [...prev, { ...t, id: shortId() }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

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
            {!collapsed && <span className={styles.logoText}>Syncra</span>}
          </a>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* New Post button */}
        <div className={styles.newPostWrap}>
          <button
            className={`${styles.newPostBtn} ${collapsed ? styles.newPostBtnCollapsed : ''}`}
            onClick={() => openCreatePost({ source: 'direct' })}
          >
            <PenSquare size={16} />
            {!collapsed && <span>New Post</span>}
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

      {/* Single Modal Mount */}
      <CreatePostModal
        isOpen={state.isOpen}
        onClose={closeCreatePost}
        onToast={addToast}
        initialContent={state.initialContent}
        initialDate={state.initialDate}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
      
      {/* Floating AI Coach */}
      <AICoach />
      
      {/* Premium Background Layer */}
      <MeshBackground />
      
      {/* Search & Actions Palette */}
      <CommandPalette onNewPost={() => openCreatePost({ source: 'command' })} />
    </div>
  )
}