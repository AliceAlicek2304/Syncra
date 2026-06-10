import { useState, useRef, useEffect } from 'react';
import {
  Smile, Send, MessageSquare,
  Edit, Trash2, Archive, X, AlertCircle,
  Paperclip, ExternalLink,
  ChevronDown, Check, Loader2, Search
} from 'lucide-react';
import { HubConnectionBuilder } from '@microsoft/signalr';
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
import { Button } from '../../components/ui/button';


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

const LOCAL_STYLE = `
  .messages-dashboard-theme {
    --primary: #ff4f00;
    --primary-container: #ffece0;
    --on-primary: #fffefb;
    --on-primary-container: #201515;
    --background: #fffefb;
    --surface: #fffefb;
    --surface-container: #f8f4f0;
    --surface-container-high: #f1e8de;
    --surface-container-highest: #eae0d3;
    --surface-container-low: #faf7f4;
    --surface-container-lowest: #ffffff;
    --on-surface: #201515;
    --on-surface-variant: #605d52;
    --outline: #c5c0b1;
    --outline-variant: #e6dfd2;
    --error: #ba1a1a;
    --error-container: #ffdad6;
    --on-error: #ffffff;
    --on-error-container: #93000a;
    --primary-fixed-dim: #ffc7a8;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite !important;
  }
`;

const renderPlatformBadge = (platform: string) => (
  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-[var(--outline-variant)] flex items-center justify-center z-10 shadow-sm">
    <ExtendedPlatformIcon platform={platform} size={14} />
  </span>
);

const statusIcons: Record<string, { icon: React.ReactNode; cls: string }> = {
  sending: { icon: <Loader2 size={12} className="animate-spin" />, cls: 'text-[var(--on-surface-variant)]' },
  sent: { icon: <Check size={12} />, cls: 'text-[var(--primary)]' },
  delivered: { icon: <DoubleCheck size={12} />, cls: 'text-[var(--primary)]' },
  read: { icon: <DoubleCheck size={12} />, cls: 'text-[var(--primary)]' },
  failed: { icon: <X size={12} />, cls: 'text-red-500' },
};

