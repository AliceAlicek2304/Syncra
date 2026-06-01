import { useState, memo } from 'react'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import type { CalPost } from './CalendarConstants'
import styles from './VisualCard.module.css'

interface VisualCardProps {
  post: CalPost
  onClick: (e: React.MouseEvent) => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

export const VisualCard = memo(function VisualCard({
  post, onClick, isDragging, onDragStart, onDragEnd
}: VisualCardProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className={`${styles.visualCard} ${isDragging ? styles.dragging : ''}`}
      style={{ '--card-accent': post.color } as React.CSSProperties}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={post.title}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTime}>{post.time}</span>
        <ExtendedPlatformIcon platform={post.platform} size={12} />
      </div>
      {post.image && !imageError ? (
        <div className={styles.cardThumb}>
          <img
            src={post.image}
            alt={post.title}
            className={styles.cardImage}
            onError={() => setImageError(true)}
          />
        </div>
      ) : null}
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{post.title}</span>
      </div>
      <div className={styles.cardFooter}>
        <ExtendedPlatformIcon platform={post.platform} size={14} />
      </div>
    </div>
  )
})
