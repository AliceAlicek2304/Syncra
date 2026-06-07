import { Outlet } from 'react-router-dom'
import styles from './AdminLayout.module.css'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader from './components/AdminHeader'

export default function AdminLayout() {
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
