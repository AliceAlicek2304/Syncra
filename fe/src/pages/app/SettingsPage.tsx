import { Settings } from 'lucide-react'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.comingSoon}>
        <Settings size={40} className={styles.icon} />
        <h1 className={styles.title}>Coming Soon</h1>
        <p className={styles.subtitle}>Settings page is under construction.</p>
      </div>
    </div>
  )
}
