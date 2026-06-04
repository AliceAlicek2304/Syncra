import { useState, useEffect } from 'react'
import {
  Search, Send, CheckCircle2,
  ThumbsUp, EyeOff, MessageSquare, Trash2, Loader2,
  ChevronDown, ExternalLink, Reply, Image
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { inboxApi, type InboxCommentDto, type ZernioPostCommentItemDto } from '../../api/inbox'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'

interface PostGroup {
  id: string // zernioPostId
  title: string
  platform: string
  image: string
  time: string
  lastComment: string
  desc: string
  zernioAccountId: string
  rawComments: InboxCommentDto[]
  commentCount: number
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

export default function CommentsPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const [posts, setPosts] = useState<PostGroup[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  
  const [liveComments, setLiveComments] = useState<ZernioPostCommentItemDto[]>([])
  
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [isLoadingLive, setIsLoadingLive] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [isPrivateReplying, setIsPrivateReplying] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => {
      setToastVisible(false)
    }, 3000)
  }

  // 1. Fetch grouped comments (Posts list)
  useEffect(() => {
    if (!workspaceId) return;

    const loadPosts = async () => {
      setIsLoadingPosts(true)
      try {
        const data = await inboxApi.getComments(workspaceId, { limit: 100 })
        
        // Group by zernioPostId
        const groupMap = new Map<string, PostGroup>()
        
        data.forEach(c => {
          if (!c.zernioPostId) return;
          if (!groupMap.has(c.zernioPostId)) {
            groupMap.set(c.zernioPostId, {
              id: c.zernioPostId,
              title: c.postPreviewCaption || 'Untitled Post',
              platform: c.platform,
              image: c.postPreviewThumbnailUrl || '',
              time: c.receivedAtUtc,
              lastComment: c.bodyText,
              desc: c.postPreviewCaption || '',
              zernioAccountId: c.zernioAccountId || '',
              rawComments: [c],
              commentCount: c.commentCount || 0
            })
          } else {
            const group = groupMap.get(c.zernioPostId)!
            group.rawComments.push(c)
            // Update last comment if newer
            if (new Date(c.receivedAtUtc) > new Date(group.time)) {
              group.time = c.receivedAtUtc;
              group.lastComment = c.bodyText;
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
        
        if (sortedGroups.length > 0 && !selectedPostId) {
          setSelectedPostId(sortedGroups[0].id)
        }
      } catch (err) {
        console.error('Failed to load comments', err)
        triggerToast('Failed to load comments')
      } finally {
        setIsLoadingPosts(false)
      }
    }
    
    loadPosts()
  }, [workspaceId])

  // 2. Fetch live comments for selected post
  useEffect(() => {
    if (!workspaceId || !activePost) return;

    const loadLiveComments = async () => {
      setIsLoadingLive(true)
      try {
        const response = await inboxApi.getPostComments(workspaceId, activePost.id, activePost.zernioAccountId, { limit: 100 })
        setLiveComments(response.comments || [])
      } catch (err) {
        console.error('Failed to load post comments', err)
        triggerToast('Failed to fetch live comments')
      } finally {
        setIsLoadingLive(false)
      }
    }

    loadLiveComments()
  }, [workspaceId, activePost?.id])

  // Actions
  const handleLikeComment = async (commentId: string, isCurrentlyLiked: boolean, cid?: string) => {
    if (!workspaceId) return;
    
    setActionLoadingId(commentId);
    setLiveComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          isLiked: !isCurrentlyLiked,
          likeCount: isCurrentlyLiked ? Math.max(0, c.likeCount - 1) : c.likeCount + 1
        }
      }
      return c
    }))

    try {
      if (isCurrentlyLiked) {
        await inboxApi.unlikeComment(workspaceId, commentId, cid)
      } else {
        await inboxApi.likeComment(workspaceId, commentId, cid)
      }
    } catch (err) {
      triggerToast('Failed to update like status')
    } finally {
      setActionLoadingId(null);
    }
  }

  const handleHideComment = async (commentId: string, isCurrentlyHidden: boolean) => {
    if (!workspaceId) return;

    setActionLoadingId(commentId);
    setLiveComments(prev => prev.map(c => {
      if (c.id === commentId) return { ...c, isHidden: !isCurrentlyHidden }
      return c
    }))

    try {
      if (isCurrentlyHidden) {
        await inboxApi.unhideComment(workspaceId, commentId)
        triggerToast('Comment unhidden')
      } else {
        await inboxApi.hideComment(workspaceId, commentId)
        triggerToast('Comment hidden')
      }
    } catch (err) {
      triggerToast('Failed to hide/unhide comment')
    } finally {
      setActionLoadingId(null);
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!workspaceId) return;
    
    setActionLoadingId(commentId);
    setLiveComments(prev => prev.filter(c => c.id !== commentId))
    
    try {
      await inboxApi.deleteComment(workspaceId, commentId)
      triggerToast('Comment deleted')
    } catch (err) {
      triggerToast('Failed to delete comment')
    } finally {
      setActionLoadingId(null);
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !workspaceId || !activePost) return
    const targetCommentId = replyingToCommentId || liveComments[0]?.id
    
    if (!targetCommentId) {
      triggerToast('No comment selected to reply to')
      return;
    }

    setIsReplying(true);
    try {
      await inboxApi.replyToComment(workspaceId, targetCommentId, replyText)
      triggerToast('Reply sent successfully!')
      setReplyText('')
      setReplyingToCommentId(null)
      
      const response = await inboxApi.getPostComments(workspaceId, activePost.id, activePost.zernioAccountId, { limit: 100 })
      setLiveComments(response.comments || [])
    } catch (err) {
      triggerToast('Failed to send reply')
    } finally {
      setIsReplying(false);
    }
  }

  const handlePrivateReply = async (commentId: string) => {
    if (!workspaceId) return;
    const msg = prompt("Enter private message:");
    if (!msg) return;

    setIsPrivateReplying(true);
    try {
      await inboxApi.sendPrivateReplyToComment(workspaceId, commentId, msg);
      triggerToast('Private message sent');
    } catch (err) {
      triggerToast('Failed to send private message');
    } finally {
      setIsPrivateReplying(false);
    }
  }

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
      const aHasReply = a.rawComments.some(c => c.authorName.toLowerCase() === 'you' || c.authorName === 'Syncra');
      const bHasReply = b.rawComments.some(c => c.authorName.toLowerCase() === 'you' || c.authorName === 'Syncra');
      if (aHasReply && !bHasReply) return 1;
      if (!aHasReply && bHasReply) return -1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    }
    return 0;
  });

  const uniqueAccounts = Array.from(new Set(posts.map(p => p.zernioAccountId).filter(Boolean)));

  return (
    <div className="comments-dashboard-theme w-full h-screen flex flex-col overflow-hidden bg-[var(--background)] text-[var(--on-surface)] font-sans antialiased">
      <style>{LOCAL_STYLE}</style>

      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 py-2 border-b border-[var(--outline-variant)] bg-[var(--surface)] shrink-0 h-16">
        <div className="flex items-center gap-6">
          <h1 className="font-bold text-2xl text-[var(--on-surface)]">Comments</h1>
          
          <div className="flex items-center gap-2">
            {/* Platform Filter Dropdown */}
            <div className="relative flex items-center">
              <select 
                className="appearance-none bg-transparent border border-[var(--outline-variant)] rounded pl-3 pr-8 py-1.5 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="all" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">All platforms</option>
                <option value="facebook" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Facebook</option>
                <option value="instagram" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Instagram</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--on-surface-variant)]" />
            </div>

            {/* Profile Filter Dropdown */}
            <div className="relative flex items-center">
              <select 
                className="appearance-none bg-transparent border border-[var(--outline-variant)] rounded pl-3 pr-8 py-1.5 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer"
                value={filterWorkspace}
                onChange={(e) => setFilterWorkspace(e.target.value)}
              >
                <option value="all" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">All profiles</option>
                <option value="main" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Main Store</option>
                <option value="outlet" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">Outlet</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--on-surface-variant)]" />
            </div>

            {/* Account Filter Dropdown */}
            <div className="relative flex items-center">
              <select 
                className="appearance-none bg-transparent border border-[var(--outline-variant)] rounded pl-3 pr-8 py-1.5 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors outline-none cursor-pointer"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
              >
                <option value="all" className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">All accounts</option>
                {uniqueAccounts.map(acc => (
                  <option key={acc} value={acc} className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)]">
                    Account: {acc.substring(0, 8)}...
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--on-surface-variant)]" />
            </div>
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
                <h2 className="font-semibold text-base text-[var(--on-surface)]">Comments ({liveComments.length})</h2>
                <button 
                  onClick={() => {
                    if (liveComments[0]?.url) {
                      window.open(liveComments[0].url, '_blank');
                    } else {
                      triggerToast("No post link available");
                    }
                  }}
                  className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors"
                >
                  <ExternalLink size={20} />
                </button>
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
                    {liveComments.map(c => (
                      <div
                        key={c.id}
                        className={`bg-[var(--surface-container-low)] rounded-xl p-4 border border-[var(--outline-variant)] transition-all ${c.isHidden ? 'opacity-50' : 'opacity-100'}`}
                      >
                        <div className="flex gap-3">
                          {c.fromPicture ? (
                            <img src={c.fromPicture} alt={c.fromName || 'User'} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] flex items-center justify-center shrink-0 text-[var(--on-primary-container)] font-bold text-sm">
                              {c.fromName?.[0] || '?'}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs text-[var(--on-surface)]">
                                {c.fromName || c.fromUsername || 'Unknown User'}
                              </span>
                              {c.fromIsOwner && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--surface-variant)] text-[var(--on-surface-variant)] font-semibold text-[9px] uppercase tracking-wider">You</span>
                              )}
                            </div>
                            
                            <p className="text-xs text-[var(--on-surface)] leading-normal whitespace-pre-wrap">{c.message}</p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[10px] text-[var(--on-surface-variant)]">
                              <span>{formatHanoiTime(c.createdTime)}</span>
                              
                              <div className="flex items-center gap-1">
                                {/* Like Button */}
                                <button
                                  onClick={() => handleLikeComment(c.id, c.isLiked, c.likeUri)}
                                  className={`hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)] ${c.isLiked ? 'text-[var(--primary)] font-semibold' : ''}`}
                                  disabled={actionLoadingId === c.id}
                                >
                                  {actionLoadingId === c.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <ThumbsUp size={12} />
                                  )}
                                  <span>{c.likeCount > 0 ? c.likeCount : 'Like'}</span>
                                </button>
                                
                                {/* Hide Button */}
                                {c.canHide && (
                                  <button 
                                    onClick={() => handleHideComment(c.id, c.isHidden)} 
                                    disabled={actionLoadingId === c.id}
                                    className="hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)]"
                                  >
                                    {actionLoadingId === c.id ? (
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
                                <button 
                                  onClick={() => handlePrivateReply(c.id)} 
                                  disabled={isPrivateReplying}
                                  className="hover:text-[var(--primary)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--surface-container-high)]"
                                >
                                  {isPrivateReplying ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <MessageSquare size={12} />
                                  )}
                                  <span>Private MSG</span>
                                </button>

                                {/* Delete Button */}
                                {c.canDelete && (
                                  <button 
                                    onClick={() => handleDeleteComment(c.id)} 
                                    className="hover:text-[var(--error)] hover:bg-[var(--error-container)] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded" 
                                    disabled={actionLoadingId === c.id}
                                  >
                                    {actionLoadingId === c.id ? (
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
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Box Footer Area */}
              <div className="p-4 border-t border-[var(--outline-variant)] bg-[var(--surface-bright)] shrink-0">
                <div className="relative max-w-4xl mx-auto flex items-end gap-3">
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
                      placeholder={replyingToCommentId ? 'Type your reply to comment...' : 'Write a comment...'}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={1}
                      className="w-full bg-transparent border-none outline-none resize-none text-xs text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 pr-12"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
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

      {/* Action Feedback Toast */}
      <div className={`fixed bottom-6 right-6 bg-[var(--on-surface)] text-[var(--background)] px-5 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all duration-300 z-50 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <CheckCircle2 size={16} className="text-green-500" />
        <span className="text-xs font-medium">{toastMessage}</span>
      </div>
    </div>
  )
}
