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
  const platformGradients: Record<string, string> = {
    TikTok: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    Instagram: 'linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%)',
    Facebook: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    X: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    LinkedIn: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
    YouTube: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  }
  const gradient = platformGradients[post.platform] || platformGradients.TikTok

  const [imageError, setImageError] = useState(false)

  return (
    <div
      className={`${styles.visualCard} ${isDragging ? styles.postPillDragging : ''}`}
      style={{ '--card-accent': post.color } as React.CSSProperties}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={post.title}
    >
      <div className={styles.cardThumbnail}>
        {post.image && !imageError ? (
          <img
            src={post.image}
            alt={post.title}
            className={styles.cardImage}
            onError={() => setImageError(true)}
          />
        ) : imageError ? (
          <div className={styles.cardPlaceholderBroken}>
            <ExtendedPlatformIcon platform={post.platform} size={20} />
          </div>
        ) : (
          <div className={styles.cardPlaceholder} style={{ background: gradient }}>
            <ExtendedPlatformIcon platform={post.platform} size={20} />
          </div>
        )}
      </div>
      <div className={styles.cardContent}>
        <span className={styles.cardTime}>{post.time}</span>
        <span className={styles.cardTitle}>{post.title}</span>
        <div className={styles.cardPlatform}>
          <span className={styles.platformBadge} style={{ background: `${post.color}20`, color: post.color }}>
            {post.platform}
          </span>
        </div>
      </div>
    </div>
  )
})
