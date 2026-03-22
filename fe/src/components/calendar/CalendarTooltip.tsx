
import type { CalPost } from '../../types/calendar'
import { getStatusLabel } from '../../types/calendar'
import styles from '../../pages/app/CalendarPage.module.css'

interface CalendarTooltipProps {
  post: CalPost
  x: number
  y: number
}

export default function CalendarTooltip({ post, x, y }: CalendarTooltipProps) {
  return (
    <div
      className={styles.tooltip}
      style={{
        left: x,
        top: y - 8,
        transform: 'translate(-50%, -100%)'
      }}
      role="tooltip"
    >
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipTime}>{post.time}</div>
        <div className={styles.tooltipTitle}>{post.title}</div>
        <div className={styles.tooltipMeta}>
          <span className={styles.tooltipPlatform} style={{ color: post.color }}>
            {post.platform}
          </span>
          <span className={styles.tooltipStatus}>{getStatusLabel(post.status)}</span>
        </div>
      </div>
      <div className={styles.tooltipArrow} />
    </div>
  )
}