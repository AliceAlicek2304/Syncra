import React, { useState } from 'react'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'
import type { CalPost } from '../../types/calendar'
import { PLATFORM_GRADIENTS } from '../../types/calendar'
import styles from '../../pages/app/CalendarPage.module.css'

interface VisualCardProps {
  post: CalPost
  onClick: (e: React.MouseEvent) => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  compact?: boolean // Compact mode for week/day views
  showTime?: boolean // Show time in the card
}

const VisualCard = React.memo(function VisualCard({
  post,
  onClick,
  isDragging,
  onDragStart,
  onDragEnd,
  compact = false,
  showTime = true,
}: VisualCardProps) {
  const gradient = PLATFORM_GRADIENTS[post.platform] || PLATFORM_GRADIENTS.TikTok
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className={`${styles.visualCard} ${compact ? styles.visualCardCompact : ''} ${isDragging ? styles.postPillDragging : ''}`}
      style={{ '--card-accent': post.color } as React.CSSProperties}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={post.title}
    >
      {/* Thumbnail on LEFT - smaller in compact mode */}
      <div className={`${styles.cardThumbnail} ${compact ? styles.cardThumbnailCompact : ''}`}>
        {post.image && !imageError ? (
          <img
            src={post.image}
            alt={post.title}
            className={styles.cardImage}
            onError={() => setImageError(true)}
          />
          ) : imageError ? (
          // Fallback when image fails to load
          <div className={`${styles.cardPlaceholderBroken} ${compact ? styles.cardPlaceholderCompact : ''}`}>
            <ExtendedPlatformIcon platform={post.platform} size={compact ? 14 : 20} />
          </div>
        ) : (
          <div className={`${styles.cardPlaceholder} ${compact ? styles.cardPlaceholderCompact : ''}`} style={{ background: gradient }}>
            <ExtendedPlatformIcon platform={post.platform} size={compact ? 14 : 20} />
          </div>
        )}
      </div>
      {/* Content on RIGHT */}
      <div className={`${styles.cardContent} ${compact ? styles.cardContentCompact : ''}`}>
        {showTime && <span className={styles.cardTime}>{post.time}</span>}
        <span className={`${styles.cardTitle} ${compact ? styles.cardTitleCompact : ''}`}>{post.title}</span>
        <div className={styles.cardPlatform}>
          <span className={`${styles.platformBadge} ${compact ? styles.platformBadgeCompact : ''}`} style={{ background: `${post.color}20`, color: post.color }}>
            {post.platform}
          </span>
        </div>
      </div>
    </div>
  )
})

export default VisualCard