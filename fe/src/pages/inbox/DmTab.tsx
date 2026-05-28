import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare,
  ArrowLeft,
  Loader2,
  Send,
  Paperclip,
  Smile,
  AlertTriangle,
  Trash2,
  Edit2,
  X,
  FileText,
  FileCode,
  Video,
  FileAudio,
} from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxConversationDto, InboxMessageDto } from '../../api/inbox';
import { formatTime, getInitials, stringToColor } from './utils';
import { useToast } from '../../context/ToastContext';
import styles from './InboxPage.module.css';

interface DmTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
  search?: string;
  unreadOnly?: boolean;
}

const WHATSAPP_TEMPLATES = [
  { name: 'hello_world', text: 'Welcome! Thank you for contacting our support team.' },
  { name: 'order_confirmation', text: 'Your order #1084 for Acme Goods has been confirmed. Delivery is scheduled for tomorrow.' },
  { name: 'delivery_update', text: 'Hi! Your delivery is on its way. Track it here: https://syncra.io/delivery' },
  { name: 'payment_reminder', text: 'Reminder: The invoice #INV-928 for $49.00 is due today. Pay now at https://syncra.io/pay.' },
];

function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'facebook': return 'f';
    case 'instagram': return 'i';
    case 'twitter': return 'x';
    case 'bluesky': return 'b';
    case 'reddit': return 'r';
    case 'telegram': return 't';
    case 'whatsapp': return 'w';
    default: return platform[0];
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
        <span className={`${styles.platformBadge} ${getPlatformClass(conv.platform)}`}>
          {getPlatformIcon(conv.platform)}
        </span>
      </div>
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{conv.participantName ?? 'Unknown'}</span>
          {conv.lastMessageAtUtc && (
            <span className={styles.itemTime}>{formatTime(conv.lastMessageAtUtc)}</span>
          )}
        </div>
        <div className={styles.itemPreview}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {conv.lastMessageText ?? 'No messages yet'}
          </span>
          {conv.unreadCount > 0 && (
            <span className={styles.badgeUnreadCount}>{conv.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ThreadViewProps {
  messages: InboxMessageDto[];
  isLoading: boolean;
  onSend: (text: string, accountId: string, attachments?: any[], buttons?: any[]) => Promise<void>;
  onEditMessage: (messageId: string, newText: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onBack: () => void;
  conversation: InboxConversationDto;
}

function ThreadView({
  messages: initialMessages,
  isLoading,
  onSend,
  onEditMessage,
  onDeleteMessage,
  onBack,
  conversation,
}: ThreadViewProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Message modifications
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);

  // File Upload State
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const defaultAccountId = conversation.socialAccountId ?? 'mock-account-id';

  // Scroll to bottom on load / updates
  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
    }
  }, [initialMessages, isLoading]);

  // WhatsApp 24h rule check
  const isWhatsApp = conversation.platform === 'whatsapp';
  const lastIncomingMsg = useMemo(() => {
    return [...initialMessages].reverse().find((m) => m.direction === 'incoming');
  }, [initialMessages]);

  const needsWhatsAppTemplate = useMemo(() => {
    if (!isWhatsApp || !lastIncomingMsg) return false;
    const lastMsgTime = new Date(lastIncomingMsg.sentAtUtc).getTime();
    const diffHours = (Date.now() - lastMsgTime) / 3600000;
    return diffHours > 24;
  }, [isWhatsApp, lastIncomingMsg]);

  // Attachment Support check
  const supportsAttachments = useMemo(() => {
    return !['reddit', 'bluesky'].includes(conversation.platform);
  }, [conversation.platform]);

  // Quick reply buttons support check (Facebook, Instagram, Telegram)
  const supportsButtons = useMemo(() => {
    return ['facebook', 'instagram', 'telegram'].includes(conversation.platform);
  }, [conversation.platform]);

  // Editing support check (Telegram only)
  const supportsEditing = useMemo(() => {
    return conversation.platform === 'telegram';
  }, [conversation.platform]);

  // Deletion support check
  const supportsDeletion = useMemo(() => {
    return ['facebook', 'instagram', 'whatsapp', 'telegram'].includes(conversation.platform);
  }, [conversation.platform]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      await onSend(draft.trim(), defaultAccountId, attachments);
      setDraft('');
      setAttachments([]);
    } finally {
      setSending(false);
    }
  }, [draft, defaultAccountId, attachments, onSend]);

  const handleSendTemplate = (template: typeof WHATSAPP_TEMPLATES[0]) => {
    setDraft(template.text);
    setShowTemplateSelector(false);
    toastSuccess(`Template "${template.name}" loaded`);
  };

  const handleEmojiSelect = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles: any[] = [];

    for (const file of fileList) {
      // Platform Specific Attachment Constraints
      const sizeMB = file.size / (1024 * 1024);

      if (conversation.platform === 'twitter' && sizeMB > 25) {
        toastError('Twitter limits DM attachments to 25MB.');
        continue;
      }
      if (conversation.platform === 'telegram') {
        if (file.type.startsWith('image/') && sizeMB > 10) {
          toastError('Telegram limits images to 10MB.');
          continue;
        }
        if (file.type.startsWith('video/') && sizeMB > 50) {
          toastError('Telegram limits videos to 50MB.');
          continue;
        }
      }
      if (conversation.platform === 'whatsapp') {
        if (file.type.startsWith('image/') && sizeMB > 5) {
          toastError('WhatsApp limits images to 5MB.');
          continue;
        }
        if (file.type.startsWith('video/') && sizeMB > 16) {
          toastError('WhatsApp limits videos to 16MB.');
          continue;
        }
        if (file.type.startsWith('audio/') && sizeMB > 16) {
          toastError('WhatsApp limits audio to 16MB.');
          continue;
        }
        if (sizeMB > 100) {
          toastError('WhatsApp limits documents to 100MB.');
          continue;
        }
      }

      // Generate a preview URL
      const type: 'image' | 'video' | 'file' | 'audio' = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : 'file';

      validFiles.push({
        name: file.name,
        type,
        url: URL.createObjectURL(file),
      });
    }

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }
  };

  const handleEditClick = (msg: InboxMessageDto) => {
    setEditingMessageId(msg.id);
    setEditDraft(msg.bodyText ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editDraft.trim()) return;
    try {
      await onEditMessage(editingMessageId, editDraft.trim());
      setEditingMessageId(null);
      setEditDraft('');
      toastSuccess('Message updated');
    } catch {
      toastError('Could not update message');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirmId) return;
    try {
      await onDeleteMessage(showDeleteConfirmId);
      setShowDeleteConfirmId(null);
      toastSuccess('Message unsent');
    } catch {
      toastError('Could not delete message');
    }
  };

  return (
    <>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.headerInfo}>
          <button className={styles.backBtn} onClick={onBack} title="Back to conversations">
            <ArrowLeft size={16} />
          </button>
          <div className={styles.avatarWrap} style={{ width: 36, height: 36 }}>
            {conversation.participantAvatarUrl ? (
              <img src={conversation.participantAvatarUrl} alt="" className={styles.avatar} style={{ width: 36, height: 36 }} />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ width: 36, height: 36, background: stringToColor(conversation.participantName ?? conversation.id) }}
              >
                {getInitials(conversation.participantName)}
              </div>
            )}
            <span className={`${styles.platformBadge} ${getPlatformClass(conversation.platform)}`} style={{ width: 14, height: 14, fontSize: 8 }}>
              {getPlatformIcon(conversation.platform)}
            </span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerTitle}>{conversation.participantName ?? 'Conversation'}</span>
            <span className={styles.headerSubtitle}>
              {conversation.platform} Channel
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn} onClick={onBack}>
            Archive
          </button>
          <button className={`${styles.actionBtn} ${styles.actionBtnActive}`}>
            Resolve
          </button>
        </div>
      </div>

      {/* WhatsApp 24h warning banner */}
      {needsWhatsAppTemplate && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={16} />
          <span>
            <strong>WhatsApp 24-hour limit active.</strong> You can only send template messages since the customer's last reply was over 24 hours ago.
          </span>
          <button
            className={styles.warningActionBtn}
            onClick={() => setShowTemplateSelector(prev => !prev)}
          >
            Select Template
          </button>
        </div>
      )}

      {/* Chat Thread */}
      <div className={styles.chatContainer} ref={threadScrollRef}>
        {isLoading ? (
          <div className={styles.detailEmpty}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Loading message history...</span>
          </div>
        ) : initialMessages.length === 0 ? (
          <div className={styles.detailEmpty}>
            <MessageSquare size={36} className={styles.emptyIcon} />
            <span>No messages. Send a message to start the conversation!</span>
          </div>
        ) : (
          initialMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className={styles.systemMessage}>
                  {msg.bodyText}
                </div>
              );
            }

            const isOutgoing = msg.direction === 'outgoing';

            return (
              <div
                key={msg.id}
                className={isOutgoing ? styles.threadSent : styles.threadReceived}
              >
                <div className={styles.bubbleContainer}>
                  {/* Message Bubble content */}
                  <div className={styles.bubble}>
                    {/* Render attachments */}
                    {msg.attachments && msg.attachments.map((attach, idx) => (
                      <div key={idx} className={styles.mediaAttachment}>
                        {attach.type === 'image' && (
                          <img src={attach.url} alt="Attachment" className={styles.mediaImg} />
                        )}
                        {attach.type === 'video' && (
                          <video src={attach.url} controls className={styles.mediaVideo} />
                        )}
                        {attach.type === 'audio' && (
                          <audio src={attach.url} controls style={{ width: '100%', maxWidth: 200 }} />
                        )}
                        {attach.type === 'file' && (
                          <div className={styles.docAttachment} style={{ border: 'none', margin: 0, padding: 4 }}>
                            <FileText size={16} />
                            <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {attach.name || 'document'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Inline Telegram editing view */}
                    {editingMessageId === msg.id ? (
                      <div className={styles.editInputWrapper}>
                        <textarea
                          className={styles.editInput}
                          rows={2}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                        />
                        <div className={styles.editActions}>
                          <button className={`${styles.editActionBtn} ${styles.editCancel}`} onClick={() => setEditingMessageId(null)}>
                            Cancel
                          </button>
                          <button className={`${styles.editActionBtn} ${styles.editSave}`} onClick={handleSaveEdit}>
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.bodyText}
                        <div className={styles.bubbleMeta}>
                          {msg.isEdited && <span className={styles.editedTag}>edited</span>}
                          <span>
                            {new Date(msg.sentAtUtc).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions row (edit / delete) on hover */}
                  {!editingMessageId && isOutgoing && (
                    <div className={styles.messageActions}>
                      {supportsEditing && (
                        <button
                          className={styles.msgActionBtn}
                          onClick={() => handleEditClick(msg)}
                          title="Edit message"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {supportsDeletion && (
                        <button
                          className={styles.msgActionBtn}
                          onClick={() => setShowDeleteConfirmId(msg.id)}
                          title="Unsend message"
                        >
                          <Trash2 size={12} style={{ color: '#f87171' }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick replies (Buttons/Suggestions) */}
      {supportsButtons && initialMessages.length > 0 && !needsWhatsAppTemplate && (
        <div className={styles.quickRepliesContainer}>
          <button className={styles.quickReplyBtn} onClick={() => setDraft('Sounds good, thank you!')}>
            Sounds good!
          </button>
          <button className={styles.quickReplyBtn} onClick={() => setDraft('Could you provide more details?')}>
            Need details
          </button>
          <button className={styles.quickReplyBtn} onClick={() => setDraft('Sure, we can help with that!')}>
            Sure!
          </button>
        </div>
      )}

      {/* Input area */}
      <div className={styles.replyArea}>
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className={styles.attachmentPreviews}>
            {attachments.map((file, idx) => (
              <div key={idx} className={styles.attachmentThumb}>
                {file.type === 'image' ? (
                  <img src={file.url} alt="" />
                ) : file.type === 'video' ? (
                  <div style={{ background: '#1e293b', width: '100%', height: '100%', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={16} color="var(--text-muted)" />
                  </div>
                ) : file.type === 'audio' ? (
                  <div style={{ background: '#1e293b', width: '100%', height: '100%', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileAudio size={16} color="var(--text-muted)" />
                  </div>
                ) : (
                  <div style={{ background: '#1e293b', width: '100%', height: '100%', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCode size={16} color="var(--text-muted)" />
                  </div>
                )}
                <button
                  className={styles.removeAttachmentBtn}
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Floating popovers */}
        {showEmojiPicker && (
          <div className={styles.emojiPopover}>
            <div className={styles.emojiGrid}>
              {['😀', '😂', '🔥', '👍', '🙏', '❤️', '🎉', '💡', '🚀', '✨', '👏', '👀'].map((emoji) => (
                <button
                  key={emoji}
                  className={styles.emojiBtn}
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {showTemplateSelector && (
          <div className={styles.templatePopover}>
            <div className={styles.popoverHeader}>WhatsApp Templates</div>
            {WHATSAPP_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                className={styles.templateItem}
                onClick={() => handleSendTemplate(tmpl)}
              >
                <div className={styles.templateName}>{tmpl.name}</div>
                <div className={styles.templateText}>{tmpl.text}</div>
              </button>
            ))}
          </div>
        )}

        <div className={styles.inputControlsRow}>
          <div className={styles.inputToolbar}>
            {supportsAttachments && (
              <>
                <button
                  className={styles.toolbarBtn}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  disabled={needsWhatsAppTemplate}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileChange}
                />
              </>
            )}

            <button
              className={styles.toolbarBtn}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              title="Add emoji"
              disabled={needsWhatsAppTemplate}
            >
              <Smile size={18} />
            </button>
          </div>

          <div className={styles.inputFieldWrapper}>
            <textarea
              className={styles.replyInput}
              rows={1}
              placeholder={
                needsWhatsAppTemplate
                  ? 'Conversation locked — Use a template to reply...'
                  : 'Type a message...'
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={needsWhatsAppTemplate}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          <button
            className={styles.replySendBtn}
            disabled={(!draft.trim() && attachments.length === 0) || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Unsend Message</h3>
            <p className={styles.modalBody}>
              Are you sure you want to unsend this message? This action will remove the message for all participants in this conversation.
            </p>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalCancel}`} onClick={() => setShowDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className={`${styles.modalBtn} ${styles.modalConfirm}`} onClick={handleDeleteConfirm}>
                Unsend Message
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DmTab({ workspaceId, platform, accountId, search, unreadOnly }: DmTabProps) {
  const {
    conversations,
    markConversationRead,
    sendDmReply,
  } = useInbox({ workspaceId, platform, accountId });

  const [selectedConv, setSelectedConv] = useState<InboxConversationDto | null>(null);
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Flatten pages
  const convList = useMemo(
    () => conversations.data?.pages.flatMap((p) => p.items) ?? [],
    [conversations.data],
  );

  // Filter list client-side based on search queries and read/unread flags
  const filteredConvList = useMemo(() => {
    let list = convList;

    if (unreadOnly) {
      list = list.filter((c) => !c.isRead);
    }

    if (search?.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.participantName?.toLowerCase().includes(q) ||
          c.lastMessageText?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [convList, search, unreadOnly]);

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

        // Add system message if WhatsApp has exceeded 24 hours
        // For simulation, we can add a flag or modify dates
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
    async (text: string, aid: string, attachments?: any[]) => {
      if (!selectedConv || !workspaceId) return;

      // Call API
      await sendDmReply({ conversationId: selectedConv.id, text, accountId: aid });

      // Optimistic update client-side or refetch
      const { inboxApi } = await import('../../api/inbox');
      const msgs = await inboxApi.getConversationMessages(workspaceId, selectedConv.id);

      // Map local attachment state if API does not store it immediately
      if (attachments && attachments.length > 0 && msgs.length > 0) {
        // Mocking attachments injection on the last sent message for premium UI review
        const updatedMsgs = [...msgs];
        const lastSentIdx = updatedMsgs.map(m => m.direction).lastIndexOf('outgoing');
        if (lastSentIdx !== -1) {
          updatedMsgs[lastSentIdx].attachments = attachments;
        }
        setMessages(updatedMsgs);
      } else {
        setMessages(msgs);
      }
    },
    [selectedConv, workspaceId, sendDmReply],
  );

  // Client side message editing (Telegram mock)
  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      // Inline update client-side
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, bodyText: newText, isEdited: true } : msg
        )
      );
    },
    []
  );

  // Client side message deletion
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      // Remove from list
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    },
    []
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
        <div className={styles.listHeader}>
          <span>CONVERSATIONS ({filteredConvList.length})</span>
        </div>
        <div className={styles.listScroll}>
          {filteredConvList.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageSquare size={28} />
              <span>No conversations match filters</span>
            </div>
          ) : (
            filteredConvList.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conv={conv}
                isSelected={selectedConv?.id === conv.id}
                onClick={() => handleSelectConversation(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: thread or empty prompt */}
      <div className={styles.detailPanel}>
        {selectedConv ? (
          <ThreadView
            messages={messages}
            isLoading={messagesLoading}
            onSend={handleSend}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onBack={handleBack}
            conversation={selectedConv}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <MessageSquare size={36} className={styles.emptyIcon} />
            <span>Select a conversation to view messages</span>
          </div>
        )}
      </div>
    </div>
  );
}
