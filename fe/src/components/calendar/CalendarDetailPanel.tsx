
import { Clock, Plus } from 'lucide-react'
import type { CalPost } from '../../types/calendar'
import { MONTHS } from '../../types/calendar'
import PostCard from './PostCard'
import styles from '../../pages/app/CalendarPage.module.css'

interface CalendarDetailPanelProps {
  selectedDay: number | null
  month: number
  year: number
  selectedPosts: CalPost[]
  onCreatePost: (year: number, month: number, day: number) => void
  onEditPost: (post: CalPost) => void
}

export default function CalendarDetailPanel({
  selectedDay,
  month,
  year,
  selectedPosts,
  onCreatePost,
  onEditPost
}: CalendarDetailPanelProps) {
  return (
    <div className={`glass-card ${styles.detailCard}`}>
      {selectedDay ? (
        <>
          <div className={styles.detailHeader}>
            <span className={styles.detailDate}>{MONTHS[month]} {selectedDay}</span>
            <div className={styles.detailActions}>
              <span className={styles.detailCount}>{selectedPosts.length} posts</span>
              <button
                className={styles.detailAddBtn}
                onClick={() => onCreatePost(year, month, selectedDay)}
                title="Add post"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {selectedPosts.length === 0 ? (
            <div className={styles.emptyDay}>
              <Clock size={28} className={styles.emptyIcon} />
              <p>No posts yet</p>
              <button
                className="btn-primary"
                onClick={() => onCreatePost(year, month, selectedDay)}
                style={{ fontSize: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={12} /> Create Post
              </button>
            </div>
          ) : (
            <div className={styles.postList}>
              {selectedPosts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  onClick={() => onEditPost(p)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyDay}>
          <Clock size={28} className={styles.emptyIcon} />
          <p>Select a day to view details</p>
        </div>
      )}
    </div>
  )
}