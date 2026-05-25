import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Lightbulb, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft, Menu, PenSquare, TrendingUp, Repeat, HelpCircle, Image, Inbox, Plug,
  FileText, ChevronDown, ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCreatePostModal } from '../../context/createPostModalContext'
import CreatePostModal from '../../components/CreatePostModal'
import AICoach from '../../components/AICoach'
import MeshBackground from '../../components/MeshBackground'
import CommandPalette from '../../components/CommandPalette'
import NotificationBell from '../../components/NotificationBell'
import { useInboxBadge } from '../../hooks/useInboxBadge'
import styles from './AppLayout.module.css'
import logo from '../../assets/syncra-logo.png'

const NAV_ITEMS = [
  { to: '/app/connections', icon: <Plug size={18} />, label: 'Connections' },
  { to: '/app/inbox', icon: <Inbox size={18} />, label: 'Inbox' },
  { to: '/app/ideas', icon: <Lightbulb size={18} />, label: 'Ideas' },
  { to: '/app/media', icon: <Image size={18} />, label: 'Media Library' },
  { to: '/app/repurpose', icon: <Repeat size={18} />, label: 'AI Repurpose', badge: 'NEW' },
  { to: '/app/trends', icon: <TrendingUp size={18} />, label: 'Trend Radar' },
  { to: '/app/calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
  { to: '/app/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
  { to: '/app/help', icon: <HelpCircle size={18} />, label: 'Help Center' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [postsOpen, setPostsOpen] = useState(true)
  const { unreadCount } = useInboxBadge()

  const { state, openCreatePost, closeCreatePost } = useCreatePostModal()

  const isLightTheme = location.pathname.endsWith('/connections') || 
                        location.pathname.includes('/posts') || 
                        location.pathname.includes('/posts-all')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handlePostsHeaderClick = (e: React.MouseEvent) => {
    if (collapsed) {
      navigate('/app/posts-all')
    } else {
      setPostsOpen(prev => !prev)
    }
  }

  return (
    <div className={`${styles.layout} ${collapsed ? styles.collapsed : ''} ${isLightTheme ? styles.lightThemeLayout : ''}`}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Logo + collapse */}
        <div className={styles.sidebarTop}>
          <a href="/" className={styles.logo}>
            <img src={logo} alt="Syncra" className={styles.logoImg} />
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

        {/* Nav */}
        <nav className={styles.nav}>
          {/* Connections (First NAV_ITEM) */}
          <NavLink
            to="/app/connections"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}><Plug size={18} /></span>
            {!collapsed && <span className={styles.navLabel}>Connections</span>}
          </NavLink>

          {/* Collapsible Posts Section */}
          <div className={styles.subMenuContainer}>
            <div
              onClick={handlePostsHeaderClick}
              className={`${styles.navItem} ${styles.subMenuBar} ${
                location.pathname.includes('/posts') || location.pathname.includes('/posts-all')
                  ? styles.subMenuActiveHeader
                  : ''
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handlePostsHeaderClick(e as any)
                }
              }}
            >
              <span className={styles.navIcon}><FileText size={18} /></span>
              {!collapsed && (
                <>
                  <span className={styles.navLabel}>Posts</span>
                  <span className={styles.subChevron}>
                    {postsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </>
              )}
            </div>

            {/* Submenu items */}
            {postsOpen && !collapsed && (
              <div className={styles.subItems}>
                <NavLink
                  to="/app/posts-all"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  <span className={styles.subMenuIcon}>
                    <span className={styles.subBullet}>—</span>
                  </span>
                  <span className={styles.navLabel}>Overview</span>
                </NavLink>
                <NavLink
                  to="/app/posts/queues"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  <span className={styles.subMenuIcon}>
                    <span className={styles.subBullet}>—</span>
                  </span>
                  <span className={styles.navLabel}>Queues</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Remaining NAV_ITEMS (excluding Connections) */}
          {NAV_ITEMS.filter(item => item.to !== '/app/connections').map(item => (
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
                  {item.to === '/app/inbox' && unreadCount > 0 && (
                    <span className={styles.navBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
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
            <div className={styles.avatar}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName || user.email} />
              ) : (
                (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.displayName || user?.email}</span>
                <span className={styles.userPlan}>Free plan</span>
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
        <NotificationBell />
        <Outlet />
      </main>

      {/* Single Modal Mount */}
      <CreatePostModal
        isOpen={state.isOpen}
        onClose={closeCreatePost}
        onToast={(t) => t.type === 'success' ? success(t.message) : error(t.message)}
        initialContent={state.initialContent}
        initialDate={state.initialDate}
        editPost={state.editPost}
      />
      
      {/* Floating AI Coach */}
      <AICoach />
      
      {/* Premium Background Layer */}
      <MeshBackground />
      
      {/* Search & Actions Palette */}
      <CommandPalette onNewPost={() => openCreatePost({ source: 'command' })} />
    </div>
  )
}
