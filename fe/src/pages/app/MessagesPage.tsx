import { useState, useRef, useEffect } from 'react';
import {
  Smile, Send, MessageSquare,
  Edit, Trash2, Archive, X, AlertCircle,
  Paperclip, ExternalLink,
  ChevronDown, Check, Loader2
} from 'lucide-react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import styles from './MessagesPage.module.css';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
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

// Zernio chỉ hỗ trợ 4 image + 1 video format cho DM attachment.
// Text gốc từ Zernio dashboard: "Only JPEG, PNG, GIF images and MP4 videos are supported".
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4'
]);
const ATTACHMENT_ERROR_MESSAGE = 'Only JPEG, PNG, GIF images and MP4 videos are supported';

// Reaction (thả cảm xúc) chỉ hỗ trợ trên Telegram và WhatsApp qua Zernio API.
// Các platform khác (Facebook, Instagram, Twitter/X, Bluesky, Reddit...) ẩn nút reaction.
const REACTION_SUPPORTED_PLATFORMS = new Set(['telegram', 'whatsapp']);
const REACTION_ERROR_MESSAGE = 'Không thể thả cảm xúc lúc này hoặc nền tảng không hỗ trợ';

// Telegram chỉ support một subset emoji làm reaction (Zernio sẽ reject ngoài tập này).
// WhatsApp nhận mọi emoji chuẩn nhưng giới hạn 1 reaction/msg/user — sẽ Remove trước khi Add.
const TELEGRAM_REACTION_EMOJI = ['👍', '❤️', '🔥', '🎉', '😂', '😮'];
const WHATSAPP_REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

// Delete message — hỗ trợ không đồng đều giữa các nền tảng.
// - Facebook / Instagram / WhatsApp: Zernio API KHÔNG hỗ trợ delete → ẩn nút luôn.
// - Twitter (X): chỉ xóa được DM outgoing → chỉ hiện nút với isMe (direction === 'Outbound').
// - Bluesky / Reddit: chỉ xóa một chiều (ẩn khỏi màn hình người gửi, người nhận vẫn thấy)
//   → cần confirmation modal cảnh báo trước khi gọi API.
// - Telegram: thu hồi hoàn toàn cả 2 phía → gọi API thẳng, không cần cảnh báo.
const DELETE_DISABLED_PLATFORMS = new Set(['facebook', 'instagram', 'whatsapp']);
const DELETE_ONE_WAY_PLATFORMS = new Set(['bluesky', 'reddit']);
const DELETE_ERROR_MESSAGE = 'Không thể xóa tin nhắn lúc này';

// Zernio hỗ trợ inbox/DM (Messages) trên các platform sau. Các platform khác
// (LinkedIn, YouTube, Pinterest, TikTok, Snapchat, GoogleBusiness...) Zernio
// API không expose DM endpoint → KHÔNG hiển thị trong filter của trang Messages.
const MESSAGES_SUPPORTED_PLATFORMS = new Set([
  'facebook',
  'instagram',
  'twitter',
  'threads',
  'bluesky',
  'reddit',
  'telegram',
  'whatsapp'
]);

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  threads: 'Threads',
  bluesky: 'Bluesky',
  reddit: 'Reddit',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp'
};

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

