import styles from './PostsQueuesPage.module.css'

export default function PostsQueuesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Queues</h1>
          <p className={styles.subtitle}>Manage your upcoming automated queue schedule.</p>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.placeholderText}>
          <p>Your queue slots and automation triggers will be displayed here.</p>
        </div>
      </div>
    </div>
  )
}
