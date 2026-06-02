import { useRef, useEffect } from 'react';
import { ArrowLeft, Loader2, BellOff, CheckCircle } from 'lucide-react';
import { getInitials, stringToColor } from '../utils';
import MessageInput from './MessageInput';
import styles from '../InboxPage.module.css';
import type { Conversation, Message } from '../types';

export interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string, attachments?: any[]) => Promise<void>;
  onBack: () => void;
  onResolve?: () => void;
  onMute?: () => void;
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

export default function ChatArea({
  conversation,
  messages,
  isLoading,
  onSend,
  onBack,
  onResolve,
  onMute
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!conversation) {
    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailEmpty}>
          <span>Select a conversation to start messaging</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailPanel}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.headerInfo}>
          <button className={styles.backBtn} onClick={onBack} title="Back to conversations">
            <ArrowLeft size={16} />
          </button>
          <div className={styles.avatarWrap} style={{ width: 36, height: 36 }}>
            {conversation.customerAvatar ? (
              <img src={conversation.customerAvatar} alt="" className={styles.avatar} style={{ width: 36, height: 36 }} />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ width: 36, height: 36, background: stringToColor(conversation.customerName || conversation.id) }}
              >
                {getInitials(conversation.customerName)}
              </div>
            )}
            <span className={`${styles.platformBadge} ${getPlatformClass(conversation.platform)}`} style={{ width: 14, height: 14, fontSize: 8 }}>
              {getPlatformIcon(conversation.platform)}
            </span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerTitle}>{conversation.customerName || 'Customer'}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn} onClick={onMute}>
            <BellOff size={14} /> Mute
          </button>
          <button className={`${styles.actionBtn} ${styles.actionBtnActive}`} onClick={onResolve}>
            <CheckCircle size={14} /> Resolve
          </button>
        </div>
      </div>

      {/* Chat Thread */}
      <div className={styles.chatContainer} ref={scrollRef}>
        {isLoading ? (
          <div className={styles.detailEmpty}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.detailEmpty}>
            <span>No messages. Send a message to start!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderType === 'admin';

            return (
              <div
                key={msg.id}
                className={isAdmin ? styles.threadSent : styles.threadReceived}
              >
                <div className={styles.bubbleContainer}>
                  {!isAdmin && (
                     <div className={styles.avatarWrap} style={{ width: 24, height: 24, alignSelf: 'flex-start', marginTop: 4 }}>
                       {conversation.customerAvatar ? (
                         <img src={conversation.customerAvatar} alt="" className={styles.avatar} style={{ width: 24, height: 24 }} />
                       ) : (
                         <div
                           className={styles.avatarPlaceholder}
                           style={{ width: 24, height: 24, fontSize: 10, background: stringToColor(conversation.customerName || conversation.id) }}
                         >
                           {getInitials(conversation.customerName)}
                         </div>
                       )}
                     </div>
                  )}

                  <div className={styles.bubble}>
                    <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 'bold', color: isAdmin ? 'var(--clr-body-mid)' : 'var(--clr-body)' }}>
                      {isAdmin ? 'Tin nhắn admin' : 'Tin nhắn khách hàng'}
                    </div>
                    {msg.content}
                    
                    <div className={styles.bubbleMeta}>
                      <span>Status: {msg.status === 'read' ? 'Read' : msg.status === 'sent' ? 'Sent' : 'Sending'}</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageInput onSend={onSend} />
    </div>
  );
}
