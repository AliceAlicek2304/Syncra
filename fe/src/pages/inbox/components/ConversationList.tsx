
import { MessageSquare } from 'lucide-react';
import { formatTime, getInitials, stringToColor, mapPlatformToIconKey } from '../utils';
import { ExtendedPlatformIcon } from '../../../components/create-post/platformIcons';
import styles from '../InboxPage.module.css';
import type { Conversation } from '../types';

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  isLoading?: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  return (
    <div className={styles.masterPanel}>
      <div className={styles.listHeader}>
        <span>CONVERSATIONS ({conversations.length})</span>
      </div>
      <div className={styles.listScroll}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <span>Loading...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={28} />
            <span>No conversations match filters</span>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.listItem} ${selectedId === conv.id ? styles.listItemSelected : ''} ${!conv.isRead ? styles.listItemUnread : ''}`}
              onClick={() => onSelect(conv)}
            >
              <div className={styles.avatarWrap}>
                {conv.customerAvatar ? (
                  <img src={conv.customerAvatar} alt="" className={styles.avatar} />
                ) : (
                  <div
                    className={styles.avatarPlaceholder}
                    style={{ background: stringToColor(conv.customerName || conv.id) }}
                  >
                    {getInitials(conv.customerName)}
                  </div>
                )}
                <span className={styles.platformBadge}>
                  <ExtendedPlatformIcon platform={mapPlatformToIconKey(conv.platform)} size={14} />
                </span>
              </div>
              <div className={styles.itemBody}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemName}>{conv.customerName || 'Unknown'}</span>
                  {conv.updatedAt && (
                    <span className={styles.itemTime}>{formatTime(conv.updatedAt)}</span>
                  )}
                </div>
                <div className={styles.itemPreview}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {conv.lastMessage || 'No messages yet'}
                  </span>
                  {!conv.isRead && (
                    <span className={styles.badgeUnreadCount}>•</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
