import { Settings } from 'lucide-react'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><Settings size={20} /></div>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Quản lý tài khoản và cấu hình kết nối nền tảng</p>
        </div>
      </div>
      <div className={`glass-card ${styles.placeholder}`}>
        <p>⚙️ Tính năng Settings đang được xây dựng — coming soon!</p>
      </div>
    </div>
  )
}
