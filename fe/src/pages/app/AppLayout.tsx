import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Lightbulb,
  BarChart3, LogOut, ChevronLeft, Menu, Repeat, HelpCircle, Plug,
  FileText, ChevronDown, ChevronUp, Layers, Inbox, MessageSquare, MessageCircle
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCreatePostModal } from '../../context/createPostModalContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useNotificationHub } from '../../hooks/useNotificationHub'
import CreatePostModal from '../../components/CreatePostModal'
import MeshBackground from '../../components/MeshBackground'
import CommandPalette from '../../components/CommandPalette'
import NotificationBell from '../../components/NotificationBell'
import styles from './AppLayout.module.css'
import logo from '../../assets/syncra-logo.png'

const NAV_ITEMS: { to: string; icon: React.ReactNode; label: string; badge?: string }[] = [
  { to: '/app/connections', icon: <Plug size={18} />, label: 'Connections' },
  { to: '/app/ideas', icon: <Lightbulb size={18} />, label: 'Ideas' },
  { to: '/app/repurpose', icon: <Repeat size={18} />, label: 'Repurpose'},
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
  const [inboxOpen, setInboxOpen] = useState(true)

  const { activeWorkspace } = useWorkspace()
  useNotificationHub({ workspaceId: activeWorkspace?.id })

  const { state, openCreatePost, closeCreatePost } = useCreatePostModal()

  const isLightTheme = location.pathname.endsWith('/connections') ||
                        location.pathname.includes('/posts') ||
                        location.pathname.includes('/posts-all') ||
                        location.pathname.includes('/ideas') ||
                        location.pathname.includes('/repurpose') ||
                        location.pathname.includes('/trends') ||
                        location.pathname.includes('/help') ||
                        location.pathname.includes('/analytics') ||
                        location.pathname.includes('/inbox')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handlePostsHeaderClick = () => {
    if (collapsed) {
      navigate('/app/posts-all')
    } else {
      setPostsOpen(prev => !prev)
    }
  }

  const handleInboxHeaderClick = () => {
    if (collapsed) {
      navigate('/app/inbox/messages')
    } else {
      setInboxOpen(prev => !prev)
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
                  handlePostsHeaderClick()
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
                    <LayoutDashboard size={14} />
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
                    <Layers size={14} />
                  </span>
                  <span className={styles.navLabel}>Queues</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Collapsible Inbox Section */}
          <div className={styles.subMenuContainer}>
            <div
              onClick={handleInboxHeaderClick}
              className={`${styles.navItem} ${styles.subMenuBar} ${
                location.pathname.includes('/inbox')
                  ? styles.subMenuActiveHeader
                  : ''
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleInboxHeaderClick()
                }
              }}
            >
              <span className={styles.navIcon}><Inbox size={18} /></span>
              {!collapsed && (
                <>
                  <span className={styles.navLabel}>Inbox</span>
                  <span className={styles.subChevron}>
                    {inboxOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </>
              )}
            </div>

            {/* Submenu items */}
            {inboxOpen && !collapsed && (
              <div className={styles.subItems}>
                <NavLink
                  to="/app/inbox/messages"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  <span className={styles.subMenuIcon}>
                    <MessageSquare size={14} />
                  </span>
                  <span className={styles.navLabel}>Messages</span>
                </NavLink>
                <NavLink
                  to="/app/inbox/comments"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                >
                  <span className={styles.subMenuIcon}>
                    <MessageCircle size={14} />
                  </span>
                  <span className={styles.navLabel}>Comments</span>
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
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user */}
        <div className={styles.sidebarBottom}>

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
        initialMedia={state.initialMedia}
        initialPlatform={state.initialPlatform}
        initialDate={state.initialDate}
        editPost={state.editPost}
      />
      
      {/* Premium Background Layer */}
      <MeshBackground />
      
      {/* Search & Actions Palette */}
      <CommandPalette onNewPost={() => openCreatePost({ source: 'command' })} />
    </div>
  )
}
