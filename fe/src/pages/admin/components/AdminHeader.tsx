import styles from '../AdminLayout.module.css'

export default function AdminHeader() {
  const isDevOpen = import.meta.env.VITE_ADMIN_OPEN === 'true'

  return (
    <header className={styles.headerBar}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <div className={styles.hamburger} aria-hidden />
        <div style={{fontSize:18, fontWeight:600}}>Bảng điều khiển</div>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        {isDevOpen && <span className={styles.devBadge}>DEV-MỞ</span>}
        <div style={{width:36, height:36, borderRadius:18, background:'#fff', border:'1px solid #eee'}} />
      </div>
    </header>
  )
}
