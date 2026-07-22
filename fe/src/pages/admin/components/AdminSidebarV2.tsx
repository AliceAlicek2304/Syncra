import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, LayoutDashboard, Newspaper, ReceiptText, TicketPercent, UsersRound, Zap, LogOut } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import styles from '../AdminModern.module.css'

const links = [
  { title: 'Tổng quan', to: '/admin', icon: LayoutDashboard, end: true },
  { title: 'Người dùng', to: '/admin/users', icon: UsersRound },
  { title: 'Bài đăng', to: '/admin/posts', icon: Newspaper },
  { title: 'Doanh thu', to: '/admin/revenue', icon: ReceiptText },
  { title: 'Mã giảm giá', to: '/admin/vouchers', icon: TicketPercent },
]

const monitorLinks = [
  { title: 'Realtime metrics', to: '/admin/realtime', icon: BarChart3 },
]

export default function AdminSidebarV2() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}><Zap size={18} /></span>
        <span>Syncra Admin</span>
      </div>

      <div className={styles.navGroupLabel}>Điều hành</div>
      <nav className={styles.navScroll} aria-label="Admin navigation">
        {links.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon size={18} />
              <span>{item.title}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className={styles.navGroupLabel}>Theo dõi</div>
      <nav className={styles.navScroll} aria-label="Admin monitoring navigation">
        {monitorLinks.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon size={18} />
              <span>{item.title}</span>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />
      <div 
        className={styles.navItem} 
        style={{ color: '#ef4444', marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '16px', cursor: 'pointer' }}
        onClick={handleLogout}
        role="button"
        tabIndex={0}
      >
        <LogOut size={18} />
        <span>Đăng xuất</span>
      </div>
    </aside>
  )
}
