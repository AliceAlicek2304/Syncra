import { CheckCircle, Play } from 'lucide-react'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'
import type { CalPost } from '../../types/calendar'
import { getStatusLabel } from '../../types/calendar'
import styles from '../../pages/app/CalendarPage.module.css'

interface PostCardProps {
  post: CalPost
  onClick: () => void
}

export default function PostCard({ post, onClick }: PostCardProps) {
  return (
    <div
      className={styles.postCard}
      onClick={onClick}
    >
      <div className={styles.postCardHeader}>
        <div className={styles.postCardStatus}>
          <CheckCircle size={14} className={styles.postCardStatusIcon} />
          <span className={`${styles.postCardStatusText} ${post.status === 'scheduled' ? styles.postCardStatusTextScheduled : ''}`}>
            {getStatusLabel(post.status)}
          </span>
        </div>
        <span className={styles.postCardTime}>{post.time}</span>
      </div>

      <div className={styles.postCardBody}>
        <div className={styles.postCardThumbnail}>
          {post.image ? (
            <img src={post.image} alt={post.title} />
          ) : (
            <div
              className={styles.postCardThumbnailPlaceholder}
              style={{ background: post.color }}
            >
              <ExtendedPlatformIcon platform={post.platform} size={18} />
            </div>
          )}

          {(post.platform === 'YouTube' || post.platform === 'TikTok') && (
            <div className={styles.postCardVideoOverlay}>
              <Play size={18} className={styles.postCardVideoIcon} />
            </div>
          )}
        </div>
        <div className={styles.postCardContent}>
          <span className={styles.postCardTitle}>{post.title}</span>
          {post.caption && (
            <span className={styles.postCardCaption}>{post.caption}</span>
          )}
        </div>
      </div>

      <div className={styles.postCardFooter}>
        <div
          className={styles.postCardPlatformIcon}
          style={{ background: post.color }}
          title={post.platform}
        >
          <ExtendedPlatformIcon platform={post.platform} size={10} />
        </div>
      </div>
    </div>
  )
}