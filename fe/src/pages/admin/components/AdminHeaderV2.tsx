import { ShieldCheck, UserRound } from 'lucide-react'
import styles from '../AdminModern.module.css'

export default function AdminHeaderV2() {
  const isDevOpen = import.meta.env.VITE_ADMIN_OPEN === 'true'

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarTitle}>
        <ShieldCheck size={19} color="#2563eb" />
        <span>Bảng điều khiển</span>
      </div>
      <div className={styles.toolbar}>
        {isDevOpen && <span className={styles.badge}>DEV OPEN</span>}
        <span className={styles.badge}>Admin only</span>
        <span className={styles.avatar}><UserRound size={18} /></span>
      </div>
    </header>
  )
}