interface FilterOption { value: string; label: string; iconPlatform?: string }

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
  const renderOptionLabel = (option?: FilterOption) => {
    if (!option) return label;
    return (
      <span className={styles.filterDropdownLabelContent}>
        {option.iconPlatform && (
          <span className={styles.filterDropdownLabelIcon}>
            <ExtendedPlatformIcon platform={option.iconPlatform} size={14} />
          </span>
        )}
        <span className={styles.filterDropdownLabelText}>{option.label}</span>
      </span>
    );
  };

  return (
    <div className={styles.filterDropdownWrapper} ref={ref}>
      <button
        className={`${styles.filterDropdownTrigger} ${open ? styles.filterDropdownTriggerOpen : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.filterDropdownTriggerLabel}>{renderOptionLabel(selected)}</span>
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
              <span className={styles.filterDropdownCheckSlot}>
                {opt.value === value ? <Check size={14} className={styles.filterDropdownCheck} /> : null}
              </span>
              {renderOptionLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function MessagesPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { error: showError } = useToast();
  const [filterWorkspaceId, setFilterWorkspaceId] = useState<string>(activeWorkspace?.id || 'all');

  useEffect(() => {
    if (activeWorkspace?.id) {
      setFilterWorkspaceId(activeWorkspace.id);
    }
  }, [activeWorkspace?.id]);

  // ── States ────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<(InboxConversationDto & { workspaceId?: string })[]>([]);
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<InboxConversationDetailsDto | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<(SocialAccountDto & { workspaceId?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [isCreatingConvo, setIsCreatingConvo] = useState(false);

  // Search & Filter
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Input & Messaging
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Editing & Reactions
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showReactionPickerId, setShowReactionPickerId] = useState<string | null>(null);

  // Typing state


  // New Chat Modal
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatRecipient, setNewChatRecipient] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatAccount, setNewChatAccount] = useState('');
  const [newChatIsUsername, setNewChatIsUsername] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{ messageId: string; oneWay: boolean } | null>(null);

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeChat = conversations.find(c => c.id === selectedId);
  const activeChatWorkspaceId = activeChat?.workspaceId || activeWorkspace?.id;
  const activeSocialAccount = socialAccounts.find(sa => sa.id === activeChat?.socialAccountId);
  const activeZernioAccountId = activeSocialAccount?.externalAccountId || '';
  const isReactionSupported = activeChat
    ? REACTION_SUPPORTED_PLATFORMS.has(activeChat.platform.toLowerCase())
    : false;
  const reactionEmojiSet = activeChat?.platform.toLowerCase() === 'telegram'
    ? TELEGRAM_REACTION_EMOJI
    : WHATSAPP_REACTION_EMOJI;

  // ── Load Social Accounts & Conversations ────────────────────────────────
  useEffect(() => {
    if (workspaces.length === 0) return;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (filterWorkspaceId === 'all') {
          const accountsPromises = workspaces.map(async w => {
            const list = await socialAccountsApi.listSocialAccounts(w.id);
            return list.map(sa => ({ ...sa, workspaceId: w.id }));
          });
          const convsPromises = workspaces.map(async w => {
            const list = await inboxApi.getConversations(w.id);
            return list.map(c => ({ ...c, workspaceId: w.id }));
          });

          const [accountsLists, convsLists] = await Promise.all([
            Promise.all(accountsPromises),
            Promise.all(convsPromises)
          ]);

          const mergedAccounts = accountsLists.flat();
          const mergedConvs = convsLists.flat();

          setSocialAccounts(mergedAccounts);
          setConversations(mergedConvs);
          if (mergedConvs.length > 0) {
            setSelectedId(mergedConvs[0].id);
          }
        } else {
          const accounts = await socialAccountsApi.listSocialAccounts(filterWorkspaceId);
          setSocialAccounts(accounts.map(sa => ({ ...sa, workspaceId: filterWorkspaceId })));

          const convs = await inboxApi.getConversations(filterWorkspaceId);
          setConversations(convs.map(c => ({ ...c, workspaceId: filterWorkspaceId })));
          if (convs.length > 0) {
            setSelectedId(convs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load inbox data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [filterWorkspaceId, workspaces]);

  // ── Load Conversation Details & Messages on Select ──────────────────────
  useEffect(() => {
    const currentConvo = conversations.find(c => c.id === selectedId);
    if (!currentConvo || !selectedId) {
      setMessages([]);
      setConversationDetails(null);
      return;
    }

    const convoWorkspaceId = currentConvo.workspaceId || activeWorkspace?.id;
    if (!convoWorkspaceId) return;

    const fetchConvoData = async () => {
      setIsLoadingMessages(true);
      try {
        const msgList = await inboxApi.getMessages(convoWorkspaceId, selectedId);
        setMessages(msgList);

        // Mark as read locally and API ONLY if not already read
        if (currentConvo && (!currentConvo.isRead || currentConvo.unreadCount > 0)) {
          await inboxApi.markAsRead(convoWorkspaceId, selectedId);
          setConversations(prev =>
            prev.map(c => (c.id === selectedId ? { ...c, isRead: true, unreadCount: 0 } : c))
          );
        }

        // Fetch meta details via wrapper
        const currentSa = socialAccounts.find(sa => sa.id === currentConvo?.socialAccountId);
        if (currentSa?.externalAccountId) {
          const details = await inboxApi.getConversationDetails(
            convoWorkspaceId,
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
  }, [selectedId, conversations, socialAccounts, activeWorkspace]);

  // ── SignalR real-time updates & Fallback Polling ────────────────────────
  useEffect(() => {
    const convoWorkspaceId = activeChat?.workspaceId || activeWorkspace?.id;
    if (!convoWorkspaceId) return;

    // 1. Fallback Polling every 10 seconds (in case SignalR is not connected)
    const interval = setInterval(async () => {
      try {
        let convs: (InboxConversationDto & { workspaceId?: string })[] = [];
        if (filterWorkspaceId === 'all') {
          const lists = await Promise.all(workspaces.map(async w => {
            const list = await inboxApi.getConversations(w.id);
            return list.map(c => ({ ...c, workspaceId: w.id }));
          }));
          convs = lists.flat();
        } else {
          const list = await inboxApi.getConversations(filterWorkspaceId);
          convs = list.map(c => ({ ...c, workspaceId: filterWorkspaceId }));
        }
        setConversations(convs);

        if (selectedId) {
          const selectedConvo = convs.find(c => c.id === selectedId);
          const targetWsId = selectedConvo?.workspaceId || convoWorkspaceId;
          const currentSa = socialAccounts.find(sa => sa.id === selectedConvo?.socialAccountId);
          const msgList = await inboxApi.getMessages(targetWsId, selectedId);
          setMessages(msgList);

          if (currentSa?.externalAccountId) {
            const details = await inboxApi.getConversationDetails(
              targetWsId,
              selectedId,
              currentSa.externalAccountId
            );
            setConversationDetails(details);
          }
        }
      } catch (err) {
        console.error('Failed to poll updates', err);
      }
    }, 10000);

    // 2. Real-time updates via SignalR NotificationHub
    const token = localStorage.getItem('syncra_access_token');
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const defaultBaseUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}api/v1`;
    const apiBaseUrl = (configuredBaseUrl || defaultBaseUrl).replace(/\/+$/, '');
    const hubUrl = `${apiBaseUrl}/hubs/notifications?workspaceId=${convoWorkspaceId}`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .build();

    const handleInboxItemCreated = async (_payload: any) => {
      try {
        let convs: (InboxConversationDto & { workspaceId?: string })[] = [];
        if (filterWorkspaceId === 'all') {
          const lists = await Promise.all(workspaces.map(async w => {
            const list = await inboxApi.getConversations(w.id);
            return list.map(c => ({ ...c, workspaceId: w.id }));
          }));
          convs = lists.flat();
        } else {
          const list = await inboxApi.getConversations(filterWorkspaceId);
          convs = list.map(c => ({ ...c, workspaceId: filterWorkspaceId }));
        }
        setConversations(convs);

        if (selectedId) {
          const selectedConvo = convs.find(c => c.id === selectedId);
          const targetWsId = selectedConvo?.workspaceId || convoWorkspaceId;
          const currentSa = socialAccounts.find(sa => sa.id === selectedConvo?.socialAccountId);
          const msgList = await inboxApi.getMessages(targetWsId, selectedId);
          setMessages(msgList);

          if (currentSa?.externalAccountId) {
            const details = await inboxApi.getConversationDetails(
              targetWsId,
              selectedId,
              currentSa.externalAccountId
            );
            setConversationDetails(details);
          }
        }
      } catch (err) {
        console.error('Failed to update inbox on SignalR event', err);
      }
    };

    connection.on('inbox.itemCreated', handleInboxItemCreated);

    connection.start().catch((err) => {
      console.warn('SignalR connection failed, falling back to polling', err);
    });

    return () => {
      clearInterval(interval);
      connection.off('inbox.itemCreated', handleInboxItemCreated);
      void connection.stop();
    };
  }, [filterWorkspaceId, workspaces, selectedId, socialAccounts, activeChat, activeWorkspace]);

  const handleSend = async () => {
    if (!activeChatWorkspaceId || !selectedId || !activeZernioAccountId) return;
    if (!inputText.trim() && !pendingFile) return;

    setIsSending(true);
    try {
      let attachmentPublicUrl = '';
      let attachmentMimeType: string | undefined;

      if (pendingFile) {
        setIsUploading(true);
        try {
          const result = await mediaApi.uploadMedia(activeChatWorkspaceId, pendingFile);
          attachmentPublicUrl = result.publicUrl;
          attachmentMimeType = result.mimeType;
        } finally {
          setIsUploading(false);
        }
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

      await inboxApi.sendMessage(activeChatWorkspaceId, selectedId, payload);
      setInputText('');
      setPendingFile(null);
      setPreviewUrl('');
      setAttachmentError(null);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const refreshedMsgs = await inboxApi.getMessages(activeChatWorkspaceId, selectedId);
      setMessages(refreshedMsgs);

      // Refresh conversations: if filterWorkspaceId is 'all', refresh all; else refresh the active chat workspace
      let refreshedConvs: (InboxConversationDto & { workspaceId?: string })[] = [];
      if (filterWorkspaceId === 'all') {
        const lists = await Promise.all(workspaces.map(async w => {
          const list = await inboxApi.getConversations(w.id);
          return list.map(c => ({ ...c, workspaceId: w.id }));
        }));
        refreshedConvs = lists.flat();
      } else {
        const list = await inboxApi.getConversations(activeChatWorkspaceId);
        refreshedConvs = list.map(c => ({ ...c, workspaceId: activeChatWorkspaceId }));
      }
      setConversations(refreshedConvs);
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errMsg: string = err.response?.data?.message || err.message || 'Unknown error';
      if (/content type not allowed/i.test(errMsg) || /zernio_upload_direct/i.test(errMsg)) {
        setPendingFile(null);
        setPreviewUrl('');
        setAttachmentError(ATTACHMENT_ERROR_MESSAGE);
      } else {
        alert(`Failed to send message: ${errMsg}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (attachmentError) setAttachmentError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
    if (!activeChatWorkspaceId || !selectedId || !activeZernioAccountId || !conversationDetails) return;

    const nextStatus = conversationDetails.status === 'archived' ? 'active' : 'archived';
    setIsArchiving(true);
    try {
      await inboxApi.updateConversationStatus(activeChatWorkspaceId, selectedId, {
        accountId: activeZernioAccountId,
        status: nextStatus
      });

      setConversationDetails(prev => prev ? { ...prev, status: nextStatus } : null);

      let refreshedConvs: (InboxConversationDto & { workspaceId?: string })[] = [];
      if (filterWorkspaceId === 'all') {
        const lists = await Promise.all(workspaces.map(async w => {
          const list = await inboxApi.getConversations(w.id);
          return list.map(c => ({ ...c, workspaceId: w.id }));
        }));
        refreshedConvs = lists.flat();
      } else {
        const list = await inboxApi.getConversations(activeChatWorkspaceId);
        refreshedConvs = list.map(c => ({ ...c, workspaceId: activeChatWorkspaceId }));
      }
      setConversations(refreshedConvs);
    } catch (err) {
      console.error('Failed to toggle conversation status', err);
    } finally {
      setIsArchiving(false);
    }
  };

  // ── Message Editing ─────────────────────────────────────────────────────
  const startEdit = (msgId: string, currentText: string) => {
    setEditingMessageId(msgId);
    setEditingText(currentText);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!activeChatWorkspaceId || !selectedId || !activeZernioAccountId || !editingText.trim()) return;

    setIsEditing(messageId);
    try {
      await inboxApi.editMessage(activeChatWorkspaceId, selectedId, messageId, {
        accountId: activeZernioAccountId,
        text: editingText.trim()
      });

      setEditingMessageId(null);
      setEditingText('');

      const refreshed = await inboxApi.getMessages(activeChatWorkspaceId, selectedId);
      setMessages(refreshed);
    } catch (err) {
      console.error('Failed to edit message', err);
    } finally {
      setIsEditing(null);
    }
  };

  // ── Message Deletion ────────────────────────────────────────────────────
  const canDeleteMessage = (isOutbound: boolean): boolean => {
    if (!activeChat) return false;
    const platform = activeChat.platform.toLowerCase();
    // Facebook / Instagram / WhatsApp: API không hỗ trợ → ẩn nút.
    if (DELETE_DISABLED_PLATFORMS.has(platform)) return false;
    // Twitter (X): chỉ cho xóa DM outgoing.
    if (platform === 'twitter' && !isOutbound) return false;
    return true;
  };

  const isOneWayDelete = (): boolean =>
    activeChat ? DELETE_ONE_WAY_PLATFORMS.has(activeChat.platform.toLowerCase()) : false;

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChatWorkspaceId || !selectedId || !activeZernioAccountId) return;
    // Zernio API yêu cầu conversationId là ObjectId 24-char hex của Zernio,
    // KHÔNG phải Syncra DB id hay platform-native id (số 17 chữ số).
    const zernioConvoId = activeChat?.zernioConversationId;
    if (!zernioConvoId) return;

    // Bluesky / Reddit: chỉ xóa 1 chiều (người nhận vẫn thấy) → cần xác nhận trước.
    if (isOneWayDelete()) {
      setPendingDelete({ messageId, oneWay: true });
      return;
    }

    await performDelete(messageId, zernioConvoId);
  };

  const performDelete = async (messageId: string, zernioConvoId: string) => {
    if (!activeChatWorkspaceId || !selectedId) return;

    // Optimistic UI: ẩn tin nhắn ngay để UX mượt.
    const previousMessages = messages;
    setMessages(prev => prev.filter(m => m.zernioMessageId !== messageId));
    setIsDeleting(messageId);

    try {
      await inboxApi.deleteMessage(activeChatWorkspaceId, zernioConvoId, messageId, activeZernioAccountId);
    } catch (err) {
      console.error('Failed to delete message', err);
      showError(DELETE_ERROR_MESSAGE);
      // Khôi phục lại bubble để đồng bộ với trạng thái thật trên server.
      setMessages(previousMessages);
    } finally {
      setIsDeleting(null);
    }
  };

  const confirmOneWayDelete = async () => {
    if (!pendingDelete) return;
    const { messageId } = pendingDelete;
    const zernioConvoId = activeChat?.zernioConversationId;
    setPendingDelete(null);
    if (zernioConvoId) {
      await performDelete(messageId, zernioConvoId);
    }
  };

  // ── Emoji Reactions ─────────────────────────────────────────────────────
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!activeChatWorkspaceId || !selectedId || !activeZernioAccountId) return;
    // Zernio API yêu cầu conversationId là ObjectId 24-char hex của Zernio,
    // KHÔNG phải Syncra DB id hay platform-native id (số 17 chữ số).
    const zernioConvoId = activeChat?.zernioConversationId;
    if (!isReactionSupported || !zernioConvoId) {
      showError(REACTION_ERROR_MESSAGE);
      return;
    }

    setShowReactionPickerId(null);

    // Optimistic UI: append reaction ngay để user thấy instant.
    // Nếu BE fail → refresh sẽ sync lại về trạng thái thật (xóa optimistic).
    const optimisticReaction = {
      emoji,
      accountId: activeZernioAccountId,
      participantId: activeZernioAccountId
    };
    setMessages(prev => prev.map(m =>
      m.zernioMessageId === messageId
        ? { ...m, reactions: [...(m.reactions || []), optimisticReaction] }
        : m
    ));

    try {
      // WhatsApp giới hạn 1 reaction/msg/user: nếu user đã react emoji khác trước đó
      // thì remove reaction cũ trước khi add mới (best-effort, bỏ qua nếu chưa có).
      // Telegram: 1 reaction cũng giới hạn tương tự — remove trước cho an toàn.
      const msg = messages.find(m => m.zernioMessageId === messageId);
      const hasExisting = !!msg?.reactions?.some(r => r.emoji && r.emoji !== emoji);
      if (hasExisting) {
        try {
          await inboxApi.removeReaction(activeChatWorkspaceId, zernioConvoId, messageId, activeZernioAccountId);
        } catch {
          // Có thể user chưa react lần nào — bỏ qua lỗi 404.
        }
      }

      await inboxApi.addReaction(activeChatWorkspaceId, zernioConvoId, messageId, {
        accountId: activeZernioAccountId,
        emoji
      });
    } catch (err) {
      console.error('Failed to add reaction', err);
      showError(REACTION_ERROR_MESSAGE);
    } finally {
      // Sync UI với server state thật (covers optimistic removal khi fail).
      try {
        const refreshed = await inboxApi.getMessages(activeChatWorkspaceId, selectedId);
        setMessages(refreshed);
      } catch {
        // ignore
      }
    }
  };

  // ── Create Conversation (New Chat) ──────────────────────────────────────
  const handleCreateConvo = async () => {
    const selectedSa = socialAccounts.find(sa => sa.id === newChatAccount);
    if (!selectedSa) return;
    const accountWorkspaceId = selectedSa.workspaceId || activeWorkspace?.id;
    if (!accountWorkspaceId || !newChatRecipient || !newChatMessage.trim()) return;

    setIsCreatingConvo(true);
    try {
      const payload: any = {
        accountId: selectedSa.externalAccountId,
        message: newChatMessage.trim()
      };

      if (newChatIsUsername) {
        payload.participantUsername = newChatRecipient.trim();
      } else {
        payload.participantId = newChatRecipient.trim();
      }

      const result = await inboxApi.createConversation(accountWorkspaceId, payload);
      
      setIsNewChatOpen(false);
      setNewChatRecipient('');
      setNewChatMessage('');

      // Refresh conversations: if filterWorkspaceId is 'all', refresh all; else refresh the account workspace
      let refreshed: (InboxConversationDto & { workspaceId?: string })[] = [];
      if (filterWorkspaceId === 'all') {
        const lists = await Promise.all(workspaces.map(async w => {
          const list = await inboxApi.getConversations(w.id);
          return list.map(c => ({ ...c, workspaceId: w.id }));
        }));
        refreshed = lists.flat();
      } else {
        const list = await inboxApi.getConversations(accountWorkspaceId);
        refreshed = list.map(c => ({ ...c, workspaceId: accountWorkspaceId }));
      }
      setConversations(refreshed);
      
      const matchingConvo = refreshed.find(c => c.zernioConversationId === result.conversationId);
      if (matchingConvo) {
        setSelectedId(matchingConvo.id);
      }
    } catch (err) {
      console.error('Failed to initiate conversation', err);
    } finally {
      setIsCreatingConvo(false);
    }
  };

  // ── Filters & Rendering Lists ───────────────────────────────────────────
  // Tất cả filter (platform / workspace / account) chỉ hiển thị options thuộc
  // platform mà Zernio hỗ trợ cho tính năng Messages (DM/inbox).
  const platformOptions: FilterOption[] = [
    { value: 'all', label: 'All platforms' },
    ...Array.from(MESSAGES_SUPPORTED_PLATFORMS).map(p => ({
      value: p,
      label: PLATFORM_DISPLAY_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1),
      iconPlatform: p
    })),
  ];

  const workspaceOptions: FilterOption[] = [
    { value: 'all', label: 'All workspaces' },
    ...workspaces.map(w => ({
      value: w.id,
      label: w.name
    }))
  ];

  const accountOptions: FilterOption[] = [
    { value: 'all', label: 'All accounts' },
    ...socialAccounts
      .filter(sa => {
        const platform = sa.platform.toLowerCase();
        const isSupported = MESSAGES_SUPPORTED_PLATFORMS.has(platform);
        const matchesPlatform = filterPlatform === 'all' || platform === filterPlatform;
        const matchesWorkspace = filterWorkspaceId === 'all' || sa.workspaceId === filterWorkspaceId;
        return isSupported && matchesPlatform && matchesWorkspace;
      })
      .map(sa => ({
        value: sa.id,
        label: sa.displayName || sa.handle || sa.platform,
        iconPlatform: sa.platform.toLowerCase()
      })),
  ];

  // Phòng trường hợp filter đang chọn platform không còn trong supported set → reset về 'all'.
  if (filterPlatform !== 'all' && !MESSAGES_SUPPORTED_PLATFORMS.has(filterPlatform.toLowerCase())) {
    setFilterPlatform('all');
  }
  if (filterAccount !== 'all' && !accountOptions.some(o => o.value === filterAccount)) {
    setFilterAccount('all');
  }

  const filteredConversations = conversations.filter(c => {
    // Loại bỏ luôn conversation thuộc platform không Zernio-supported
    // (defense in depth — phòng BE trả lẫn platform lạ).
    if (!MESSAGES_SUPPORTED_PLATFORMS.has(c.platform.toLowerCase())) return false;
    if (filterWorkspaceId !== 'all' && c.workspaceId !== filterWorkspaceId) return false;
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
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
                value={filterWorkspaceId}
                onChange={(val) => {
                  setFilterWorkspaceId(val);
                  if (val !== 'all') {
                    const ws = workspaces.find(w => w.id === val);
                    if (ws) {
                      setActiveWorkspace(ws);
                    }
                  }
                }}
                options={workspaceOptions}
                label="All workspaces"
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
              <div className={styles.emptyState}><Loader2 size={24} className={styles.spinner} /> Loading conversations...</div>
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
              <Loader2 size={48} className={styles.spinner} />
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
                      disabled={isArchiving}
                      title={conversationDetails.status === 'archived' ? 'Unarchive Convo' : 'Archive Convo'}
                      style={{ color: conversationDetails.status === 'archived' ? 'var(--clr-primary)' : 'inherit' }}
                    >
                      {isArchiving ? <Loader2 size={18} className={styles.spinner} /> : <Archive size={18} />}
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
                    const sorted = [...messages].sort((a, b) => {
                      const timeA = !a.sentAtUtc || a.sentAtUtc.startsWith('0001')
                        ? new Date(a.createdAtUtc).getTime()
                        : new Date(a.sentAtUtc).getTime();
                      const timeB = !b.sentAtUtc || b.sentAtUtc.startsWith('0001')
                        ? new Date(b.createdAtUtc).getTime()
                        : new Date(b.sentAtUtc).getTime();
                      return timeA - timeB;
                    });
                    let lastDateKey = '';
                    let lastMsgTime = 0;
                    return sorted.map((m) => {
                      const isMe = m.direction === 'Outbound';
                      const effectiveSentAt = !m.sentAtUtc || m.sentAtUtc.startsWith('0001')
                        ? m.createdAtUtc
                        : m.sentAtUtc;
                      const timeStr = formatHanoiTime(effectiveSentAt);
                      const sentMs = new Date(effectiveSentAt).getTime();
                      const currentDateKey = getHanoiDateKey(effectiveSentAt);
                      const currentDateLabel = getHanoiDateLabel(effectiveSentAt);

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
                                      disabled={isEditing === m.zernioMessageId}
                                    />
                                    <button className={styles.editBtnSave} onClick={() => handleSaveEdit(m.zernioMessageId)} disabled={!!isEditing}>
                                      {isEditing ? <Loader2 size={14} className={styles.spinner} /> : 'Save'}
                                    </button>
                                    <button className={styles.editBtnCancel} onClick={() => setEditingMessageId(null)} disabled={!!isEditing}>Cancel</button>
                                  </div>
                                ) : (
                                  <div className={styles.bubble}>
                                    {m.attachments && m.attachments.length > 0 && (
                                      <div className={styles.attachmentsList}>
                                        {m.attachments.map((att) => {
                                          const t = (att.type || '').toLowerCase();
                                          const imageExt = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$|#)/i;
                                          const isImage = t === 'image' || t === 'sticker' || (!t && (imageExt.test(att.url) || imageExt.test(att.previewUrl || '')));
                                          if (isImage) {
                                            const src = att.previewUrl || att.url;
                                            return (
                                              <img
                                                key={att.id}
                                                src={src}
                                                alt={att.filename || 'image'}
                                                className={styles.messageImage}
                                                onClick={() => window.open(att.url, '_blank')}
                                              />
                                            );
                                          } else if (t === 'video') {
                                            return (
                                              <video
                                                key={att.id}
                                                src={att.url}
                                                controls
                                                className={styles.messageVideo}
                                              />
                                            );
                                          } else if (t === 'audio') {
                                            return (
                                              <audio
                                                key={att.id}
                                                src={att.url}
                                                controls
                                                className={styles.messageAudio}
                                              />
                                            );
                                          } else {
                                            return (
                                              <a
                                                key={att.id}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.messageFileLink}
                                              >
                                                <Paperclip size={14} style={{ marginRight: '4px' }} />
                                                {att.filename || 'Download file'}
                                              </a>
                                            );
                                          }
                                        })}
                                      </div>
                                    )}
                                    {m.bodyText && <p>{m.bodyText}</p>}
                                  </div>
                                )}

                                {/* Message actions menu on hover — ẩn luôn wrapper nếu không có action nào */}
                                {!editingMessageId && (isReactionSupported || (isMe && activeChat.platform === 'telegram') || canDeleteMessage(isMe)) && (
                                  <div className={styles.messageActions}>
                                    {/* Emoji reaction popover button — chỉ hiện trên Telegram/WhatsApp */}
                                    {isReactionSupported && (
                                      <button
                                        className={styles.actionBtn}
                                        onClick={() => setShowReactionPickerId(showReactionPickerId === m.id ? null : m.id)}
                                        title="Add reaction"
                                      >
                                        <Smile size={14} />
                                      </button>
                                    )}
                                    {isMe && activeChat.platform === 'telegram' && (
                                      <button
                                        className={styles.actionBtn}
                                        onClick={() => startEdit(m.id, m.bodyText || '')}
                                        title="Edit message"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    )}
                                    {canDeleteMessage(isMe) && (
                                      <button
                                        className={styles.actionBtn}
                                        onClick={() => handleDeleteMessage(m.zernioMessageId)}
                                        title="Delete message"
                                        disabled={isDeleting === m.zernioMessageId}
                                      >
                                        {isDeleting === m.zernioMessageId ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Emoji Reaction Selector overlay — bộ emoji giới hạn theo platform */}
                                {showReactionPickerId === m.id && isReactionSupported && (
                                  <div className={styles.emojiPopover}>
                                    {reactionEmojiSet.map(emoji => (
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
                {attachmentError && (
                  <div className={styles.attachmentError} role="alert">
                    <AlertCircle size={14} />
                    <span>{attachmentError}</span>
                  </div>
                )}

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
                      onClick={() => { setPendingFile(null); setPreviewUrl(''); setAttachmentError(null); }}
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
                      disabled={isSending || isUploading || (!inputText.trim() && !pendingFile)}
                    >
                      {isSending || isUploading ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
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
                      if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
                        setPendingFile(null);
                        setPreviewUrl('');
                        setAttachmentError(ATTACHMENT_ERROR_MESSAGE);
                        e.target.value = '';
                        return;
                      }
                      setPendingFile(file);
                      setAttachmentError(null);
                      if (file.type.startsWith('image/')) {
                        setPreviewUrl(URL.createObjectURL(file));
                      } else {
                        setPreviewUrl('');
                      }
                    }
                    e.target.value = '';
                  }}
                  accept="image/jpeg,image/png,image/gif,video/mp4"
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

      {/* Delete Confirmation Modal — cho Bluesky/Reddit (chỉ xóa 1 chiều) */}
      {pendingDelete?.oneWay && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Xóa tin nhắn</h3>
              <button className={styles.closeBtn} onClick={() => setPendingDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                <strong>Lưu ý:</strong> Tin nhắn này chỉ được xóa khỏi giao diện của bạn,
                người nhận vẫn có thể đọc được nội dung.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setPendingDelete(null)}>
                Hủy
              </button>
              <button className={styles.btnConfirm} onClick={confirmOneWayDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button className={styles.btnSubmit} onClick={handleCreateConvo} disabled={isCreatingConvo}>
                {isCreatingConvo ? <><Loader2 size={16} className={styles.spinner} /> Sending...</> : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