const MessageStatusIcon = ({ status }: { status?: string }) => {
  if (!status) return <DoubleCheck size={12} className="text-[var(--primary)]" />;
  const entry = statusIcons[status] ?? statusIcons.sent;
  return <span className={`inline-block ${entry.cls}`}>{entry.icon}</span>;
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
      <span className="flex items-center gap-1.5 min-w-0">
        {option.iconPlatform && (
          <span className="shrink-0 flex items-center">
            <ExtendedPlatformIcon platform={option.iconPlatform} size={14} />
          </span>
        )}
        <span className="truncate">{option.label}</span>
      </span>
    );
  };

  return (
    <div className="relative flex items-center shrink-0" ref={ref}>
      <button
        className={`flex items-center justify-between bg-transparent border border-[var(--outline-variant)] rounded-lg pl-3 pr-8 py-1.5 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer gap-2 ${open ? 'bg-[var(--surface-container-low)]' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="text-left select-none">{renderOptionLabel(selected)}</span>
        <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--on-surface-variant)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 outline-none ${opt.value === value ? 'bg-[var(--surface-container-high)] text-[var(--primary)] font-semibold' : 'text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]'}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className="w-4 shrink-0 flex items-center justify-center">
                {opt.value === value ? <Check size={14} className="text-[var(--primary)]" /> : null}
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
  const { activeWorkspace, profiles, activeProfile, setActiveProfile } = useWorkspace();
  const { error: showError } = useToast();
  const [filterProfileId, setFilterProfileId] = useState<string>(activeProfile?.id || 'all');

  useEffect(() => {
    if (activeProfile?.id) {
      setFilterProfileId(activeProfile.id);
    }
  }, [activeProfile?.id]);

  // ── States ────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<(InboxConversationDto & { profileId?: string })[]>([]);
  const [messages, setMessages] = useState<InboxMessageDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<InboxConversationDetailsDto | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<(SocialAccountDto & { profileId?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [isCreatingConvo, setIsCreatingConvo] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
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

  // Refs for tracking states without re-triggering effects
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const socialAccountsRef = useRef(socialAccounts);
  useEffect(() => {
    socialAccountsRef.current = socialAccounts;
  }, [socialAccounts]);

  const filterProfileIdRef = useRef(filterProfileId);
  useEffect(() => {
    filterProfileIdRef.current = filterProfileId;
  }, [filterProfileId]);

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const activeProfileRef = useRef(activeProfile);
  useEffect(() => {
    activeProfileRef.current = activeProfile;
  }, [activeProfile]);

  const activeChat = conversations.find(c => c.id === selectedId);
  const activeChatProfileId = activeChat?.profileId || activeProfile?.id;
  const activeSocialAccount = socialAccounts.find(sa => sa.id === activeChat?.socialAccountId);
  const activeZernioAccountId = activeSocialAccount?.externalAccountId || '';
  const isReactionSupported = activeChat
    ? REACTION_SUPPORTED_PLATFORMS.has(activeChat.platform.toLowerCase())
    : false;
  const reactionEmojiSet = activeChat?.platform.toLowerCase() === 'telegram'
    ? TELEGRAM_REACTION_EMOJI
    : WHATSAPP_REACTION_EMOJI;

  const convoProfileId = activeChat?.profileId || activeProfile?.id;

  // ── Load Social Accounts & Conversations ────────────────────────────────
  useEffect(() => {
    if (profiles.length === 0 || !activeWorkspace) return;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (filterProfileId === 'all') {
          const accountsPromises = profiles.map(async w => {
            const list = await socialAccountsApi.listSocialAccounts(activeWorkspace.id, w.id);
            return list.map(sa => ({ ...sa, profileId: w.id }));
          });
          const convsPromises = profiles.map(async w => {
            const list = await inboxApi.getConversations(activeWorkspace.id, w.id);
            return list.map(c => ({ ...c, profileId: w.id }));
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
          const accounts = await socialAccountsApi.listSocialAccounts(activeWorkspace.id, filterProfileId);
          setSocialAccounts(accounts.map(sa => ({ ...sa, profileId: filterProfileId })));

          const convs = await inboxApi.getConversations(activeWorkspace.id, filterProfileId);
          setConversations(convs.map(c => ({ ...c, profileId: filterProfileId })));
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
  }, [filterProfileId, profiles, activeWorkspace]);

  const refreshConversationsOnly = async () => {
    if (!activeWorkspace) return;
    try {
      let convs: (InboxConversationDto & { profileId?: string })[] = [];
      if (filterProfileIdRef.current === 'all') {
        const lists = await Promise.all(profilesRef.current.map(async w => {
          const list = await inboxApi.getConversations(activeWorkspace.id, w.id);
          return list.map(c => ({ ...c, profileId: w.id }));
        }));
        convs = lists.flat();
      } else {
        const list = await inboxApi.getConversations(activeWorkspace.id, filterProfileIdRef.current);
        convs = list.map(c => ({ ...c, profileId: filterProfileIdRef.current }));
      }
      setConversations(convs);
    } catch (err) {
      console.error('Failed to refresh conversations list', err);
    }
  };

  const refreshMessagesAndDetails = async (convoId: string, options?: { showLoader?: boolean }) => {
    if (!activeWorkspace) return;
    const showLoader = options?.showLoader ?? false;
    
    const currentConvo = conversationsRef.current.find(c => c.id === convoId);
    if (!currentConvo) return;

    const currentConvoProfileId = currentConvo.profileId || activeProfileRef.current?.id;
    if (!currentConvoProfileId) return;

    if (showLoader) {
      setIsLoadingMessages(true);
    }
    
    try {
      // 1. Fetch messages first and set immediately (gets from local DB, fast)
      const msgList = await inboxApi.getMessages(activeWorkspace.id, convoId, { profileId: currentConvoProfileId });
      setMessages(msgList);
      
      // Turn off loader immediately after setting messages so user has instant feedback
      if (showLoader) {
        setIsLoadingMessages(false);
      }

      // Mark as read locally and API ONLY if not already read
      if (currentConvo && (!currentConvo.isRead || currentConvo.unreadCount > 0)) {
        await inboxApi.markAsRead(activeWorkspace.id, convoId);
        setConversations(prev =>
          prev.map(c => (c.id === convoId ? { ...c, isRead: true, unreadCount: 0 } : c))
        );
      }

      // 2. Fetch conversation details (slower, talks to Zernio API live)
      const currentSa = socialAccountsRef.current.find(sa => sa.id === currentConvo.socialAccountId);
      if (currentSa?.externalAccountId) {
        const details = await inboxApi.getConversationDetails(
          activeWorkspace.id,
          convoId,
          currentSa.externalAccountId
        );
        setConversationDetails(details);
      } else {
        setConversationDetails(null);
      }
    } catch (err) {
      console.error('Error fetching conversation messages/details', err);
    } finally {
      if (showLoader) {
        setIsLoadingMessages(false);
      }
    }
  };

  // ── Load Conversation Details & Messages on Select ──────────────────────
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setConversationDetails(null);
      return;
    }
    refreshMessagesAndDetails(selectedId, { showLoader: true });
  }, [selectedId, activeProfile?.id]);

  // ── SignalR real-time updates & Fallback Polling ────────────────────────
  useEffect(() => {
    if (!convoProfileId) return;

    const handleUpdate = async () => {
      await refreshConversationsOnly();
      if (selectedIdRef.current) {
        await refreshMessagesAndDetails(selectedIdRef.current, { showLoader: false });
      }
    };

    // 1. Fallback Polling every 10 seconds (in case SignalR is not connected)
    const interval = setInterval(async () => {
      try {
        await handleUpdate();
      } catch (err) {
        console.error('Failed to poll updates', err);
      }
    }, 10000);

    // 2. Real-time updates via SignalR NotificationHub
    const token = localStorage.getItem('syncra_access_token');
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const defaultBaseUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}api/v1`;
    const apiBaseUrl = (configuredBaseUrl || defaultBaseUrl).replace(/\/+$/, '');
    const hubUrl = `${apiBaseUrl}/hubs/notifications?workspaceId=${activeWorkspace?.id || convoProfileId}`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .build();

    const handleInboxItemCreated = async (_payload: any) => {
      try {
        await handleUpdate();
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
  }, [convoProfileId]);

  const handleSend = async () => {
    if (!activeWorkspace || !activeChatProfileId || !selectedId || !activeZernioAccountId) return;
    if (!inputText.trim() && !pendingFile) return;

    setIsSending(true);
    try {
      let attachmentPublicUrl = '';
      let attachmentMimeType: string | undefined;

      if (pendingFile) {
        setIsUploading(true);
        try {
          const result = await mediaApi.uploadMedia(activeWorkspace.id, pendingFile);
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

      await inboxApi.sendMessage(activeWorkspace.id, selectedId, payload);
      setInputText('');
      setPendingFile(null);
      setPreviewUrl('');
      setAttachmentError(null);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const refreshedMsgs = await inboxApi.getMessages(activeWorkspace.id, selectedId, { profileId: activeChatProfileId });
      setMessages(refreshedMsgs);

      // Refresh conversations: if filterProfileId is 'all', refresh all; else refresh the active chat profile
      let refreshedConvs: (InboxConversationDto & { profileId?: string })[] = [];
      if (filterProfileId === 'all') {
        const lists = await Promise.all(profiles.map(async w => {
          const list = await inboxApi.getConversations(activeWorkspace.id, w.id);
          return list.map(c => ({ ...c, profileId: w.id }));
        }));
        refreshedConvs = lists.flat();
      } else {
        const list = await inboxApi.getConversations(activeWorkspace.id, activeChatProfileId);
        refreshedConvs = list.map(c => ({ ...c, profileId: activeChatProfileId }));
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
    if (!activeWorkspace || !activeChatProfileId || !selectedId || !activeZernioAccountId || !conversationDetails) return;

    const nextStatus = conversationDetails.status === 'archived' ? 'active' : 'archived';
    setIsArchiving(true);
    try {
      await inboxApi.updateConversationStatus(activeWorkspace.id, selectedId, {
        accountId: activeZernioAccountId,
        status: nextStatus
      });

      setConversationDetails(prev => prev ? { ...prev, status: nextStatus } : null);

      let refreshedConvs: (InboxConversationDto & { profileId?: string })[] = [];
      if (filterProfileId === 'all') {
        const lists = await Promise.all(profiles.map(async w => {
          const list = await inboxApi.getConversations(activeWorkspace.id, w.id);
          return list.map(c => ({ ...c, profileId: w.id }));
        }));
        refreshedConvs = lists.flat();
      } else {
        const list = await inboxApi.getConversations(activeWorkspace.id, activeChatProfileId);
        refreshedConvs = list.map(c => ({ ...c, profileId: activeChatProfileId }));
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
    if (!activeWorkspace || !activeChatProfileId || !selectedId || !activeZernioAccountId || !editingText.trim()) return;

    setIsEditing(messageId);
    try {
      await inboxApi.editMessage(activeWorkspace.id, selectedId, messageId, {
        accountId: activeZernioAccountId,
        text: editingText.trim()
      });

      setEditingMessageId(null);
      setEditingText('');

      const refreshed = await inboxApi.getMessages(activeWorkspace.id, selectedId, { profileId: activeChatProfileId });
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
    if (!activeChatProfileId || !selectedId || !activeZernioAccountId) return;
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
    if (!activeWorkspace || !activeChatProfileId || !selectedId) return;

    // Optimistic UI: ẩn tin nhắn ngay để UX mượt.
    const previousMessages = messages;
    setMessages(prev => prev.filter(m => m.zernioMessageId !== messageId));
    setIsDeleting(messageId);

    try {
      await inboxApi.deleteMessage(activeWorkspace.id, zernioConvoId, messageId, activeZernioAccountId);
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
    if (!activeWorkspace || !activeChatProfileId || !selectedId || !activeZernioAccountId) return;
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
          await inboxApi.removeReaction(activeWorkspace.id, zernioConvoId, messageId, activeZernioAccountId);
        } catch {
          // Có thể user chưa react lần nào — bỏ qua lỗi 404.
        }
      }

      await inboxApi.addReaction(activeWorkspace.id, zernioConvoId, messageId, {
        accountId: activeZernioAccountId,
        emoji
      });
    } catch (err) {
      console.error('Failed to add reaction', err);
      showError(REACTION_ERROR_MESSAGE);
    } finally {
      // Sync UI với server state thật (covers optimistic removal khi fail).
      try {
        const refreshed = await inboxApi.getMessages(activeWorkspace.id, selectedId, { profileId: activeChatProfileId });
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
    const accountProfileId = selectedSa.profileId || activeProfile?.id;
    if (!activeWorkspace || !accountProfileId || !newChatRecipient || !newChatMessage.trim()) return;

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

      const result = await inboxApi.createConversation(activeWorkspace.id, payload);
      
      setIsNewChatOpen(false);
      setNewChatRecipient('');
      setNewChatMessage('');

      // Refresh conversations: if filterProfileId is 'all', refresh all; else refresh the account profile
      let refreshed: (InboxConversationDto & { profileId?: string })[] = [];
      if (filterProfileId === 'all') {
        const lists = await Promise.all(profiles.map(async w => {
          const list = await inboxApi.getConversations(activeWorkspace.id, w.id);
          return list.map(c => ({ ...c, profileId: w.id }));
        }));
        refreshed = lists.flat();
      } else {
        const list = await inboxApi.getConversations(activeWorkspace.id, accountProfileId);
        refreshed = list.map(c => ({ ...c, profileId: accountProfileId }));
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
  // Tất cả filter (platform / profile / account) chỉ hiển thị options thuộc
  // platform mà Zernio hỗ trợ cho tính năng Messages (DM/inbox).
  const platformOptions: FilterOption[] = [
    { value: 'all', label: 'All platforms' },
    ...Array.from(MESSAGES_SUPPORTED_PLATFORMS).map(p => ({
      value: p,
      label: PLATFORM_DISPLAY_NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1),
      iconPlatform: p
    })),
  ];

  const profileOptions: FilterOption[] = [
    { value: 'all', label: 'All profiles' },
    ...profiles.map(w => ({
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
        const matchesProfile = filterProfileId === 'all' || sa.profileId === filterProfileId;
        return isSupported && matchesPlatform && matchesProfile;
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
    if (!MESSAGES_SUPPORTED_PLATFORMS.has(c.platform.toLowerCase())) return false;
    if (filterProfileId !== 'all' && c.profileId !== filterProfileId) return false;
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterAccount !== 'all' && c.socialAccountId !== filterAccount) return false;
    
    // Local search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = (c.participantName || '').toLowerCase().includes(q);
      const matchesMsg = (c.lastMessageText || '').toLowerCase().includes(q);
      return matchesName || matchesMsg;
    }
    
    return true;
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (!a.lastMessageAtUtc || !b.lastMessageAtUtc) return 0;
    const timeA = new Date(a.lastMessageAtUtc).getTime();
    const timeB = new Date(b.lastMessageAtUtc).getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="messages-dashboard-theme w-full h-screen flex flex-col overflow-hidden bg-[var(--background)] text-[var(--on-surface)] font-sans antialiased">
      <style>{LOCAL_STYLE}</style>

      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 py-2 border-b border-[var(--outline-variant)] bg-[var(--surface)] shrink-0 h-16">
        <div className="flex items-center gap-6 flex-wrap">
          <h1 className="font-bold text-2xl text-[var(--on-surface)]">Messages</h1>
          
          <div className="flex items-center gap-2">
            <FilterDropdown
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={platformOptions}
              label="All platforms"
            />
            <FilterDropdown
              value={filterProfileId}
              onChange={(val) => {
                setFilterProfileId(val);
                if (val !== 'all') {
                  const ws = profiles.find(w => w.id === val);
                  if (ws) {
                    setActiveProfile(ws);
                  }
                }
              }}
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

        <div className="flex items-center gap-4">
          {activeChat && (
            <button 
              onClick={() => {}}
              className="text-[var(--primary)] hover:bg-[var(--surface-container-low)] transition-colors rounded-full p-2 outline-none"
              title="Open in Native Platform"
            >
              <ExternalLink size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <main className="flex-1 flex overflow-hidden min-h-0 w-full">
        {/* Left Sidebar (Conversations Master List) */}
        <aside className="w-[320px] shrink-0 flex flex-col border-r border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] h-full">
          <div className="p-4 border-b border-[var(--outline-variant)] flex justify-between items-center bg-[var(--surface-bright)] shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-[var(--on-surface)]">Chats</h2>
              <button
                className="text-[var(--primary)] hover:bg-[var(--surface-container-low)] transition-colors rounded-full p-1.5 outline-none"
                onClick={() => {
                  if (socialAccounts.length > 0) {
                    setNewChatAccount(socialAccounts[0].id);
                  }
                  setIsNewChatOpen(true);
                }}
                title="New Chat"
              >
                <Edit size={16} />
              </button>
            </div>
            
            <div className="relative flex items-center">
              <select 
                className="appearance-none bg-transparent border border-[var(--outline-variant)] rounded pl-2 pr-6 py-1 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer font-medium"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Newest first</option>
                <option value="oldest" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Oldest first</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--on-surface-variant)]" />
            </div>
          </div>

          {/* Search bar inside sidebar */}
          <div className="px-4 py-2 border-b border-[var(--outline-variant)] bg-[var(--surface-bright)] shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-[var(--on-surface-variant)]" size={14} />
              <input
                type="text"
                placeholder="Search chats..."
                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations List Scrolling Items */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="py-10 px-4 text-center text-[var(--on-surface-variant)] text-xs flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
                <span>Loading conversations...</span>
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="py-10 px-4 text-center text-[var(--on-surface-variant)] text-xs">
                <span>No conversations found</span>
              </div>
            ) : (
              sortedConversations.map(c => {
                const isActive = c.id === selectedId;
                const socialAccount = socialAccounts.find(sa => sa.id === c.socialAccountId);
                const accountHandle = socialAccount?.handle || socialAccount?.displayName || '';
                const isUnread = !c.isRead && c.unreadCount > 0;

                return (
                  <button
                    key={c.id}
                    className={`w-full text-left p-4 border-b border-[var(--outline-variant)] flex gap-3 cursor-pointer hover:bg-[var(--surface-container-low)] transition-colors outline-none border-l-4 ${isActive ? 'bg-[var(--surface-container-high)] border-l-[var(--primary)]' : 'border-l-transparent bg-transparent'}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-container-low)] shrink-0 flex items-center justify-center relative border border-[var(--outline-variant)]/30">
                      {c.participantAvatarUrl ? (
                        <img src={c.participantAvatarUrl} alt={c.participantName} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-[var(--primary-container)] flex items-center justify-center text-[var(--on-primary-container)] font-bold text-sm">
                          {getInitials(c.participantName)}
                        </div>
                      )}
                      {renderPlatformBadge(c.platform)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs truncate pr-2 ${isUnread ? 'font-bold text-[var(--primary)]' : 'font-semibold text-[var(--on-surface)]'}`}>
                          {c.participantName || 'Contact'}
                        </span>
                        <span className="text-[10px] text-[var(--on-surface-variant)] shrink-0">
                          {c.lastMessageAtUtc ? getShortTimeDiff(c.lastMessageAtUtc) : ''}
                        </span>
                      </div>

                      {accountHandle && (
                        <div className="text-[10px] text-[var(--on-surface-variant)] mb-1 truncate">
                          via @{accountHandle}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <p className={`truncate flex-1 pr-2 ${isUnread ? 'font-semibold text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'}`}>
                          {c.lastMessageText || 'No messages'}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 ml-1" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Content Area (Detail View & Message History) */}
        <section className="flex-1 flex flex-col bg-[var(--surface-bright)] relative h-full min-w-0">
          {isLoadingMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--on-surface-variant)] gap-3">
              <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
              <p className="text-sm font-medium">Loading messages...</p>
            </div>
          ) : activeChat ? (
            <>
              {/* Detail Header */}
              <header className="p-4 border-b border-[var(--outline-variant)] flex justify-between items-center bg-[var(--surface-bright)] z-10 shrink-0 h-16">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-container-low)] shrink-0 flex items-center justify-center relative border border-[var(--outline-variant)]/30">
                    {activeChat.participantAvatarUrl ? (
                      <img src={activeChat.participantAvatarUrl} alt={activeChat.participantName} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-[var(--primary-container)] flex items-center justify-center text-[var(--on-primary-container)] font-bold text-sm">
                        {getInitials(activeChat.participantName)}
                      </div>
                    )}
                    {renderPlatformBadge(activeChat.platform)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--on-surface)]">{activeChat.participantName || 'Contact'}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)] mt-0.5">
                      <span>Replying as @{activeSocialAccount?.handle || activeSocialAccount?.displayName || 'Unknown'}</span>
                      <span>•</span>
                      <span>Active {activeChat.lastMessageAtUtc ? getShortTimeDiff(activeChat.lastMessageAtUtc) : '4m'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {conversationDetails && (
                    <button
                      onClick={handleToggleArchive}
                      disabled={isArchiving}
                      className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors p-2 outline-none"
                      title={conversationDetails.status === 'archived' ? 'Unarchive Convo' : 'Archive Convo'}
                      style={{ color: conversationDetails.status === 'archived' ? 'var(--primary)' : 'inherit' }}
                    >
                      {isArchiving ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
                    </button>
                  )}
                  <button 
                    title="Open in External Link" 
                    onClick={() => {}}
                    className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors p-2 outline-none"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </header>

              {/* Detail Body scrollable area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="py-10 text-center text-[var(--on-surface-variant)] text-xs">
                    <span>No messages yet. Send a message to start!</span>
                  </div>
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
                        <div key={m.id} className="w-full flex flex-col">
                          {showDateSep && (
                            <div className="flex justify-center my-4">
                              <span className="text-[10px] bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] px-3 py-1 rounded-full font-medium shadow-sm">
                                {currentDateLabel}
                              </span>
                            </div>
                          )}
                          {showTimeSep && (
                            <div className="flex justify-center my-2">
                              <span className="text-[10px] text-[var(--on-surface-variant)] opacity-70">
                                {formatHanoiTime(m.sentAtUtc)}
                              </span>
                            </div>
                          )}
                          
                          <div className={`flex gap-3 max-w-[75%] my-1.5 ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                            {/* Avatar */}
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center shrink-0 text-xs font-bold shadow-sm self-end mb-1">
                                {getInitials(activeChat.participantName)}
                              </div>
                            )}

                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="relative flex items-center gap-2 group">
                                {editingMessageId === m.id ? (
                                  <div className="flex flex-col gap-2 p-3 bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl min-w-[240px]">
                                    <input
                                      type="text"
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      autoFocus
                                      disabled={isEditing === m.zernioMessageId}
                                      className="w-full bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded px-2 py-1 text-xs text-[var(--on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        className="px-2.5 py-1 text-[10px] border border-[var(--outline-variant)] rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] transition-colors disabled:opacity-50"
                                        onClick={() => setEditingMessageId(null)} 
                                        disabled={!!isEditing}
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        className="px-2.5 py-1 text-[10px] bg-[var(--primary)] text-[var(--on-primary)] rounded hover:opacity-95 transition-opacity flex items-center gap-1 disabled:opacity-50"
                                        onClick={() => handleSaveEdit(m.zernioMessageId)} 
                                        disabled={!!isEditing}
                                      >
                                        {isEditing ? <Loader2 size={10} className="animate-spin" /> : 'Save'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`p-3 rounded-xl text-xs shadow-sm break-words min-w-0 max-w-md ${isMe ? 'bg-[var(--primary)] text-[var(--on-primary)] rounded-br-none' : 'bg-[var(--surface-container-low)] text-[var(--on-surface)] border border-[var(--outline-variant)] rounded-bl-none'}`}>
                                    {m.attachments && m.attachments.length > 0 && (
                                      <div className="flex flex-col gap-2 mb-2 max-w-full">
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
                                                className="max-w-full max-h-60 rounded-lg object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                                onClick={() => window.open(att.url, '_blank')}
                                              />
                                            );
                                          } else if (t === 'video') {
                                            return (
                                              <video
                                                key={att.id}
                                                src={att.url}
                                                controls
                                                className="max-w-full rounded-lg max-h-60"
                                              />
                                            );
                                          } else if (t === 'audio') {
                                            return (
                                              <audio
                                                key={att.id}
                                                src={att.url}
                                                controls
                                                className="max-w-full rounded-lg"
                                              />
                                            );
                                          } else {
                                            return (
                                              <a
                                                key={att.id}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-[var(--primary)] hover:underline break-all"
                                                style={{ color: isMe ? '#ffffff' : 'var(--primary)' }}
                                              >
                                                <Paperclip size={12} className="shrink-0" />
                                                <span className="underline">{att.filename || 'Download file'}</span>
                                              </a>
                                            );
                                          }
                                        })}
                                      </div>
                                    )}
                                    {m.bodyText && <p className="whitespace-pre-wrap">{m.bodyText}</p>}
                                  </div>
                                )}

                                {/* Hover actions menu */}
                                {!editingMessageId && (isReactionSupported || (isMe && activeChat.platform === 'telegram') || canDeleteMessage(isMe)) && (
                                  <div className={`hidden group-hover:flex items-center gap-1 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-full p-1 shadow-md absolute z-20 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                    {isReactionSupported && (
                                      <button
                                        className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-[var(--surface-container-low)] p-1 rounded-full transition-colors outline-none"
                                        onClick={() => setShowReactionPickerId(showReactionPickerId === m.id ? null : m.id)}
                                        title="Add reaction"
                                      >
                                        <Smile size={14} />
                                      </button>
                                    )}
                                    {isMe && activeChat.platform === 'telegram' && (
                                      <button
                                        className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-[var(--surface-container-low)] p-1 rounded-full transition-colors outline-none"
                                        onClick={() => startEdit(m.id, m.bodyText || '')}
                                        title="Edit message"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    )}
                                    {canDeleteMessage(isMe) && (
                                      <button
                                        className="text-[var(--on-surface-variant)] hover:text-[var(--error)] hover:bg-[var(--error-container)] p-1 rounded-full transition-colors outline-none"
                                        onClick={() => handleDeleteMessage(m.zernioMessageId)}
                                        title="Delete message"
                                        disabled={isDeleting === m.zernioMessageId}
                                      >
                                        {isDeleting === m.zernioMessageId ? <Loader2 size={14} className="animate-spin text-[var(--primary)]" /> : <Trash2 size={14} />}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Emoji Reaction Selector overlay */}
                                {showReactionPickerId === m.id && isReactionSupported && (
                                  <div className={`absolute bottom-full mb-1 z-30 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl p-2 flex gap-1.5 shadow-lg ${isMe ? 'right-0' : 'left-0'}`}>
                                    {reactionEmojiSet.map(emoji => (
                                      <button
                                        key={emoji}
                                        className="text-lg hover:scale-125 transition-transform duration-100 p-1 outline-none"
                                        onClick={() => handleAddReaction(m.zernioMessageId, emoji)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Emoji Reactions List below bubble */}
                              {m.reactions && m.reactions.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {(() => {
                                    // Group reactions by emoji
                                    const grouped = new Map<string, number>();
                                    m.reactions.forEach(r => {
                                      if (r.emoji) {
                                        grouped.set(r.emoji, (grouped.get(r.emoji) || 0) + 1);
                                      }
                                    });
                                    return Array.from(grouped.entries()).map(([emoji, count]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleAddReaction(m.zernioMessageId, emoji)}
                                        className="bg-[var(--surface-container-lowest)] hover:bg-[var(--surface-container-high)] hover:border-[var(--primary)] border border-[var(--outline-variant)] rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 shadow-sm transition-colors text-[var(--on-surface-variant)] outline-none"
                                      >
                                        <span>{emoji}</span>
                                        {count > 1 && <span className="font-semibold">{count}</span>}
                                      </button>
                                    ));
                                  })()}
                                </div>
                              )}

                              <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-[var(--on-surface-variant)] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span>{timeStr}</span>
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
              <div className="p-4 border-t border-[var(--outline-variant)] bg-[var(--surface-bright)] shrink-0">
                <div className="relative max-w-4xl mx-auto flex flex-col gap-2">
                  {attachmentError && (
                    <div className="flex items-center gap-1.5 bg-[var(--error-container)] text-[var(--on-error-container)] px-3 py-2 rounded-lg text-[11px] shrink-0 font-medium" role="alert">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{attachmentError}</span>
                    </div>
                  )}

                  {pendingFile && (
                    <div className="flex items-center gap-2 bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-lg p-2 max-w-sm shrink-0 shadow-sm">
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="w-10 h-10 object-cover rounded shrink-0 border border-[var(--outline-variant)]" />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] rounded shrink-0 border border-[var(--outline-variant)]">
                          <Paperclip size={16} />
                        </div>
                      )}
                      <span className="text-xs text-[var(--on-surface)] truncate flex-1 font-medium">{pendingFile.name}</span>
                      {isUploading && <Loader2 size={14} className="animate-spin text-[var(--primary)]" />}
                      <button
                        className="text-[var(--on-surface-variant)] hover:text-[var(--error)] p-1 rounded transition-colors"
                        onClick={() => { setPendingFile(null); setPreviewUrl(''); setAttachmentError(null); }}
                        disabled={isUploading}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-bold text-sm shrink-0 shadow-sm self-end mb-1">
                      S
                    </div>

                    <div className="flex-1 relative flex flex-col bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl p-3 shadow-sm focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all">
                      <textarea
                        ref={textareaRef}
                        placeholder="Type a message..."
                        rows={1}
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        className="w-full bg-transparent border-none outline-none resize-none text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 pr-24"
                        style={{ minHeight: '24px' }}
                      />

                      <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-[var(--outline-variant)]/30">
                        <button
                          className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-[var(--surface-container-low)] p-1.5 rounded-lg transition-colors disabled:opacity-50 outline-none"
                          onClick={() => {
                            const input = document.getElementById('msg-file-input') as HTMLInputElement;
                            input?.click();
                          }}
                          title="Attach file"
                          disabled={isUploading}
                        >
                          <Paperclip size={16} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleSend}
                          title="Send Message"
                          disabled={isSending || isUploading || (!inputText.trim() && !pendingFile)}
                        >
                          {isSending || isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  id="msg-file-input"
                  type="file"
                  className="hidden"
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
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--on-surface-variant)] gap-3 bg-[var(--surface-bright)]">
              <MessageSquare size={48} className="opacity-40" />
              <p className="text-sm font-medium">Select a conversation to start messaging</p>
            </div>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal — cho Bluesky/Reddit (chỉ xóa 1 chiều) */}
      {pendingDelete?.oneWay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-[2px] p-4" role="dialog" aria-modal="true">
          <div className="bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 text-[var(--on-surface)]">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
              <h3 className="font-bold text-base text-[var(--on-surface)]">Xóa tin nhắn</h3>
              <button 
                className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors outline-none" 
                onClick={() => setPendingDelete(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[var(--on-surface)] leading-normal">
                <strong className="text-[var(--error)]">Lưu ý:</strong> Tin nhắn này chỉ được xóa khỏi giao diện của bạn,
                người nhận vẫn có thể đọc được nội dung.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
              <Button 
                variant="outline" 
                onClick={() => setPendingDelete(null)}
                className="h-8 rounded-lg text-xs"
              >
                Hủy
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmOneWayDelete}
                className="h-8 rounded-lg text-xs bg-[var(--error)] text-[var(--on-error)] hover:bg-[var(--error)]/90"
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-[2px] p-4" role="dialog" aria-modal="true">
          <div className="bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 text-[var(--on-surface)]">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
              <h3 className="font-bold text-base text-[var(--on-surface)]">Start a New DM Conversation</h3>
              <button 
                className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors outline-none" 
                onClick={() => setIsNewChatOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--on-surface-variant)]">Select Connected Social Account</label>
                <div className="relative flex items-center w-full">
                  <select
                    value={newChatAccount}
                    onChange={(e) => setNewChatAccount(e.target.value)}
                    className="w-full appearance-none bg-transparent border border-[var(--outline-variant)] rounded-lg pl-3 pr-8 py-2 text-xs text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer"
                  >
                    {socialAccounts.map(sa => (
                      <option key={sa.id} value={sa.id} className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">
                        {sa.platform.toUpperCase()} - {sa.displayName || sa.handle}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--on-surface-variant)]" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[var(--on-surface-variant)]">Recipient Detail</label>
                  <div className="flex gap-4 text-[10px] text-[var(--on-surface-variant)]">
                    <label className="flex gap-1.5 items-center cursor-pointer select-none">
                      <input
                        type="radio"
                        name="recipientType"
                        checked={newChatIsUsername}
                        onChange={() => setNewChatIsUsername(true)}
                        className="accent-[var(--primary)]"
                      />
                      Username
                    </label>
                    <label className="flex gap-1.5 items-center cursor-pointer select-none">
                      <input
                        type="radio"
                        name="recipientType"
                        checked={!newChatIsUsername}
                        onChange={() => setNewChatIsUsername(false)}
                        className="accent-[var(--primary)]"
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
                  className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-lg px-3 py-2 text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--on-surface-variant)]">Initial Message</label>
                <textarea
                  placeholder="Type your initial message..."
                  rows={3}
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-lg px-3 py-2 text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                />
              </div>

              <div className="flex gap-2.5 items-start bg-[var(--primary-container)]/10 text-[var(--primary)] p-3 rounded-lg text-[10.5px] border border-[var(--primary-fixed-dim)]/30 leading-normal">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>Note: Creating new conversations is currently only supported for Twitter/X. Recipient must accept DMs from you.</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
              <Button 
                variant="outline" 
                onClick={() => setIsNewChatOpen(false)}
                className="h-8 rounded-lg text-xs"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateConvo} 
                disabled={isCreatingConvo || !newChatRecipient || !newChatMessage.trim()}
                className="h-8 rounded-lg text-xs bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary)]/90"
              >
                {isCreatingConvo ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
