
import { MessageSquare } from 'lucide-react';
import { formatTime, getInitials, stringToColor } from '../utils';
import styles from '../InboxPage.module.css';
import type { Conversation } from '../types';

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  isLoading?: boolean;
}

function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'facebook': return 'f';
    case 'instagram': return 'i';
    case 'twitter': return 'x';
    case 'bluesky': return 'b';
    case 'reddit': return 'r';
    case 'telegram': return 't';
    case 'whatsapp': return 'w';
    default: return platform[0] || '?';
  }
}

function getPlatformClass(platform: string): string {
  switch (platform) {
    case 'facebook': return styles.bgFacebook;
    case 'instagram': return styles.bgInstagram;
    case 'twitter': return styles.bgTwitter;
    case 'bluesky': return styles.bgBluesky;
    case 'reddit': return styles.bgReddit;
    case 'telegram': return styles.bgTelegram;
    case 'whatsapp': return styles.bgWhatsapp;
    default: return '';
  }
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
                <span className={`${styles.platformBadge} ${getPlatformClass(conv.platform)}`}>
                  {getPlatformIcon(conv.platform)}
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
