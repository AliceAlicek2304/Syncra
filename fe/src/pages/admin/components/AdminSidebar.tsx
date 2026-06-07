import { NavLink } from 'react-router-dom'
import styles from '../AdminLayout.module.css'
import { useState } from 'react'

type MenuItem = {
  title: string
  to?: string
  children?: MenuItem[]
}

const menu: MenuItem[] = [
  { title: 'Dashboard', children: [{ title: 'Overview', to: '/admin' }] },
]

export default function AdminSidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggle = (title:string) => setOpenSections(s => ({ ...s, [title]: !s[title] }))

  return (
    <aside className={styles.sidebar}>
      <div style={{fontWeight:700, marginBottom:18, fontSize:16}}>Syncra Admin</div>

      {menu.map((m) => (
        <div key={m.title} style={{marginBottom:8}}>
          <button className={styles.menuSection} onClick={() => toggle(m.title)}>{m.title}</button>
          {m.children && openSections[m.title] && (
            <div className={styles.subMenu}>
              {m.children.map((c) => (
                <NavLink key={c.title} to={c.to || '#'} className={({isActive})=> isActive? `${styles.navItem} ${styles.navItemActive}`: styles.navItem}>{c.title}</NavLink>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{marginTop:16, fontSize:12, color:'#605d52'}}>Converted from srtdash — working in progress</div>
    </aside>
  )
}
