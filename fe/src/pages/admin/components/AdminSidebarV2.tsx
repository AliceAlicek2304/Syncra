import { NavLink } from 'react-router-dom'
import { BarChart3, LayoutDashboard, Newspaper, ReceiptText, UsersRound, Zap } from 'lucide-react'
import styles from '../AdminModern.module.css'

const links = [
  { title: 'Tổng quan', to: '/admin', icon: LayoutDashboard, end: true },
  { title: 'Người dùng', to: '/admin/users', icon: UsersRound },
  { title: 'Bài đăng', to: '/admin/posts', icon: Newspaper },
  { title: 'Doanh thu', to: '/admin/revenue', icon: ReceiptText },
]

export default function AdminSidebarV2() {
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
      <div className={styles.navItem} aria-hidden>
        <BarChart3 size={18} />
        <span>Realtime metrics</span>
      </div>
    </aside>
  )
}
