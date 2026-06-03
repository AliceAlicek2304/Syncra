import { useState, useRef, useEffect } from 'react';
import {
  Smile, Send, MessageSquare,
  Edit, Trash2, Archive, X, AlertCircle,
  Paperclip, ExternalLink,
  ChevronDown, Check, Loader2
} from 'lucide-react';
import styles from './MessagesPage.module.css';
import { useWorkspace } from '../../context/WorkspaceContext';
import { socialAccountsApi, type SocialAccountDto } from '../../api/socialAccounts';
import {
  inboxApi,
  type InboxConversationDto,
  type InboxMessageDto,
  type InboxConversationDetailsDto
} from '../../api/inbox';
import { mediaApi } from '../../api/media';
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons';

// ── Helpers & Components ───────────────────────────────────────────────────

const HANOI_TZ = 'Asia/Ho_Chi_Minh';

const getInitials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length > 0 ? parts[0].charAt(0).toUpperCase() : '?';
};



const getHanoiDateKey = (utcStr?: string) => {
  if (!utcStr) return '';
  return new Date(utcStr).toLocaleDateString('en-CA', { timeZone: HANOI_TZ });
};

const getHanoiDateLabel = (utcStr?: string) => {
  if (!utcStr) return '';
  const key = getHanoiDateKey(utcStr);
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: HANOI_TZ });
  if (key === todayKey) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toLocaleDateString('en-CA', { timeZone: HANOI_TZ });
  if (key === yesterdayKey) return 'Yesterday';
  return new Date(utcStr).toLocaleDateString([], { timeZone: HANOI_TZ, month: 'short', day: 'numeric', year: 'numeric' });
};

