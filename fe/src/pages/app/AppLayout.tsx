import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Lightbulb, CalendarDays,
  BarChart3, Settings, LogOut, ChevronLeft, Menu, PenSquare, TrendingUp, Repeat, HelpCircle, Layers
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useCreatePostModal } from '../../context/createPostModalContext'
import WorkspaceSwitcher from '../../components/workspace/WorkspaceSwitcher'
import CreatePostModal from '../../components/CreatePostModal'
import { shortId } from '../../utils/shortId'
import Toast, { type ToastItem } from '../../components/Toast'
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
  { to: '/app/workspaces', icon: <Layers size={18} />, label: 'Workspaces' },
  { to: '/app/help', icon: <HelpCircle size={18} />, label: 'Help Center' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { activeWorkspace } = useWorkspace()
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

      <aside className={styles.sidebar}>

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


        <div className={styles.newPostWrap}>
          <button
            className={`${styles.newPostBtn} ${collapsed ? styles.newPostBtnCollapsed : ''}`}
            onClick={() => openCreatePost({ source: 'direct' })}
          >
            <PenSquare size={16} />
            {!collapsed && <span>New Post</span>}
          </button>
        </div>


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

          {!collapsed && (
            <div className={styles.workspaceSection}>
              <WorkspaceSwitcher />
            </div>
          )}
          
          <div className={styles.userRow}>
             {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className={styles.avatar} />
            ) : (
                <div className={styles.avatar}>{user?.displayName?.[0] || 'U'}</div>
            )}
            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.displayName}</span>
                <span className={styles.userPlan}>{activeWorkspace?.name || 'No workspace'}</span>
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


      <main className={styles.main}>
        <Outlet />
      </main>


      <CreatePostModal
        isOpen={state.isOpen}
        onClose={closeCreatePost}
        onToast={addToast}
        initialContent={state.initialContent}
        initialDate={state.initialDate}
        editPost={state.editPost}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
      

      <AICoach />
      

      <MeshBackground />
      

      <CommandPalette onNewPost={() => openCreatePost({ source: 'command' })} />
    </div>
  )
}