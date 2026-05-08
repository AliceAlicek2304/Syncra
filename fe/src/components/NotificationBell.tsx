import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNotificationHub } from '../hooks/useNotificationHub';
import styles from './NotificationBell.module.css';

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const { notifications, hasUnread, markRead, markAllRead } = useNotificationHub({
    workspaceId: activeWorkspace?.id,
  });

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.bellBtn} onClick={() => setOpen((v) => !v)}>
        <Bell size={18} />
        {hasUnread && <span className={styles.unreadDot} />}
      </button>

      {open && (
        <div className={`glass-card ${styles.dropdown}`}>
          <div className={styles.header}>
            <span className={styles.title}>Notifications</span>
            {notifications.length > 0 && (
              <button type="button" className={styles.markAll} onClick={() => void markAllRead()}>
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No notifications yet</div>
              <div className={styles.emptyBody}>We'll let you know when something important happens.</div>
            </div>
          ) : (
            <div className={styles.list}>
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.item}
                  onClick={() => {
                    if (!item.readAtUtc) {
                      void markRead(item.id);
                    }
                  }}
                >
                  <div className={styles.itemTitle}>
                    {!item.readAtUtc && <span className={styles.itemUnreadDot} />}
                    <span>{item.title}</span>
                  </div>
                  <div className={styles.itemBody}>{item.body}</div>
                  <div className={styles.timestamp}>{formatTime(item.createdAtUtc)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