const formatHanoiTime = (utcStr?: string) => {
  if (!utcStr) return '';
  return new Date(utcStr).toLocaleTimeString('en-GB', { timeZone: HANOI_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
};

const getShortTimeDiff = (dateStr?: string) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

const DoubleCheck = ({ size = 12, className }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M17 5L9.5 12.5L6 9" />
    <path d="M22 5L14.5 12.5" />
  </svg>
);

const renderPlatformBadge = (platform: string) => (
  <span className={styles.platformBadge}>
    <ExtendedPlatformIcon platform={platform} size={17} />
  </span>
);

const statusIcons: Record<string, { icon: React.ReactNode; cls: string }> = {
  sending: { icon: <Loader2 size={12} />, cls: styles.statusIconSending },
  sent: { icon: <Check size={12} />, cls: styles.statusIconSent },
  delivered: { icon: <DoubleCheck size={12} />, cls: styles.statusIconDelivered },
  read: { icon: <DoubleCheck size={12} />, cls: styles.statusIconRead },
  failed: { icon: <X size={12} />, cls: styles.statusIconFailed },
};

const MessageStatusIcon = ({ status }: { status?: string }) => {
  if (!status) return <DoubleCheck size={12} className={styles.statusIcon} />;
  const entry = statusIcons[status] ?? statusIcons.sent;
  return <span className={`${styles.statusIcon} ${entry.cls}`}>{entry.icon}</span>;
};

interface FilterOption { value: string; label: string }

function FilterDropdown({
  value, onChange, options, label
}: {
  value: string; onChange: (v: string) => void; options: FilterOption[]; label: string
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value) ?? options[0];

  return (
    <div className={styles.filterDropdownWrapper} ref={ref}>
      <button
        className={`${styles.filterDropdownTrigger} ${open ? styles.filterDropdownTriggerOpen : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.filterDropdownTriggerLabel}>{selected?.label ?? label}</span>
        <ChevronDown size={14} className={`${styles.filterDropdownChevron} ${open ? styles.filterDropdownChevronOpen : ''}`} />
      </button>
      {open && (
        <div className={styles.filterDropdownMenu}>
          {options.map(opt => (
            <button
              key={opt.value}
              className={`${styles.filterDropdownItem} ${opt.value === value ? styles.filterDropdownItemActive : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.value === value && <Check size={14} className={styles.filterDropdownCheck} />}
              <span style={{ marginLeft: opt.value === value ? 0 : 22 }}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function MessagesPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  // ── States ────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<InboxConversationDto[]>([]);
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<InboxConversationDetailsDto | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Search & Filter
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterProfile, setFilterProfile] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Input & Messaging
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Editing & Reactions
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showReactionPickerId, setShowReactionPickerId] = useState<string | null>(null);

  // Typing state
  const lastTypingSentRef = useRef<number>(0);

  // New Chat Modal
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatRecipient, setNewChatRecipient] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatAccount, setNewChatAccount] = useState('');
  const [newChatIsUsername, setNewChatIsUsername] = useState(true);

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = conversations.find(c => c.id === selectedId);
  const activeSocialAccount = socialAccounts.find(sa => sa.id === activeChat?.socialAccountId);
  const activeZernioAccountId = activeSocialAccount?.externalAccountId || '';

  // ── Load Social Accounts & Conversations ────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const accounts = await socialAccountsApi.listSocialAccounts(workspaceId);
        setSocialAccounts(accounts);

        const convs = await inboxApi.getConversations(workspaceId);
        setConversations(convs);
        if (convs.length > 0) {
          setSelectedId(convs[0].id);
        }
      } catch (err) {
        console.error('Failed to load inbox data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [workspaceId]);

  // ── Load Conversation Details & Messages on Select ──────────────────────
  useEffect(() => {
    if (!workspaceId || !selectedId) {
      setMessages([]);
      setConversationDetails(null);
      return;
    }

    const fetchConvoData = async () => {
      setIsLoadingMessages(true);
      try {
        const msgList = await inboxApi.getMessages(workspaceId, selectedId);
        setMessages(msgList);

        // Mark as read locally and API
        await inboxApi.markAsRead(workspaceId, selectedId);
        setConversations(prev =>
          prev.map(c => (c.id === selectedId ? { ...c, isRead: true, unreadCount: 0 } : c))
        );

        // Fetch meta details via wrapper
        const currentConvo = conversations.find(c => c.id === selectedId);
        const currentSa = socialAccounts.find(sa => sa.id === currentConvo?.socialAccountId);
        if (currentSa?.externalAccountId) {
          const details = await inboxApi.getConversationDetails(
            workspaceId,
            selectedId,
            currentSa.externalAccountId
          );
          setConversationDetails(details);
        }
      } catch (err) {
        console.error('Error fetching conversation messages/details', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchConvoData();
  }, [workspaceId, selectedId]);

  // ── Polling for updates every 8 seconds ─────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;

    const interval = setInterval(async () => {
      try {
        const convs = await inboxApi.getConversations(workspaceId);
        setConversations(convs);

        if (selectedId) {
          const currentSa = socialAccounts.find(sa => sa.id === convs.find(c => c.id === selectedId)?.socialAccountId);
          const msgList = await inboxApi.getMessages(workspaceId, selectedId);
          setMessages(msgList);

          if (currentSa?.externalAccountId) {
            const details = await inboxApi.getConversationDetails(
              workspaceId,
              selectedId,
              currentSa.externalAccountId
            );
            setConversationDetails(details);
          }
        }
      } catch (err) {
        console.error('Error polling inbox updates', err);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [workspaceId, selectedId, socialAccounts]);

  // Scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Input & Typing Actions ──────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Typing indicator throttling (send at most every 5 seconds)
    if (workspaceId && selectedId && activeZernioAccountId) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > 5000) {
        lastTypingSentRef.current = now;
        inboxApi.sendTypingIndicator(workspaceId, selectedId, activeZernioAccountId)
          .catch(err => console.warn('Failed to send typing indicator', err));
      }
    }
  };

  const handleSend = async () => {
    if (!workspaceId || !selectedId || !activeZernioAccountId) return;
    if (!inputText.trim() && !pendingFile) return;

    try {
      let attachmentPublicUrl = '';
      let attachmentMimeType: string | undefined;

      if (pendingFile) {
        setIsUploading(true);
        const result = await mediaApi.uploadMedia(workspaceId, pendingFile);
        attachmentPublicUrl = result.publicUrl;
        attachmentMimeType = result.mimeType;
        setIsUploading(false);
      }

      const payload: any = {
        accountId: activeZernioAccountId,
      };

      if (inputText.trim()) {
        payload.text = inputText.trim();
      }

      if (attachmentPublicUrl) {
        payload.attachmentUrl = attachmentPublicUrl;
        const type = attachmentMimeType?.startsWith('image/') ? 'image'
          : attachmentMimeType?.startsWith('video/') ? 'video'
          : attachmentMimeType?.startsWith('audio/') ? 'audio'
          : 'file';
        payload.attachmentType = type;
      }

      await inboxApi.sendMessage(workspaceId, selectedId, payload);
      setInputText('');
      setPendingFile(null);
      setPreviewUrl('');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Re-fetch messages immediately
      const refreshedMsgs = await inboxApi.getMessages(workspaceId, selectedId);
      setMessages(refreshedMsgs);

      // Re-fetch conversations to update last message
      const refreshedConvs = await inboxApi.getConversations(workspaceId);
      setConversations(refreshedConvs);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };



  // ── Conversation status toggle (Archive/Unarchive) ──────────────────────
  const handleToggleArchive = async () => {
    if (!workspaceId || !selectedId || !activeZernioAccountId || !conversationDetails) return;

    const nextStatus = conversationDetails.status === 'archived' ? 'active' : 'archived';
    try {
      await inboxApi.updateConversationStatus(workspaceId, selectedId, {
        accountId: activeZernioAccountId,
        status: nextStatus
      });

      // Update local details state
      setConversationDetails(prev => prev ? { ...prev, status: nextStatus } : null);

      // Refresh list
      const refreshedConvs = await inboxApi.getConversations(workspaceId);
      setConversations(refreshedConvs);
    } catch (err) {
      console.error('Failed to toggle conversation status', err);
    }
  };

  // ── Message Editing ─────────────────────────────────────────────────────
  const startEdit = (msgId: string, currentText: string) => {
    setEditingMessageId(msgId);
    setEditingText(currentText);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!workspaceId || !selectedId || !activeZernioAccountId || !editingText.trim()) return;

    try {
      await inboxApi.editMessage(workspaceId, selectedId, messageId, {
        accountId: activeZernioAccountId,
        text: editingText.trim()
      });

      setEditingMessageId(null);
      setEditingText('');

      // Refresh messages
      const refreshed = await inboxApi.getMessages(workspaceId, selectedId);
      setMessages(refreshed);
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };

  // ── Message Deletion ────────────────────────────────────────────────────
  const handleDeleteMessage = async (messageId: string) => {
    if (!workspaceId || !selectedId || !activeZernioAccountId) return;
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await inboxApi.deleteMessage(workspaceId, selectedId, messageId, activeZernioAccountId);

      // Refresh messages
      const refreshed = await inboxApi.getMessages(workspaceId, selectedId);
      setMessages(refreshed);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  // ── Emoji Reactions ─────────────────────────────────────────────────────
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!workspaceId || !selectedId || !activeZernioAccountId) return;

    try {
      await inboxApi.addReaction(workspaceId, selectedId, messageId, {
        accountId: activeZernioAccountId,
        emoji
      });
      setShowReactionPickerId(null);

      // Refresh messages
      const refreshed = await inboxApi.getMessages(workspaceId, selectedId);
      setMessages(refreshed);
    } catch (err) {
      console.error('Failed to add reaction', err);
    }
  };

  // ── Create Conversation (New Chat) ──────────────────────────────────────
  const handleCreateConvo = async () => {
    if (!workspaceId || !newChatAccount || !newChatRecipient || !newChatMessage.trim()) return;

    try {
      const selectedSa = socialAccounts.find(sa => sa.id === newChatAccount);
      if (!selectedSa) return;

      const payload: any = {
        accountId: selectedSa.externalAccountId,
        message: newChatMessage.trim()
      };

      if (newChatIsUsername) {
        payload.participantUsername = newChatRecipient.trim();
      } else {
        payload.participantId = newChatRecipient.trim();
      }

      const result = await inboxApi.createConversation(workspaceId, payload);
      
      // Reset Modal
      setIsNewChatOpen(false);
      setNewChatRecipient('');
      setNewChatMessage('');

      // Refresh conversations list and select new convo
      const refreshed = await inboxApi.getConversations(workspaceId);
      setConversations(refreshed);
      
      // Locate the created conversation in local DB by returned platform ID
      const matchingConvo = refreshed.find(c => c.zernioConversationId === result.conversationId);
      if (matchingConvo) {
        setSelectedId(matchingConvo.id);
      }
    } catch (err) {
      console.error('Failed to initiate conversation', err);
    }
  };

  // ── Filters & Rendering Lists ───────────────────────────────────────────
  const platformOptions: FilterOption[] = [
    { value: 'all', label: 'All platforms' },
    ...Array.from(new Set(conversations.map(c => c.platform))).map(p => ({ value: p, label: p })),
  ];

  const uniqueProfilePlatforms = Array.from(new Set(socialAccounts.map(sa => sa.platform)));
  const profileOptions: FilterOption[] = [
    { value: 'all', label: 'All profiles' },
    ...uniqueProfilePlatforms.map(p => ({ value: p, label: p })),
  ];

  const accountOptions: FilterOption[] = [
    { value: 'all', label: 'All accounts' },
    ...socialAccounts.map(sa => ({ value: sa.id, label: sa.displayName || sa.handle || sa.platform })),
  ];

  const filteredConversations = conversations.filter(c => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterProfile !== 'all' && c.platform !== filterProfile) return false;
    if (filterAccount !== 'all' && c.socialAccountId !== filterAccount) return false;
    return true;
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (!a.lastMessageAtUtc || !b.lastMessageAtUtc) return 0;
    const timeA = new Date(a.lastMessageAtUtc).getTime();
    const timeB = new Date(b.lastMessageAtUtc).getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className={styles.container}>
      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Left Column: Sidebar List */}
        <section className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitleRow}>
              <h2>Messages</h2>
              <button
                className={styles.newChatBtn}
                onClick={() => {
                  if (socialAccounts.length > 0) {
                    setNewChatAccount(socialAccounts[0].id);
                  }
                  setIsNewChatOpen(true);
                }}
                title="New Chat"
              >
                <Edit size={18} />
              </button>
            </div>
            <div className={styles.filterRow}>
              <FilterDropdown
                value={filterPlatform}
                onChange={setFilterPlatform}
                options={platformOptions}
                label="All platforms"
              />
              <FilterDropdown
                value={filterProfile}
                onChange={setFilterProfile}
                options={profileOptions}
                label="All profiles"
              />
              <FilterDropdown
                value={filterAccount}
                onChange={setFilterAccount}
                options={accountOptions}
                label="All accounts"
              />
            </div>
          </div>

          <div className={styles.subHeader}>
            <span className={styles.subHeaderTitle}>Conversations</span>
            <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className={styles.conversationsList}>
            {isLoading ? (
              <div className={styles.emptyState}>Loading conversations...</div>
            ) : sortedConversations.length === 0 ? (
              <div className={styles.emptyState}>No conversations found</div>
            ) : (
              sortedConversations.map(c => {
                const socialAccount = socialAccounts.find(sa => sa.id === c.socialAccountId);
                const accountHandle = socialAccount?.handle || socialAccount?.displayName || '';

                return (
                  <div
                    key={c.id}
                    className={`${styles.conversationItem} ${c.id === selectedId ? styles.active : ''} ${!c.isRead && c.unreadCount > 0 ? styles.unread : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className={styles.avatarWrapper}>
                      {c.participantAvatarUrl ? (
                        <img src={c.participantAvatarUrl} alt={c.participantName} className={styles.avatar} />
                      ) : (
                        <div className={`${styles.avatar} ${styles.avatarFallback}`}>
                          {getInitials(c.participantName)}
                        </div>
                      )}
                      {renderPlatformBadge(c.platform)}
                    </div>
                    <div className={styles.convoMeta}>
                      <div className={styles.convoTop}>
                        <span className={styles.convoName}>
                          {c.participantName || 'Contact'}
                          {accountHandle && (
                            <span className={styles.viaHandle}> · via @{accountHandle}</span>
                          )}
                        </span>
                        <span className={styles.convoTime}>
                          {c.lastMessageAtUtc ? getShortTimeDiff(c.lastMessageAtUtc) : ''}
                        </span>
                      </div>
                      <div className={styles.convoBottom}>
                        <div className={styles.convoBottomRow}>
                          <p className={styles.convoText}>{c.lastMessageText || 'No messages'}</p>
                        </div>
                        {!c.isRead && c.unreadCount > 0 && <span className={styles.unreadDot}></span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Chat Window */}
        <section className={styles.chatWindow}>
          {isLoadingMessages ? (
            <div className={styles.noChatSelected}>
              <MessageSquare size={48} />
              <p>Loading messages...</p>
            </div>
          ) : activeChat ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div className={styles.headerUser}>
                  <div className={styles.avatarWrapper}>
                    {activeChat.participantAvatarUrl ? (
                      <img src={activeChat.participantAvatarUrl} alt={activeChat.participantName} className={styles.avatar} />
                    ) : (
                      <div className={`${styles.avatar} ${styles.avatarFallback}`}>
                        {getInitials(activeChat.participantName)}
                      </div>
                    )}
                    {renderPlatformBadge(activeChat.platform)}
                  </div>
                  <div>
                    <h3>{activeChat.participantName || 'Contact'}</h3>
                    <div className={styles.headerMetaRow}>
                      <span className={styles.headerPlatformText}>
                        Replying as @{activeSocialAccount?.handle || activeSocialAccount?.displayName || 'Unknown'}
                      </span>
                      <span className={styles.headerActiveDot}>•</span>
                      <span className={styles.headerActiveText}>
                        Active {activeChat.lastMessageAtUtc ? getShortTimeDiff(activeChat.lastMessageAtUtc) : '4m'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  {conversationDetails && (
                    <button
                      onClick={handleToggleArchive}
                      title={conversationDetails.status === 'archived' ? 'Unarchive Convo' : 'Archive Convo'}
                      style={{ color: conversationDetails.status === 'archived' ? 'var(--clr-primary)' : 'inherit' }}
                    >
                      <Archive size={18} />
                    </button>
                  )}
                  <button title="Open in External Link" onClick={() => {}}><ExternalLink size={18} /></button>
                </div>
              </div>

              {/* Messages List */}
              <div className={styles.messagesContainer}>
                {messages.length === 0 ? (
                  <div className={styles.emptyState}>No messages yet. Send a message to start!</div>
                ) : (
                  (() => {
                    const sorted = [...messages].sort((a, b) =>
                      new Date(a.sentAtUtc).getTime() - new Date(b.sentAtUtc).getTime()
                    );
                    let lastDateKey = '';
                    let lastMsgTime = 0;
                    return sorted.map((m) => {
                      const isMe = m.direction === 'Outbound';
                      const timeStr = formatHanoiTime(m.sentAtUtc);
                      const sentMs = new Date(m.sentAtUtc).getTime();
                      const currentDateKey = getHanoiDateKey(m.sentAtUtc);
                      const currentDateLabel = getHanoiDateLabel(m.sentAtUtc);

                      const showDateSep = currentDateKey && currentDateKey !== lastDateKey;
                      if (showDateSep) { lastDateKey = currentDateKey; }

                      const gapMs = sentMs - lastMsgTime;
                      const showTimeSep = !showDateSep && lastMsgTime > 0 && gapMs >= 30 * 60 * 1000;
                      if (!showDateSep) { lastMsgTime = sentMs; }
                      else { lastMsgTime = sentMs; }

                      return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          {showDateSep && (
                            <div className={styles.dateSeparator}>
                              <span>{currentDateLabel}</span>
                            </div>
                          )}
                          {showTimeSep && (
                            <div className={styles.timeSeparator}>
                              <span>{formatHanoiTime(m.sentAtUtc)}</span>
                            </div>
                          )}
                          <div className={`${styles.messageWrapper} ${isMe ? styles.myMessage : styles.userMessage}`}>
                            <div className={styles.messageContent}>
                              <div className={styles.messageBubbleContainer}>
                                
                                {editingMessageId === m.id ? (
                                  <div className={styles.editMessageForm}>
                                    <input
                                      type="text"
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      autoFocus
                                    />
                                    <button className={styles.editBtnSave} onClick={() => handleSaveEdit(m.zernioMessageId)}>Save</button>
                                    <button className={styles.editBtnCancel} onClick={() => setEditingMessageId(null)}>Cancel</button>
                                  </div>
                                ) : (
                                  <div className={styles.bubble}>
                                    <p>{m.bodyText}</p>
                                  </div>
                                )}

                                {/* Message actions menu on hover */}
                                {!editingMessageId && (
                                  <div className={styles.messageActions}>
                                    {/* Emoji reaction popover button */}
                                    <button
                                      className={styles.actionBtn}
                                      onClick={() => setShowReactionPickerId(showReactionPickerId === m.id ? null : m.id)}
                                      title="Add reaction"
                                    >
                                      <Smile size={14} />
                                    </button>
                                    {isMe && activeChat.platform === 'telegram' && (
                                      <button
                                        className={styles.actionBtn}
                                        onClick={() => startEdit(m.id, m.bodyText || '')}
                                        title="Edit message"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    )}
                                    <button
                                      className={styles.actionBtn}
                                      onClick={() => handleDeleteMessage(m.zernioMessageId)}
                                      title="Delete message"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}

                                {/* Emoji Reaction Selector overlay */}
                                {showReactionPickerId === m.id && (
                                  <div className={styles.emojiPopover}>
                                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                      <button
                                        key={emoji}
                                        className={styles.emojiBtn}
                                        onClick={() => handleAddReaction(m.zernioMessageId, emoji)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className={styles.msgMeta}>
                                <span className={styles.msgTime}>{timeStr}</span>
                                {isMe && (
                                  <MessageStatusIcon status={m.deliveryStatus} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Input Area */}
              <div className={styles.inputArea}>
                {pendingFile && (
                  <div className={styles.mediaChip}>
                    {previewUrl ? (
                      <img src={previewUrl} alt="" className={styles.mediaChipThumb} />
                    ) : (
                      <Paperclip size={16} />
                    )}
                    <span className={styles.mediaChipName}>{pendingFile.name}</span>
                    {isUploading && <Loader2 size={14} className={styles.statusIconSending} />}
                    <button
                      className={styles.mediaChipRemove}
                      onClick={() => { setPendingFile(null); setPreviewUrl(''); }}
                      disabled={isUploading}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className={styles.inputContainer}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Type a message..."
                    rows={1}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                  />

                  <div className={styles.inputActions}>
                    <button
                      className={styles.attachmentBtn}
                      onClick={() => {
                        const input = document.getElementById('msg-file-input') as HTMLInputElement;
                        input?.click();
                      }}
                      title="Attach file"
                      disabled={isUploading}
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      className={styles.sendIconBtn}
                      onClick={handleSend}
                      title="Send Message"
                      disabled={isUploading || (!inputText.trim() && !pendingFile)}
                    >
                      {isUploading ? <Loader2 size={16} /> : <Send size={16} />}
                    </button>
                  </div>
                </div>

                <input
                  id="msg-file-input"
                  type="file"
                  className={styles.fileInputHidden}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingFile(file);
                      if (file.type.startsWith('image/')) {
                        setPreviewUrl(URL.createObjectURL(file));
                      } else {
                        setPreviewUrl('');
                      }
                    }
                    e.target.value = '';
                  }}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <MessageSquare size={48} />
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </section>
      </div>

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Start a New DM Conversation</h3>
              <button className={styles.closeBtn} onClick={() => setIsNewChatOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Select Connected Social Account</label>
                <select
                  value={newChatAccount}
                  onChange={(e) => setNewChatAccount(e.target.value)}
                >
                  {socialAccounts.map(sa => (
                    <option key={sa.id} value={sa.id}>
                      {sa.platform.toUpperCase()} - {sa.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Recipient Detail</label>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                    <label style={{ display: 'flex', gap: '4px', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="recipientType"
                        checked={newChatIsUsername}
                        onChange={() => setNewChatIsUsername(true)}
                      />
                      Username
                    </label>
                    <label style={{ display: 'flex', gap: '4px', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="recipientType"
                        checked={!newChatIsUsername}
                        onChange={() => setNewChatIsUsername(false)}
                      />
                      Numeric ID
                    </label>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder={newChatIsUsername ? "e.g., elonmusk" : "e.g., 44196397"}
                  value={newChatRecipient}
                  onChange={(e) => setNewChatRecipient(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Initial Message</label>
                <textarea
                  placeholder="Type your initial message..."
                  rows={3}
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', background: 'rgba(255, 79, 0, 0.08)', padding: '10px', borderRadius: '8px', fontSize: '11.5px', color: 'var(--clr-primary)' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Note: Creating new conversations is currently only supported for Twitter/X. Recipient must accept DMs from you.</span>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setIsNewChatOpen(false)}>Cancel</button>
              <button className={styles.btnSubmit} onClick={handleCreateConvo}>Send Message</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
