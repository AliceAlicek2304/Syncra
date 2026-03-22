import React, { useState } from 'react'
import { Clock, Play } from 'lucide-react'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'
import type { CalPost } from '../../types/calendar'
import styles from '../../pages/app/CalendarPage.module.css'

interface PostChipProps {
  post: CalPost
  onClick: (e: React.MouseEvent) => void
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseLeave: () => void
  isDragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  compact?: boolean // For compact mode in dense calendars
}

export default function PostChip({
  post,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isDragging = false,
  onDragStart,
  onDragEnd,
  compact = false
}: PostChipProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    if (compact && !isExpanded) {
      e.stopPropagation()
      setIsExpanded(true)
      return
    }
    onClick(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(e as any)
    } else if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false)
    }
  }

  if (compact) {
    return (
      <div
        className={`${styles.cellPostChip} ${styles.cellPostChipCompact} ${isDragging ? styles.postPillDragging : ''} ${isExpanded ? styles.cellPostChipExpanded : ''}`}
        style={{ borderLeft: `3px solid ${post.color}` }}
        onClick={handleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {!isExpanded ? (
          // Compact view - just time and truncated title
          <>
            <span className={styles.chipTime}>{post.time}</span>
            <span className={styles.chipTitle}>{post.title}</span>
            <span className={styles.chipExpandHint}>⋯</span>
          </>
        ) : (
          // Expanded view - full details
          <div className={styles.chipExpandedContent}>
            <div className={styles.chipExpandedHeader}>
              <span className={styles.chipTime}>{post.time}</span>
              <ExtendedPlatformIcon platform={post.platform} size={12} />
            </div>
            <div className={styles.chipExpandedTitle}>{post.title}</div>
            {post.caption && (
              <div className={styles.chipExpandedCaption}>
                {post.caption.length > 60 ? `${post.caption.substring(0, 60)}...` : post.caption}
              </div>
            )}
            <div className={styles.chipExpandedActions}>
              <button className={styles.chipEditBtn} onClick={onClick}>
                Edit Post
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular (non-compact) view
  return (
    <div
      className={`${styles.cellPostChip} ${isDragging ? styles.postPillDragging : ''}`}
      style={{ background: `${post.color}20`, borderLeft: `3px solid ${post.color}` }}
      draggable={!post.isMock}
      onDragStart={(e) => {
        e.stopPropagation()
        if (!post.isMock && onDragStart) onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={`${post.time} · ${post.title}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.chipLeft}>
        <Clock size={11} className={styles.chipClock} />
        <span className={styles.chipTime}>{post.time}</span>
      </div>
      <div className={styles.chipCenter}>
        <span className={styles.chipTitle}>{post.title}</span>
        <div className={styles.chipMeta}>
          <ExtendedPlatformIcon platform={post.platform} size={10} />
          {post.status === 'scheduled' && <span className={styles.chipStatus}>Scheduled</span>}
          {post.status === 'published' && <span className={styles.chipStatus}>Posted</span>}
        </div>
      </div>
      <div className={styles.chipRight}>
        {post.caption && <span className={styles.chipHasCaption}>💬</span>}
        {(post.platform === 'YouTube' || post.platform === 'TikTok') && (
          <Play size={10} className={styles.chipVideoIcon} />
        )}
      </div>
    </div>
  )
}