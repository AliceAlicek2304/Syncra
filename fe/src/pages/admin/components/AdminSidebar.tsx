import { NavLink, useLocation } from 'react-router-dom'
import styles from '../AdminLayout.module.css'
import { useState, useEffect } from 'react'

type MenuItem = {
  title: string
  to?: string
  children?: MenuItem[]
}

const menu: MenuItem[] = [
  { title: 'Dashboard', children: [
    { title: 'Tổng quan (Overview)', to: '/admin' },
    { title: 'Người dùng & Tài khoản', to: '/admin/users' },
    { title: 'Phân tích bài đăng', to: '/admin/posts' },
    { title: 'Phân tích doanh thu', to: '/admin/revenue' }
  ] },
]

export default function AdminSidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const location = useLocation()

  // Automatically open section if one of its children is active
  useEffect(() => {
    const currentPath = location.pathname
    menu.forEach(m => {
      if (m.children) {
        const hasActiveChild = m.children.some(c => c.to && currentPath.startsWith(c.to))
        if (hasActiveChild) {
          setOpenSections(s => ({ ...s, [m.title]: true }))
        }
      }
    })
  }, [location.pathname])

  const toggle = (title:string) => setOpenSections(s => ({ ...s, [title]: !s[title] }))

  return (
    <aside className={styles.sidebar}>
      <div style={{fontWeight:700, marginBottom:18, fontSize:16}}>Syncra Admin</div>

      {menu.map((m) => (
        <div key={m.title} style={{marginBottom:8}}>
          <button 
            className={styles.menuSection} 
            onClick={() => toggle(m.title)}
            style={{ 
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >{m.title}</button>
          {m.children && openSections[m.title] && (
            <div className={styles.subMenu}>
              {m.children.map((c) => (
                <NavLink 
                  key={c.title} 
                  to={c.to || '#'} 
                  end={c.to === '/admin'}
                  className={({isActive})=> isActive? `${styles.navItem} ${styles.navItemActive}`: styles.navItem}
                >{c.title}</NavLink>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{marginTop:16, fontSize:12, color:'#605d52'}}>Converted from srtdash — working in progress</div>
    </aside>
  )
}
