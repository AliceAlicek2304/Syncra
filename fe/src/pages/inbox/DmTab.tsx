import { useState, useCallback, useMemo } from 'react';
import { MessageSquare, ArrowLeft, Loader2, Send } from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxConversationDto, InboxMessageDto } from '../../api/inbox';
import { formatTime, getInitials, stringToColor } from './utils';
import styles from './InboxPage.module.css';

interface DmTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
}

function ConversationListItem({
  conv,
  isSelected,
  onClick,
}: {
  conv: InboxConversationDto;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''} ${!conv.isRead ? styles.listItemUnread : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatarWrap}>
        {conv.participantAvatarUrl ? (
          <img src={conv.participantAvatarUrl} alt="" className={styles.avatar} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            style={{ background: stringToColor(conv.participantName ?? conv.id) }}
          >
            {getInitials(conv.participantName)}
          </div>
        )}
      </div>
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{conv.participantName ?? 'Unknown'}</span>
          {conv.lastMessageAtUtc && (
            <span className={styles.itemTime}>{formatTime(conv.lastMessageAtUtc)}</span>
          )}
        </div>
        <div className={styles.itemPreview}>
          {conv.lastMessageText ?? 'No messages yet'}
        </div>
      </div>
    </div>
  );
}

interface ThreadViewProps {
  messages: InboxMessageDto[];
  isLoading: boolean;
  onSend: (text: string, accountId: string) => Promise<void>;
  onBack: () => void;
  conversation: InboxConversationDto;
}

function ThreadView({ messages, isLoading, onSend, onBack, conversation }: ThreadViewProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [accountId, setAccountId] = useState('');

  // Derive account id from conversation or default to first social account
  const defaultAccountId = conversation.socialAccountId ?? accountId;

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !defaultAccountId) return;
    setSending(true);
    try {
      await onSend(draft.trim(), defaultAccountId);
      setDraft('');
    } finally {
      setSending(false);
    }
  }, [draft, defaultAccountId, onSend]);

  return (
    <>
      {/* Header */}
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack} title="Back to conversations">
          <ArrowLeft size={16} />
        </button>
        <span className={styles.detailTitle}>
          {conversation.participantName ?? 'Conversation'}
        </span>
      </div>

      {/* Thread */}
      {isLoading ? (
        <div className={styles.detailEmpty}>
          <Loader2 size={20} className={styles.spinner} />
          <span>Loading messages...</span>
        </div>
      ) : messages.length === 0 ? (
        <div className={styles.detailEmpty}>
          <MessageSquare size={32} className={styles.emptyIcon} />
          <span>No messages in this conversation</span>
        </div>
      ) : (
        <div className={styles.thread}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.direction === 'outgoing' ? styles.threadSent : styles.threadReceived}
            >
              {msg.bodyText}
              <div className={styles.threadTime}>
                {new Date(msg.sentAtUtc).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DM reply bar */}
      <div className={styles.replyArea}>
        <input
          className={styles.replyInput}
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          className={styles.replySendBtn}
          disabled={!draft.trim() || sending || !defaultAccountId}
          onClick={handleSend}
        >
          {sending ? <Loader2 size={14} className={styles.spinner} /> : <Send size={14} />}
        </button>
      </div>
    </>
  );
}

export default function DmTab({ workspaceId, platform, accountId }: DmTabProps) {
  const {
    conversations,
    markConversationRead,
    sendDmReply,
  } = useInbox({ workspaceId, platform, accountId: undefined });

  const [selectedConv, setSelectedConv] = useState<InboxConversationDto | null>(null);
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Flatten pages
  const convList = useMemo(
    () => conversations.data?.pages.flatMap((p) => p.items) ?? [],
    [conversations.data],
  );

  const handleSelectConversation = useCallback(
    async (conv: InboxConversationDto) => {
      setSelectedConv(conv);

      // Optimistically mark read
      if (!conv.isRead) {
        void markConversationRead(conv.id);
      }

      // Fetch messages
      if (!workspaceId) return;
      setMessagesLoading(true);
      try {
        const { inboxApi } = await import('../../api/inbox');
        const msgs = await inboxApi.getConversationMessages(workspaceId, conv.id);
        setMessages(msgs);
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [workspaceId, markConversationRead],
  );

  const handleSend = useCallback(
    async (text: string, aid: string) => {
      if (!selectedConv || !workspaceId) return;
      await sendDmReply({ conversationId: selectedConv.id, text, accountId: aid });
      // Refresh messages
      const { inboxApi } = await import('../../api/inbox');
      const msgs = await inboxApi.getConversationMessages(workspaceId, selectedConv.id);
      setMessages(msgs);
    },
    [selectedConv, workspaceId, sendDmReply],
  );

  const handleBack = useCallback(() => {
    setSelectedConv(null);
    setMessages([]);
  }, []);

  // Loading state
  if (conversations.isLoading) {
    return (
      <div className={styles.emptyState}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className={styles.masterDetail}>
      {/* Left: conversation list */}
      <div className={styles.masterPanel}>
        {convList.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={28} />
            <span>No direct messages yet</span>
          </div>
        ) : (
          convList.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conv={conv}
              isSelected={selectedConv?.id === conv.id}
              onClick={() => handleSelectConversation(conv)}
            />
          ))
        )}
      </div>

      {/* Right: thread or empty prompt */}
      <div className={styles.detailPanel}>
        {selectedConv ? (
          <ThreadView
            messages={messages}
            isLoading={messagesLoading}
            onSend={handleSend}
            onBack={handleBack}
            conversation={selectedConv}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <MessageSquare size={36} />
            <span>Select a conversation to view messages</span>
          </div>
        )}
      </div>
    </div>
  );
}
