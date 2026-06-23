import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import styles from './AdminLayout.module.css'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader from './components/AdminHeader'

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
      <AdminSidebar />
      <div style={{flex:1, display:'flex', flexDirection:'column'}}>
        <AdminHeader />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
