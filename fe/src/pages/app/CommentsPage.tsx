import { useState, useEffect, useRef } from 'react'
import {
  Search, Send, CheckCircle2, Check,
  ThumbsUp, EyeOff, MessageSquare, Trash2, Loader2,
  ChevronDown, ExternalLink, Reply, Image, RotateCw
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { inboxApi, type InboxCommentedPostItemDto, type ZernioPostCommentItemDto } from '../../api/inbox'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { socialAccountsApi, type SocialAccountDto } from '../../api/socialAccounts'

interface PostGroup {
  id: string // zernioPostId
  title: string
  platform: string
  image: string
  time: string
  lastComment: string
  desc: string
  zernioAccountId: string
  rawComments: InboxCommentedPostItemDto[]
  commentCount: number
  isAd?: boolean
  adId?: string
  placement?: string
}

const HANOI_TZ = 'Asia/Ho_Chi_Minh';

const formatHanoiTime = (utcStr?: string) => {
  if (!utcStr) return '';
  const date = new Date(utcStr);
  return date.toLocaleDateString('en-GB', {
    timeZone: HANOI_TZ,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
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

const addCommentToState = (
  comments: ZernioPostCommentItemDto[],
  newComment: ZernioPostCommentItemDto
): ZernioPostCommentItemDto[] => {
  if (!newComment.parentId) {
    if (comments.some(c => c.id === newComment.id || (newComment.cid && c.cid === newComment.cid))) {
      return comments;
    }
    return [...comments, newComment];
  }

  return comments.map(c => {
    if (c.id === newComment.parentId) {
      const replies = c.replies || [];
      if (replies.some(r => r.id === newComment.id || (newComment.cid && r.cid === newComment.cid))) {
        return c;
      }
      return { ...c, replies: [...replies, newComment] };
    }
    return c;
  });
};

const replaceOptimisticComment = (
  comments: ZernioPostCommentItemDto[],
  tempId: string,
  realComment: ZernioPostCommentItemDto
): ZernioPostCommentItemDto[] => {
  if (!realComment.parentId) {
    return comments.map(c => (c.id === tempId ? realComment : c));
  }

  return comments.map(c => {
    if (c.id === realComment.parentId) {
      return {
        ...c,
        replies: (c.replies || []).map(r => (r.id === tempId ? realComment : r))
      };
    }
    return c;
  });
};

const mergeCommentsList = (
  localComments: ZernioPostCommentItemDto[],
  serverComments: ZernioPostCommentItemDto[]
): ZernioPostCommentItemDto[] => {
  const serverCommentIds = new Set<string>();
  const serverCommentCids = new Set<string>();

  const traverse = (list: ZernioPostCommentItemDto[]) => {
    list.forEach(c => {
      if (c.id) serverCommentIds.add(c.id);
      if (c.cid) serverCommentCids.add(c.cid);
      if (c.replies) traverse(c.replies);
    });
  };
  traverse(serverComments);

  const localOnlyTopLevel = localComments.filter(c => 
    c.from?.isOwner && 
    !serverCommentIds.has(c.id) && 
    (!c.cid || !serverCommentCids.has(c.cid)) &&
    !c.parentId
  );

  const merged: ZernioPostCommentItemDto[] = serverComments.map(c => {
    const localReplies = localComments
      .filter(r => r.parentId === c.id || (c.cid && r.parentId === c.cid))
      .filter(r => r.from?.isOwner && !serverCommentIds.has(r.id) && (!r.cid || !serverCommentCids.has(r.cid)));
    
    const serverReplies = c.replies || [];
    const mergedReplies = [...serverReplies];
    localReplies.forEach(lr => {
      if (!mergedReplies.some(sr => sr.id === lr.id || (lr.cid && sr.cid === lr.cid))) {
        mergedReplies.push(lr);
      }
    });

    return {
      ...c,
      replies: mergedReplies
    };
  });

  localOnlyTopLevel.forEach(lc => {
    if (!merged.some(mc => mc.id === lc.id || (lc.cid && mc.cid === lc.cid))) {
      merged.push(lc);
    }
  });

  return merged;
};

const LOCAL_STYLE = `
  .comments-dashboard-theme {
    --primary: #8c4d39;
    --primary-container: #f4a48b;
    --on-primary: #ffffff;
    --on-primary-container: #713826;
    --background: #f9f9fa;
    --surface: #f9f9fa;
    --surface-container: #eeeeef;
    --surface-container-high: #e8e8e9;
    --surface-container-highest: #e2e2e3;
    --surface-container-low: #f3f3f4;
    --surface-container-lowest: #ffffff;
    --on-surface: #1a1c1d;
    --on-surface-variant: #53433f;
    --outline: #86736e;
    --outline-variant: #d8c2bb;
    --error: #ba1a1a;
    --error-container: #ffdad6;
    --on-error: #ffffff;
    --on-error-container: #93000a;
    --primary-fixed-dim: #ffb59e;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite !important;
  }
`;

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

const COMMENTS_SUPPORTED_PLATFORMS = new Set([
  'facebook',
  'instagram',
  'twitter',
  'threads',
  'bluesky',
  'reddit',
  'youtube',
  'linkedin'
]);

const platformOptions: FilterOption[] = [
  { value: 'all', label: 'All platforms' },
  { value: 'facebook', label: 'Facebook', iconPlatform: 'facebook' },
  { value: 'instagram', label: 'Instagram', iconPlatform: 'instagram' },
  { value: 'twitter', label: 'Twitter/X', iconPlatform: 'twitter' },
  { value: 'threads', label: 'Threads', iconPlatform: 'threads' },
  { value: 'bluesky', label: 'Bluesky', iconPlatform: 'bluesky' },
  { value: 'reddit', label: 'Reddit', iconPlatform: 'reddit' },
  { value: 'youtube', label: 'YouTube', iconPlatform: 'youtube' },
  { value: 'linkedin', label: 'LinkedIn', iconPlatform: 'linkedin' }
];

export default function CommentsPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountDto[]>([])

  const [posts, setPosts] = useState<PostGroup[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  
  const [liveComments, setLiveComments] = useState<ZernioPostCommentItemDto[]>([])
  
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [isLoadingLive, setIsLoadingLive] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [isPrivateReplying, setIsPrivateReplying] = useState(false)
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null)
  const [hideLoadingId, setHideLoadingId] = useState<string | null>(null)
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterWorkspace, setFilterWorkspace] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const activePost = posts.find(p => p.id === selectedPostId)

  // Track latest posts state for SignalR/Polling without reconnects
  const postsRef = useRef(posts);
  const justClickedReplyRef = useRef(false);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => {
      setToastVisible(false)
    }, 3000)
  }

  // 1. Fetch posts list
  const refreshPosts = async (autoSelect = false) => {
    if (!workspaceId) return
    try {
      const responseData = await inboxApi.getComments(workspaceId, { limit: 100 })
      const list = responseData.data || []
      
      const groupMap = new Map<string, PostGroup>()
      
      list.forEach(c => {
        if (!c.id) return;
        if (!groupMap.has(c.id)) {
          groupMap.set(c.id, {
            id: c.id,
            title: c.content || 'Untitled Post',
            platform: c.platform,
            image: c.picture || '',
            time: c.createdTime,
            lastComment: c.content,
            desc: c.content || '',
            zernioAccountId: c.accountId || '',
            rawComments: [c],
            commentCount: c.commentCount || 0,
            isAd: c.isAd,
            adId: c.adId,
            placement: c.placement
          })
        } else {
          const group = groupMap.get(c.id)!
          group.rawComments.push(c)
          if (new Date(c.createdTime) > new Date(group.time)) {
            group.time = c.createdTime;
            group.lastComment = c.content;
          }
          if ((c.commentCount || 0) > group.commentCount) {
            group.commentCount = c.commentCount || 0;
          }
        }
      })
      
      const sortedGroups = Array.from(groupMap.values())
        .filter(g => g.commentCount > 0)
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      setPosts(sortedGroups)
      
      if (autoSelect && sortedGroups.length > 0 && !selectedPostId) {
        setSelectedPostId(sortedGroups[0].id)
      }
    } catch (err) {
      console.error('Failed to load comments', err)
      triggerToast('Failed to load comments')
    }
  }

  // 2. Fetch live comments for selected post
  const refreshLiveComments = async (postId = selectedPostId, forceFresh = false, bypassCache = false) => {
    if (!workspaceId || !postId) {
      setLiveComments([])
      return
    }
    const currentPost = postsRef.current.find(p => p.id === postId)
    if (!currentPost) return
    try {
      const response = await inboxApi.getPostComments(workspaceId, currentPost.id, currentPost.zernioAccountId, { 
        limit: 100,
        forceRefresh: bypassCache
      })
      const serverComments = response.comments || []
      if (forceFresh) {
        setLiveComments(serverComments)
      } else {
        setLiveComments(prev => mergeCommentsList(prev, serverComments))
      }
    } catch (err) {
      console.error('Failed to load post comments', err)
      triggerToast('Failed to fetch live comments')
    }
  }

  const handleRefreshClick = () => {
    if (!selectedPostId) return
    setIsLoadingLive(true)
    refreshLiveComments(selectedPostId, true, true).finally(() => setIsLoadingLive(false))
  }

  // Initial Load of Posts
  useEffect(() => {
    if (!workspaceId) return
    setIsLoadingPosts(true)
    refreshPosts(true).finally(() => setIsLoadingPosts(false))
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) {
      setSocialAccounts([]);
      return;
    }
    socialAccountsApi.listSocialAccounts(workspaceId)
      .then(setSocialAccounts)
      .catch(err => console.error('Failed to load social accounts', err))
  }, [workspaceId])

  // Initial Load of Live Comments on Select
  useEffect(() => {
    if (!workspaceId || !selectedPostId) {
      setLiveComments([])
      return
    }
    setIsLoadingLive(true)
    setLiveComments([])
    refreshLiveComments(selectedPostId, true).finally(() => setIsLoadingLive(false))
  }, [workspaceId, selectedPostId])

  // Auto-adjust selectedPostId when posts or filters change
  useEffect(() => {
    const filtered = posts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.lastComment.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPlatform = filterPlatform === 'all' || p.platform.toLowerCase() === filterPlatform.toLowerCase()
      const matchesAccount = filterAccount === 'all' || p.zernioAccountId === filterAccount;
      return matchesSearch && matchesPlatform && matchesAccount
    });

    if (filtered.length > 0) {
      if (!selectedPostId || !filtered.some(p => p.id === selectedPostId)) {
        setSelectedPostId(filtered[0].id);
      }
    } else {
      setSelectedPostId(null);
    }
  }, [posts, filterPlatform, filterAccount, searchQuery, selectedPostId]);

  // SignalR & Polling for Real-Time Updates
  useEffect(() => {
    if (!workspaceId) return;

    // 1. Fallback Polling every 10 seconds
    const interval = setInterval(async () => {
      try {
        await refreshPosts(false);
        await refreshLiveComments(selectedPostId || undefined, false);
      } catch (err) {
        console.error('Failed to poll updates', err);
      }
    }, 10000);

    // 2. SignalR Connection
    const token = localStorage.getItem('syncra_access_token');
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const defaultBaseUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}api/v1`;
    const apiBaseUrl = (configuredBaseUrl || defaultBaseUrl).replace(/\/+$/, '');
    const hubUrl = `${apiBaseUrl}/hubs/notifications?workspaceId=${workspaceId}`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .build();

    const handleInboxItemCreated = async (payload: any) => {
      if (payload?.type === 'comment') {
        try {
          await refreshPosts(false);
          await refreshLiveComments(selectedPostId || undefined, false);
        } catch (err) {
          console.error('Failed to update comments on SignalR event', err);
        }
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
  }, [workspaceId, selectedPostId]);

  // Actions with Optimistic UI & Rollback
  const handleLikeComment = async (commentId: string, isCurrentlyLiked: boolean, likeUri?: string) => {
    if (!workspaceId) return;
    
    setLikeLoadingId(commentId);

    // Optimistic UI Update
    setLiveComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          isLiked: !isCurrentlyLiked,
          likeCount: isCurrentlyLiked ? Math.max(0, c.likeCount - 1) : c.likeCount + 1
        }
      }
      return c
    }));

    try {
      if (isCurrentlyLiked) {
        await inboxApi.unlikeComment(workspaceId, commentId, likeUri)
        // Clear likeUri
        setLiveComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return { ...c, likeUri: undefined }
          }
          return c
        }));
      } else {
        const response = await inboxApi.likeComment(workspaceId, commentId)
        // Save likeUri returned from server (especially for Bluesky)
        if (response.likeUri) {
          setLiveComments(prev => prev.map(c => {
            if (c.id === commentId) {
              return { ...c, likeUri: response.likeUri }
            }
            return c
          }));
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update like status';
      triggerToast(errMsg);

      // Rollback UI
      setLiveComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: isCurrentlyLiked,
            likeCount: isCurrentlyLiked ? c.likeCount + 1 : Math.max(0, c.likeCount - 1),
            likeUri
          }
        }
        return c
      }));
    } finally {
      setLikeLoadingId(null);
    }
  }

  const handleHideComment = async (commentId: string, isCurrentlyHidden: boolean) => {
    if (!workspaceId) return;

    setHideLoadingId(commentId);

    // Optimistic UI Update
    setLiveComments(prev => prev.map(c => {
      if (c.id === commentId) return { ...c, isHidden: !isCurrentlyHidden }
      return c
    }));

    try {
      if (isCurrentlyHidden) {
        await inboxApi.unhideComment(workspaceId, commentId)
        triggerToast('Comment unhidden')
      } else {
        await inboxApi.hideComment(workspaceId, commentId)
        triggerToast('Comment hidden')
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update hide status';
      triggerToast(errMsg);

      // Rollback UI
      setLiveComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, isHidden: isCurrentlyHidden }
        return c
      }));
    } finally {
      setHideLoadingId(null);
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!workspaceId) return;
    
    const originalComments = [...liveComments];
    setDeleteLoadingId(commentId);

    // Optimistic UI Update
    setLiveComments(prev => prev.filter(c => c.id !== commentId));
    
    try {
      await inboxApi.deleteComment(workspaceId, commentId)
      triggerToast('Comment deleted')
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete comment';
      triggerToast(errMsg);

      // Rollback UI
      setLiveComments(originalComments);
    } finally {
      setDeleteLoadingId(null);
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !workspaceId || !activePost) return
    const targetCommentId = replyingToCommentId || activePost.id
    
    const currentReplyText = replyText;
    const tempReplyId = `temp-${Date.now()}`;
    const optimisticReply: ZernioPostCommentItemDto = {
      id: tempReplyId,
      message: currentReplyText,
      createdTime: new Date().toISOString(),
      from: {
        id: 'you',
        name: 'You',
        isOwner: true
      },
      likeCount: 0,
      replyCount: 0,
      platform: activePost.platform,
      canReply: true,
      canDelete: true,
      canHide: false,
      canLike: false,
      isHidden: false,
      isLiked: false,
      parentId: replyingToCommentId || undefined
    };

    // Optimistic UI Update
    setLiveComments(prev => addCommentToState(prev, optimisticReply));
    setReplyText('');
    setReplyingToCommentId(null);
    setIsReplying(true);

    try {
      const response = await inboxApi.replyToComment(workspaceId, targetCommentId, currentReplyText)
      triggerToast('Comment posted successfully!')
      
      const realComment: ZernioPostCommentItemDto = {
        id: response.commentId,
        message: currentReplyText,
        createdTime: new Date().toISOString(),
        from: {
          id: 'you',
          name: 'You',
          isOwner: true
        },
        likeCount: 0,
        replyCount: 0,
        platform: activePost.platform,
        canReply: true,
        canDelete: true,
        canHide: false,
        canLike: false,
        isHidden: false,
        isLiked: false,
        parentId: replyingToCommentId || undefined,
        cid: response.cid
      };

      // Replace optimistic comment with real comment
      setLiveComments(prev => replaceOptimisticComment(prev, tempReplyId, realComment));
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to post comment';
      triggerToast(errMsg);

      // Rollback UI
      setLiveComments(prev => {
        const removeTemp = (list: ZernioPostCommentItemDto[]): ZernioPostCommentItemDto[] => {
          return list
            .filter(c => c.id !== tempReplyId)
            .map(c => ({
              ...c,
              replies: c.replies ? removeTemp(c.replies) : undefined
            }));
        };
        return removeTemp(prev);
      });
      setReplyText(currentReplyText);
    } finally {
      setIsReplying(false);
    }
  }

  const [privateReplyModalOpen, setPrivateReplyModalOpen] = useState(false);
  const [privateReplyComment, setPrivateReplyComment] = useState<ZernioPostCommentItemDto | null>(null);
  const [privateReplyMessage, setPrivateReplyMessage] = useState('');
  const [privateReplyType, setPrivateReplyType] = useState<'none' | 'quick_replies' | 'buttons'>('none');
  const [quickReplies, setQuickReplies] = useState<{ title: string; payload: string; imageUrl?: string }[]>([]);
  const [replyButtons, setReplyButtons] = useState<{ type: string; title: string; url?: string; payload?: string; phone_number?: string }[]>([]);

  const openPrivateReplyModal = (comment: ZernioPostCommentItemDto) => {
    setPrivateReplyComment(comment);
    setPrivateReplyMessage('');
    setPrivateReplyType('none');
    setQuickReplies([]);
    setReplyButtons([]);
    setPrivateReplyModalOpen(true);
  };

  const isExpired7Days = (createdTime: string) => {
    const commentDate = new Date(createdTime);
    const diffMs = Date.now() - commentDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  };

  const handleSendPrivateReply = async () => {
    if (!workspaceId || !privateReplyComment || !privateReplyMessage.trim()) return;

    setIsPrivateReplying(true);
    try {
      const request: any = {
        message: privateReplyMessage
      };

      if (privateReplyType === 'quick_replies') {
        const validQRs = quickReplies.filter(qr => qr.title.trim());
        if (validQRs.length > 13) {
          triggerToast('Tối đa 13 thẻ trả lời nhanh');
          setIsPrivateReplying(false);
          return;
        }
        if (validQRs.length > 0) {
          request.quickReplies = validQRs.map(qr => ({
            title: qr.title,
            payload: qr.payload || qr.title,
            imageUrl: qr.imageUrl || undefined
          }));
        }
      } else if (privateReplyType === 'buttons') {
        const validButtons = replyButtons.filter(b => b.title.trim());
        if (validButtons.length < 1 || validButtons.length > 3) {
          triggerToast('Cần từ 1 đến 3 nút bấm');
          setIsPrivateReplying(false);
          return;
        }
        request.buttons = validButtons.map(b => ({
          type: b.type,
          title: b.title,
          url: b.type === 'url' ? b.url : undefined,
          payload: b.type === 'postback' ? b.payload : undefined,
          phone_number: b.type === 'phone' ? b.phone_number : undefined
        }));
      }

      await inboxApi.sendPrivateReplyToComment(workspaceId, privateReplyComment.id, request);
      triggerToast('Gửi tin nhắn riêng thành công');
      
      setLiveComments(prev => {
        const markPrivateReply = (list: ZernioPostCommentItemDto[]): ZernioPostCommentItemDto[] => {
          return list.map(c => {
            if (c.id === privateReplyComment.id) {
              return { ...c, hasSentPrivateReply: true };
            }
            if (c.replies) {
              return { ...c, replies: markPrivateReply(c.replies) };
            }
            return c;
          });
        };
        return markPrivateReply(prev);
      });

      setPrivateReplyModalOpen(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Gửi tin nhắn riêng thất bại';
      triggerToast(errMsg);
    } finally {
      setIsPrivateReplying(false);
    }
  };

  // Filter & Search & Sort posts
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.lastComment.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = filterPlatform === 'all' || p.platform.toLowerCase() === filterPlatform.toLowerCase()
    const matchesAccount = filterAccount === 'all' || p.zernioAccountId === filterAccount;
    return matchesSearch && matchesPlatform && matchesAccount
  })

  const sortedAndFilteredPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    }
    if (sortBy === 'unanswered') {
      const aHasReply = a.rawComments.some(c => (c as any).authorName?.toLowerCase() === 'you' || (c as any).authorName === 'Syncra');
      const bHasReply = b.rawComments.some(c => (c as any).authorName?.toLowerCase() === 'you' || (c as any).authorName === 'Syncra');
      if (aHasReply && !bHasReply) return 1;
      if (!aHasReply && bHasReply) return -1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    }
    return 0;
  });

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
        const isSupported = COMMENTS_SUPPORTED_PLATFORMS.has(platform);
        const matchesPlatform = filterPlatform === 'all' || platform === filterPlatform;
        return isSupported && matchesPlatform;
      })
      .map(sa => ({
        value: sa.externalAccountId,
        label: sa.displayName || sa.handle || sa.platform,
        iconPlatform: sa.platform.toLowerCase()
      })),
  ];

  if (filterPlatform !== 'all' && !COMMENTS_SUPPORTED_PLATFORMS.has(filterPlatform.toLowerCase())) {
    setFilterPlatform('all');
  }

  if (filterAccount !== 'all' && !accountOptions.some(o => o.value === filterAccount)) {
    setFilterAccount('all');
  }

  const totalCommentsCount = liveComments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  // Platform specific UI flags
  const activePlatform = activePost?.platform?.toLowerCase() || '';
  const isTopLevelCommentDisabled = !replyingToCommentId && ['instagram', 'threads'].includes(activePlatform);
  
  const placeholderText = isTopLevelCommentDisabled
    ? 'Top-level comments are disabled on Instagram and Threads. Please reply to an existing comment.'
    : (replyingToCommentId ? 'Type your reply to comment...' : 'Write a comment...');

  return (
    <div className="comments-dashboard-theme w-full h-screen flex flex-col overflow-hidden bg-[var(--background)] text-[var(--on-surface)] font-sans antialiased">
      <style>{LOCAL_STYLE}</style>

      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 py-2 border-b border-[var(--outline-variant)] bg-[var(--surface)] shrink-0 h-16">
        <div className="flex items-center gap-6">
          <h1 className="font-bold text-2xl text-[var(--on-surface)]">Comments</h1>
          
          <div className="flex items-center gap-2">
            {/* Platform Filter Dropdown */}
            <FilterDropdown
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={platformOptions}
              label="All platforms"
            />

            {/* Profile Filter Dropdown */}
            <FilterDropdown
              value={filterWorkspace}
              onChange={(val) => {
                setFilterWorkspace(val);
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

            {/* Account Filter Dropdown */}
            <FilterDropdown
              value={filterAccount}
              onChange={setFilterAccount}
              options={accountOptions}
              label="All accounts"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activePost && (
            <button 
              onClick={() => {
                if (liveComments[0]?.url) {
                  window.open(liveComments[0].url, '_blank');
                } else {
                  triggerToast("No post link available");
                }
              }}
              className="text-[var(--primary)] hover:bg-[var(--surface-container-low)] transition-colors rounded-full p-2"
              title="Open in native platform"
            >
              <ExternalLink size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <main className="flex-1 flex overflow-hidden min-h-0 w-full">
        {/* Left Sidebar (Posts Master List) */}
        <aside className="w-[320px] shrink-0 flex flex-col border-r border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] h-full">
          <div className="p-4 border-b border-[var(--outline-variant)] flex justify-between items-center bg-[var(--surface-bright)] shrink-0">
            <h2 className="font-semibold text-lg text-[var(--on-surface)]">Posts</h2>
            <div className="relative flex items-center">
              <select 
                className="appearance-none bg-transparent border border-[var(--outline-variant)] rounded pl-2 pr-6 py-1 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer font-medium"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Newest first</option>
                <option value="oldest" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Oldest first</option>
                <option value="unanswered" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Unanswered first</option>
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
                placeholder="Search posts..."
                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Posts List Scrolling Items */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingPosts ? (
              <div className="py-10 px-4 text-center text-[var(--on-surface-variant)] text-xs flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
                <span>Loading posts...</span>
              </div>
            ) : sortedAndFilteredPosts.length === 0 ? (
              <div className="py-10 px-4 text-center text-[var(--on-surface-variant)] text-xs">
                <span>No posts found</span>
              </div>
            ) : (
              sortedAndFilteredPosts.map(p => {
                const isActive = p.id === selectedPostId;
                return (
                  <button
                    key={p.id}
                    className={`w-full text-left p-4 border-b border-[var(--outline-variant)] flex gap-3 cursor-pointer hover:bg-[var(--surface-container-low)] transition-colors outline-none border-l-4 ${isActive ? 'bg-[var(--surface-container-high)] border-l-[var(--primary)]' : 'border-l-transparent bg-transparent'}`}
                    onClick={() => setSelectedPostId(p.id)}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--surface-variant)] shrink-0 flex items-center justify-center relative">
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[var(--primary)]"><Image size={18} /></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-[var(--on-surface)] truncate pr-2">{p.title}</span>
                        <span className="text-[10px] text-[var(--on-surface-variant)] shrink-0">{getShortTimeDiff(p.time)}</span>
                      </div>

                      {p.isAd && (
                        <div className="mb-1">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold text-[9px] uppercase tracking-wider">
                            Từ quảng cáo
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)]">
                        <ExtendedPlatformIcon platform={p.platform?.toLowerCase()} size={14} />
                        <span>@Syncra</span>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--on-surface-variant)]">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} />
                          <span>{p.commentCount} comments</span>
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Right Content Area (Detail View & Comments List) */}
        <section className="flex-1 flex flex-col bg-[var(--surface-bright)] relative h-full min-w-0">
          {activePost ? (
            <>
              {/* Detail Header */}
              <header className="p-4 border-b border-[var(--outline-variant)] flex justify-between items-center bg-[var(--surface-bright)] z-10 shrink-0 h-14">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-base text-[var(--on-surface)]">Comments ({totalCommentsCount})</h2>
                  {activePost.isAd && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold text-[10px] uppercase tracking-wider">
                      Từ quảng cáo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleRefreshClick}
                    disabled={isLoadingLive}
                    className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors rounded-full p-2 hover:bg-[var(--surface-container-low)]"
                    title="Refresh comments"
                  >
                    <RotateCw size={18} className={isLoadingLive ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => {
                      if (liveComments[0]?.url) {
                        window.open(liveComments[0].url, '_blank');
                      } else {
                        triggerToast("No post link available");
                      }
                    }}
                    className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors rounded-full p-2 hover:bg-[var(--surface-container-low)]"
                    title="Open in native platform"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </header>

              {/* Detail Body scrollable area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {isLoadingLive ? (
                  <div className="py-10 text-center text-[var(--on-surface-variant)] text-xs flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
                    <span>Fetching comments...</span>
                  </div>
                ) : liveComments.length === 0 ? (
                  <div className="py-10 text-center text-[var(--on-surface-variant)] text-xs">
                    <span>No comments found on this post</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveComments.map(c => {
                      const platformLower = (c.platform || activePost.platform)?.toLowerCase();
                      const showLikeButton = ['facebook', 'twitter', 'x', 'bluesky', 'reddit'].includes(platformLower);
                      const showHideButton = c.canHide && ['facebook', 'instagram', 'threads', 'twitter', 'x'].includes(platformLower);
                      const showPrivateReplyButton = ['facebook', 'instagram'].includes(platformLower);

                      return (
                        <div key={c.id} className="space-y-3">
                          {/* Parent Comment */}
                          <div
                            className={`bg-[var(--surface-container-low)] rounded-xl p-4 border border-[var(--outline-variant)] transition-all ${c.isHidden ? 'opacity-50' : 'opacity-100'}`}
                          >
                            <div className="flex gap-3">
                              {c.from?.picture ? (
                                <img src={c.from.picture} alt={c.from.name || 'User'} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] flex items-center justify-center shrink-0 text-[var(--on-primary-container)] font-bold text-sm">
                                  {c.from?.name?.[0] || '?'}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-xs text-[var(--on-surface)]">
                                    {c.from?.name || c.from?.username || 'Unknown User'}
                                  </span>
                                  {c.from?.isOwner && (
                                    <span className="px-1.5 py-0.5 rounded bg-[var(--surface-variant)] text-[var(--on-surface-variant)] font-semibold text-[9px] uppercase tracking-wider">You</span>
                                  )}
                                  {(c.isAd || activePost.isAd) && (
                                    <span 
                                      className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold text-[9px] uppercase tracking-wider"
                                      title={c.isAd ? "Bình luận từ quảng cáo" : "Bài viết quảng cáo"}
                                    >
                                      Từ quảng cáo
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-xs text-[var(--on-surface)] leading-normal whitespace-pre-wrap">{c.message}</p>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[10px] text-[var(--on-surface-variant)]">
                                  <span>{formatHanoiTime(c.createdTime)}</span>
                                  
                                  <div className="flex items-center gap-1">
                                    {/* Like Button */}
                                    {showLikeButton && (
                                      <button
                                        onClick={() => handleLikeComment(c.id, c.isLiked, c.likeUri)}
                                        className={`hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)] ${c.isLiked ? 'text-red-500 font-semibold' : ''}`}
                                        disabled={likeLoadingId === c.id || hideLoadingId === c.id || deleteLoadingId === c.id}
                                      >
                                        {likeLoadingId === c.id ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                          <ThumbsUp size={12} />
                                        )}
                                        <span>{c.likeCount > 0 ? c.likeCount : 'Like'}</span>
                                      </button>
                                    )}
                                    
                                    {/* Hide Button */}
                                    {showHideButton && (
                                      <button 
                                        onClick={() => handleHideComment(c.id, c.isHidden)} 
                                        disabled={likeLoadingId === c.id || hideLoadingId === c.id || deleteLoadingId === c.id}
                                        className="hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)]"
                                      >
                                        {hideLoadingId === c.id ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                          <EyeOff size={12} />
                                        )}
                                        <span>{c.isHidden ? 'Unhide' : 'Hide'}</span>
                                      </button>
                                    )}
                                    
                                    {/* Reply Button */}
                                    <button 
                                      onClick={() => {
                                        justClickedReplyRef.current = true;
                                        setReplyingToCommentId(c.id);
                                        const inputEl = document.getElementById('reply-input');
                                        if (inputEl) inputEl.focus();
                                      }}
                                      className="hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)]"
                                    >
                                      <Reply size={12} />
                                      <span>Reply</span>
                                    </button>

                                    {/* Private Message Button */}
                                    {showPrivateReplyButton && !c.hasSentPrivateReply && (
                                      <button 
                                        onClick={() => openPrivateReplyModal(c)} 
                                        disabled={isExpired7Days(c.createdTime)}
                                        className={`hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)] ${isExpired7Days(c.createdTime) ? 'opacity-45 cursor-not-allowed' : ''}`}
                                        title={isExpired7Days(c.createdTime) ? "Over 7 days limit to send private reply" : "Private Reply"}
                                      >
                                        <MessageSquare size={12} />
                                        <span>Private Reply</span>
                                      </button>
                                    )}

                                    {/* Delete Button */}
                                    {c.canDelete && (
                                      <button 
                                        onClick={() => handleDeleteComment(c.id)} 
                                        className="hover:text-[var(--error)] hover:bg-[var(--error-container)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded" 
                                        disabled={likeLoadingId === c.id || hideLoadingId === c.id || deleteLoadingId === c.id}
                                      >
                                        {deleteLoadingId === c.id ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                          <Trash2 size={12} />
                                        )}
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Nested Replies Rendering */}
                          {c.replies && c.replies.length > 0 && (
                            <div className="pl-6 space-y-3 border-l-2 border-[var(--outline-variant)] ml-6">
                              {c.replies.map(reply => {
                                const replyPlatformLower = (reply.platform || activePost.platform)?.toLowerCase();
                                const showReplyLikeButton = ['facebook', 'twitter', 'x', 'bluesky', 'reddit'].includes(replyPlatformLower);
                                const showReplyHideButton = reply.canHide && ['facebook', 'instagram', 'threads', 'twitter', 'x'].includes(replyPlatformLower);
                                const showReplyPrivateReplyButton = ['facebook', 'instagram'].includes(replyPlatformLower);

                                return (
                                  <div
                                    key={reply.id}
                                    className={`bg-[var(--surface-container-low)] rounded-xl p-4 border border-[var(--outline-variant)] transition-all ${reply.isHidden ? 'opacity-50' : 'opacity-100'}`}
                                  >
                                    <div className="flex gap-3">
                                      {reply.from?.picture ? (
                                        <img src={reply.from.picture} alt={reply.from.name || 'User'} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] flex items-center justify-center shrink-0 text-[var(--on-primary-container)] font-bold text-sm">
                                          {reply.from?.name?.[0] || '?'}
                                        </div>
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-xs text-[var(--on-surface)]">
                                            {reply.from?.name || reply.from?.username || 'Unknown User'}
                                          </span>
                                          {reply.from?.isOwner && (
                                            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-variant)] text-[var(--on-surface-variant)] font-semibold text-[9px] uppercase tracking-wider">You</span>
                                          )}
                                        </div>
                                        
                                        <p className="text-xs text-[var(--on-surface)] leading-normal whitespace-pre-wrap">{reply.message}</p>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[10px] text-[var(--on-surface-variant)]">
                                          <span>{formatHanoiTime(reply.createdTime)}</span>
                                          
                                          <div className="flex items-center gap-1">
                                            {/* Like Button */}
                                            {showReplyLikeButton && (
                                              <button
                                                onClick={() => handleLikeComment(reply.id, reply.isLiked, reply.likeUri)}
                                                className={`hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)] ${reply.isLiked ? 'text-red-500 font-semibold' : ''}`}
                                                disabled={likeLoadingId === reply.id || hideLoadingId === reply.id || deleteLoadingId === reply.id}
                                              >
                                                {likeLoadingId === reply.id ? (
                                                  <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                  <ThumbsUp size={12} />
                                                )}
                                                <span>{reply.likeCount > 0 ? reply.likeCount : 'Like'}</span>
                                              </button>
                                            )}
                                            
                                            {/* Hide Button */}
                                            {showReplyHideButton && (
                                              <button 
                                                onClick={() => handleHideComment(reply.id, reply.isHidden)} 
                                                disabled={likeLoadingId === reply.id || hideLoadingId === reply.id || deleteLoadingId === reply.id}
                                                className="hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)]"
                                              >
                                                {hideLoadingId === reply.id ? (
                                                  <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                  <EyeOff size={12} />
                                                )}
                                                <span>{reply.isHidden ? 'Unhide' : 'Hide'}</span>
                                              </button>
                                            )}

                                            {/* Private Message Button */}
                                            {showReplyPrivateReplyButton && !reply.hasSentPrivateReply && (
                                              <button 
                                                onClick={() => openPrivateReplyModal(reply)} 
                                                disabled={isExpired7Days(reply.createdTime)}
                                                className={`hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)] ${isExpired7Days(reply.createdTime) ? 'opacity-45 cursor-not-allowed' : ''}`}
                                                title={isExpired7Days(reply.createdTime) ? "Over 7 days limit to send private reply" : "Private Reply"}
                                              >
                                                <MessageSquare size={12} />
                                                <span>Private Reply</span>
                                              </button>
                                            )}

                                            {/* Delete Button */}
                                            {reply.canDelete && (
                                              <button 
                                                onClick={() => handleDeleteComment(reply.id)} 
                                                className="hover:text-[var(--error)] hover:bg-[var(--error-container)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded" 
                                                disabled={likeLoadingId === reply.id || hideLoadingId === reply.id || deleteLoadingId === reply.id}
                                              >
                                                {deleteLoadingId === reply.id ? (
                                                  <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                  <Trash2 size={12} />
                                                )}
                                                <span>Delete</span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reply Box Footer Area */}
              <div className="p-4 border-t border-[var(--outline-variant)] bg-[var(--surface-bright)] shrink-0">
                <div className="relative max-w-4xl mx-auto flex items-end gap-3">
                  {isTopLevelCommentDisabled ? (
                    <div className="w-full text-center py-2.5 px-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                      Top-level comments are not supported on Instagram and Threads. Click "Reply" under an existing comment to write a response.
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-bold text-sm shrink-0">
                        S
                      </div>
                      
                      <div className="flex-1 relative flex flex-col bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl p-3 shadow-sm focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]">
                        {replyingToCommentId && (
                          <div className="flex justify-between items-center bg-[var(--surface-container-low)] px-2 py-1 rounded text-[11px] text-[var(--primary)] font-medium mb-2 shrink-0">
                            <span>Replying to comment...</span>
                            <button onClick={() => setReplyingToCommentId(null)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] text-sm">×</button>
                          </div>
                        )}

                        <textarea
                          id="reply-input"
                          placeholder={placeholderText}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={1}
                          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent resize-none text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 pr-12"
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          onFocus={() => {
                            if (justClickedReplyRef.current) {
                              justClickedReplyRef.current = false;
                            } else {
                              setReplyingToCommentId(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (replyText.trim() && !isReplying) {
                                void handleSendReply();
                              }
                            }
                          }}
                        />

                        <button 
                          className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={handleSendReply} 
                          disabled={isReplying || !replyText.trim()}
                          title="Send Reply"
                        >
                          {isReplying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--on-surface-variant)] gap-3">
              <MessageSquare size={48} className="opacity-40" />
              <p className="text-sm font-medium">Select a conversation post to view comments</p>
            </div>
          )}
        </section>
      </main>

      {/* Private Reply Composer Modal */}
      {privateReplyModalOpen && privateReplyComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[var(--surface-container-lowest)] rounded-2xl border border-[var(--outline-variant)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--outline-variant)] flex justify-between items-center bg-[var(--surface-container-low)]">
              <div>
                <h3 className="font-bold text-base text-[var(--on-surface)]">Gửi tin nhắn riêng</h3>
                <p className="text-[10px] text-[var(--on-surface-variant)] mt-0.5">
                  Đang phản hồi bình luận của <strong>{privateReplyComment.from?.name || privateReplyComment.from?.username}</strong>
                </p>
              </div>
              <button 
                onClick={() => setPrivateReplyModalOpen(false)}
                className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] text-xl p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Preview Comment Content */}
              <div className="bg-[var(--surface-container-low)] p-3 rounded-xl border border-[var(--outline-variant)] opacity-80">
                <div className="font-semibold text-[10px] text-[var(--on-surface-variant)] mb-1 uppercase tracking-wider font-medium">Nội dung bình luận:</div>
                <p className="italic text-xs">"{privateReplyComment.message}"</p>
              </div>

              {/* Text message input */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[11px] text-[var(--on-surface)] uppercase tracking-wider font-medium">Tin nhắn văn bản *</label>
                <textarea
                  className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl p-3 text-xs text-[var(--on-surface)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none"
                  placeholder="Nhập nội dung tin nhắn gửi riêng..."
                  value={privateReplyMessage}
                  onChange={(e) => setPrivateReplyMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* CTA Selection (Tabs) */}
              <div className="space-y-2">
                <label className="block font-semibold text-[11px] text-[var(--on-surface)] uppercase tracking-wider font-medium">Đính kèm tương tác</label>
                <div className="flex gap-2 p-1 bg-[var(--surface-container-low)] rounded-lg">
                  {(['none', 'quick_replies', 'buttons'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPrivateReplyType(type)}
                      className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-colors ${privateReplyType === type ? 'bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-sm' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'}`}
                    >
                      {type === 'none' && 'Không có'}
                      {type === 'quick_replies' && 'Quick Replies'}
                      {type === 'buttons' && 'Buttons'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Replies Panel */}
              {privateReplyType === 'quick_replies' && (
                <div className="space-y-3 p-4 bg-[var(--surface-container-low)] rounded-xl border border-[var(--outline-variant)]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[11px] text-[var(--on-surface)] font-medium">Danh sách Quick Replies ({quickReplies.length}/13)</span>
                    {quickReplies.length < 13 && (
                      <button
                        type="button"
                        onClick={() => setQuickReplies(prev => [...prev, { title: '', payload: '' }])}
                        className="text-xs text-[var(--primary)] font-semibold hover:underline"
                      >
                        + Thêm thẻ
                      </button>
                    )}
                  </div>
                  
                  {quickReplies.length === 0 ? (
                    <p className="text-[11px] text-[var(--on-surface-variant)]/60 italic">Chưa có quick reply nào. Nhấn "+ Thêm thẻ" để tạo.</p>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {quickReplies.map((qr, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Tiêu đề nút (ví dụ: Xem giá)"
                            value={qr.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickReplies(prev => prev.map((item, i) => i === index ? { ...item, title: val } : item));
                            }}
                            className="flex-1 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-lg px-2.5 py-1 text-xs text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                          />
                          <input
                            type="text"
                            placeholder="Payload/Dữ liệu (tùy chọn)"
                            value={qr.payload}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickReplies(prev => prev.map((item, i) => i === index ? { ...item, payload: val } : item));
                            }}
                            className="flex-1 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-lg px-2.5 py-1 text-xs text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => setQuickReplies(prev => prev.filter((_, i) => i !== index))}
                            className="text-[var(--error)] hover:text-red-700 p-1 font-bold text-base"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Buttons Panel */}
              {privateReplyType === 'buttons' && (
                <div className="space-y-3 p-4 bg-[var(--surface-container-low)] rounded-xl border border-[var(--outline-variant)]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[11px] text-[var(--on-surface)] font-medium">Danh sách nút bấm ({replyButtons.length}/3)</span>
                    {replyButtons.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setReplyButtons(prev => [...prev, { type: 'url', title: '', url: '' }])}
                        className="text-xs text-[var(--primary)] font-semibold hover:underline"
                      >
                        + Thêm nút
                      </button>
                    )}
                  </div>

                  {/* Recommendation message for Instagram */}
                  {privateReplyComment.platform?.toLowerCase() === 'instagram' && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg text-[10px] text-blue-800 dark:text-blue-200">
                      <strong>ℹ️ Khuyến nghị:</strong> Nên dùng Buttons cho Instagram để tránh tin nhắn bị chuyển vào mục Tin nhắn chờ (Message Requests) không hiển thị Quick Replies.
                    </div>
                  )}
                  
                  {replyButtons.length === 0 ? (
                    <p className="text-[11px] text-[var(--on-surface-variant)]/60 italic">Chưa có nút bấm nào. Nhấn "+ Thêm nút" để tạo (tối thiểu 1, tối đa 3).</p>
                  ) : (
                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                      {replyButtons.map((b, index) => (
                        <div key={index} className="space-y-2 p-3 bg-[var(--surface-container-lowest)] rounded-lg border border-[var(--outline-variant)] relative">
                          <button
                            type="button"
                            onClick={() => setReplyButtons(prev => prev.filter((_, i) => i !== index))}
                            className="absolute right-2 top-2 text-[var(--error)] hover:text-red-700 font-bold text-base"
                          >
                            &times;
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-semibold text-[var(--on-surface-variant)]">Loại nút</span>
                              <select
                                value={b.type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyButtons(prev => prev.map((item, i) => i === index ? { ...item, type: val } : item));
                                }}
                                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-md px-2 py-1 text-xs text-[var(--on-surface)]"
                              >
                                <option value="url">URL (Link trang web)</option>
                                <option value="postback">Postback (Phản hồi dữ liệu)</option>
                                <option value="phone">Phone (Số điện thoại)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-semibold text-[var(--on-surface-variant)]">Tiêu đề nút *</span>
                              <input
                                type="text"
                                placeholder="Nhập tiêu đề nút"
                                value={b.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyButtons(prev => prev.map((item, i) => i === index ? { ...item, title: val } : item));
                                }}
                                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-md px-2 py-1 text-xs text-[var(--on-surface)] outline-none"
                              />
                            </div>
                          </div>

                          {b.type === 'url' && (
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-semibold text-[var(--on-surface-variant)]">Địa chỉ Web URL *</span>
                              <input
                                type="url"
                                placeholder="https://example.com"
                                value={b.url || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyButtons(prev => prev.map((item, i) => i === index ? { ...item, url: val } : item));
                                }}
                                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-md px-2 py-1 text-xs text-[var(--on-surface)] outline-none"
                              />
                            </div>
                          )}

                          {b.type === 'postback' && (
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-semibold text-[var(--on-surface-variant)]">Dữ liệu Postback Payload *</span>
                              <input
                                type="text"
                                placeholder="Dữ liệu trả về hệ thống"
                                value={b.payload || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyButtons(prev => prev.map((item, i) => i === index ? { ...item, payload: val } : item));
                                }}
                                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-md px-2 py-1 text-xs text-[var(--on-surface)] outline-none"
                              />
                            </div>
                          )}

                          {b.type === 'phone' && (
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-semibold text-[var(--on-surface-variant)]">Số điện thoại *</span>
                              <input
                                type="tel"
                                placeholder="+84..."
                                value={b.phone_number || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReplyButtons(prev => prev.map((item, i) => i === index ? { ...item, phone_number: val } : item));
                                }}
                                className="w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-md px-2 py-1 text-xs text-[var(--on-surface)] outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPrivateReplyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[var(--outline-variant)] text-xs font-semibold text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendPrivateReply}
                disabled={isPrivateReplying || !privateReplyMessage.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPrivateReplying && <Loader2 size={14} className="animate-spin" />}
                Gửi tin nhắn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Feedback Toast */}
      <div className={`fixed bottom-6 right-6 bg-[var(--on-surface)] text-[var(--background)] px-5 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all duration-300 z-50 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <CheckCircle2 size={16} className="text-green-500" />
        <span className="text-xs font-medium">{toastMessage}</span>
      </div>
    </div>
  )
}
