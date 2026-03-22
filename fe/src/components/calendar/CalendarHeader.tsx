
import { Plus } from 'lucide-react'
import styles from '../../pages/app/CalendarPage.module.css'

interface CalendarHeaderProps {
  onNewPost: () => void
}

export default function CalendarHeader({ onNewPost }: CalendarHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Content Calendar</h1>
        <p className={styles.subtitle}>Schedule and manage all your posts</p>
      </div>
      <button
        className={styles.newPostBtn}
        onClick={onNewPost}
      >
        <Plus size={15} /> New Post
      </button>
    </div>
  )
}