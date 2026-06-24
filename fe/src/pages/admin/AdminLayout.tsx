import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import styles from './AdminModern.module.css'
import AdminSidebarV2 from './components/AdminSidebarV2'
import AdminHeaderV2 from './components/AdminHeaderV2'

export default function AdminLayout() {
  useEffect(() => {
    document.body.style.backgroundColor = '#f8fafc'
    document.body.style.color = '#0f172a'
    document.body.style.backgroundImage = 'none'

    return () => {
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
      document.body.style.backgroundImage = ''
    }
  }, [])

  return (
    <div className={styles.layout}>
      <AdminSidebarV2 />
      <div className={styles.shell}>
        <AdminHeaderV2 />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
