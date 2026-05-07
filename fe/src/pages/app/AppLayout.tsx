import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Lightbulb, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft, Menu, PenSquare, TrendingUp, Repeat, HelpCircle
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCreatePostModal } from '../../context/createPostModalContext'
import CreatePostModal from '../../components/CreatePostModal'
import AICoach from '../../components/AICoach'
import MeshBackground from '../../components/MeshBackground'
import CommandPalette from '../../components/CommandPalette'
import styles from './AppLayout.module.css'
import logo from '../../assets/syncra-logo.png'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/app/ideas', icon: <Lightbulb size={18} />, label: 'Ideas' },
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
  const [collapsed, setCollapsed] = useState(false)

  const { state, openCreatePost, closeCreatePost } = useCreatePostModal()

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

        {/* Workspace Selector */}
        {!collapsed && (
          <div className={styles.workspaceWrapper}>
            <WorkspaceSelector />
          </div>
        )}

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
