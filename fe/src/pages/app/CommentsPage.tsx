import { useState, useEffect } from 'react'
import {
  Search, Send, CheckCircle2,
  ThumbsUp, EyeOff, MessageSquare, Trash2, Loader2
} from 'lucide-react'
import styles from './CommentsPage.module.css'
import { useWorkspace } from '../../context/WorkspaceContext'
import { inboxApi, type InboxCommentDto, type ZernioPostCommentItemDto } from '../../api/inbox'

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
  return date.toLocaleDateString('en-GB', { timeZone: HANOI_TZ, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.lastComment.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = filterPlatform === 'all' || p.platform.toLowerCase() === filterPlatform.toLowerCase()
    return matchesSearch && matchesPlatform
  })

  return (
    <div className={styles.container}>
      {/* Search Header */}
      <header className={styles.header}>
        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} size={16} />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterField}>
            <label>Platform</label>
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="all">All</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div className={styles.filterField}>
            <label>Workspace</label>
            <select value={filterWorkspace} onChange={(e) => setFilterWorkspace(e.target.value)}>
              <option value="all">Main Store</option>
              <option value="outlet">Outlet</option>
            </select>
          </div>
          <div className={styles.filterField}>
            <label>Account</label>
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
              <option value="all">All Accounts</option>
              <option value="shop_admin">Shop Admin</option>
            </select>
          </div>
        </div>
        <div className={styles.sortField}>
          <label>Sort by</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="unanswered">Unanswered First</option>
          </select>
        </div>
      </div>

      {/* Master-Detail Body */}
      <div className={styles.grid}>
        {/* Left Column: List of posts */}
        <section className={styles.masterList}>
          <div className={styles.listHeader}>
            <span>Posts</span>
          </div>
          <div className={styles.listItems}>
            {isLoadingPosts ? (
              <div className={styles.emptyState}><Loader2 className="spinner" size={24}/> Loading posts...</div>
            ) : filteredPosts.length === 0 ? (
              <div className={styles.emptyState}>No comments found</div>
            ) : (
              filteredPosts.map(p => (
                <button
                  key={p.id}
                  className={`${styles.postItem} ${p.id === selectedPostId ? styles.activePost : ''}`}
                  onClick={() => setSelectedPostId(p.id)}
                >
                  <div className={styles.postThumbWrapper}>
                    {p.image ? (
                      <img src={p.image} alt={p.title} className={styles.postThumb} />
                    ) : (
                      <div className={styles.postThumbPlaceholder}></div>
                    )}
                    <span className={`${styles.platformBadge} ${styles[p.platform?.toLowerCase()] || ''}`}>
                      {p.platform?.toLowerCase() === 'facebook' ? 'F' : 'I'}
                    </span>
                  </div>
                  <div className={styles.postInfo}>
                    <div className={styles.postTop}>
                      <span className={styles.postTitle}>{p.title}</span>
                      <span className={styles.postTime}>{getShortTimeDiff(p.time)}</span>
                    </div>
                    <p className={styles.postSnippet}>{p.lastComment}</p>
                    <div className={styles.commentsCount}>
                      <span className={styles.badge}>{p.rawComments.length}</span>
                      <span>Notifications</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Post details & Comments list */}
        <section className={styles.detailView}>
          {activePost ? (
            <>
              {/* Main Post Box */}
              <div className={styles.detailBody}>
                <div className={styles.postCard}>
                  {activePost.image && <img src={activePost.image} alt={activePost.title} className={styles.postCardImg} />}
                  <div className={styles.postCardContent}>
                    <h2>{activePost.title}</h2>
                    <p>{activePost.desc}</p>
                  </div>
                </div>

                {/* Comments Stream */}
                <div className={styles.commentsStream}>
                  <h4>All Comments ({liveComments.length})</h4>
                  {isLoadingLive ? (
                    <div className={styles.emptyState}><Loader2 className="spinner" size={24}/> Fetching live comments...</div>
                  ) : (
                    <div className={styles.commentsList}>
                      {liveComments.map(c => (
                        <div
                          key={c.id}
                          className={`${styles.commentWrapper} ${c.isHidden ? styles.hiddenComment : ''}`}
                        >
                          {c.fromPicture ? (
                            <img src={c.fromPicture} alt={c.fromName || 'User'} className={styles.commentAvatar} />
                          ) : (
                            <div className={styles.commentAvatarPlaceholder}>{c.fromName?.[0] || '?'}</div>
                          )}
                          <div className={styles.commentContent}>
                            <div className={`${styles.commentBubble} ${c.fromIsOwner ? styles.priorityBubble : ''}`}>
                              <div className={styles.commentUserRow}>
                                <span className={styles.commentAuthor}>{c.fromName || c.fromUsername || 'Unknown User'}</span>
                                {c.fromIsOwner && (
                                  <span className={styles.priorityBadge}>Owner</span>
                                )}
                                <span className={styles.commentTime}>{formatHanoiTime(c.createdTime)}</span>
                              </div>
                              <p>{c.message}</p>
                            </div>
                            <div className={styles.commentActions}>
                              <button
                                onClick={() => handleLikeComment(c.id, c.isLiked, c.likeUri)}
                                className={c.isLiked ? styles.likedAction : ''}
                                disabled={actionLoadingId === c.id}
                              >
                                {actionLoadingId === c.id ? <Loader2 size={14} className={styles.spinner} /> : <ThumbsUp size={14} />}
                                <span>{c.likeCount > 0 ? c.likeCount : 'Like'}</span>
                              </button>
                              
                              {c.canHide && (
                                <button onClick={() => handleHideComment(c.id, c.isHidden)} disabled={actionLoadingId === c.id}>
                                  {actionLoadingId === c.id ? <Loader2 size={14} className={styles.spinner} /> : <EyeOff size={14} />}
                                  <span>{c.isHidden ? 'Unhide' : 'Hide'}</span>
                                </button>
                              )}
                              
                              <button onClick={() => {
                                setReplyingToCommentId(c.id);
                                document.getElementById('reply-input')?.focus();
                              }}>
                                <MessageSquare size={14} />
                                <span>Reply</span>
                              </button>

                              <button onClick={() => handlePrivateReply(c.id)} disabled={isPrivateReplying}>
                                {isPrivateReplying ? <Loader2 size={14} className={styles.spinner} /> : <MessageSquare size={14} />}
                                <span>Private MSG</span>
                              </button>

                              {c.canDelete && (
                                <button onClick={() => handleDeleteComment(c.id)} className={styles.deleteAction} disabled={actionLoadingId === c.id}>
                                  {actionLoadingId === c.id ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reply box footer */}
              <div className={styles.replyFooter}>
                <div className={styles.replyControls}>
                  <div className={styles.adminAvatarPlaceholder}>S</div>
                  <div className={styles.textareaWrapper}>
                    {replyingToCommentId && (
                      <div className={styles.replyingToIndicator}>
                        Replying to selected comment 
                        <button onClick={() => setReplyingToCommentId(null)}>×</button>
                      </div>
                    )}
                    <textarea
                      id="reply-input"
                      placeholder={replyingToCommentId ? 'Type your reply to comment...' : 'Write a comment...'}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={1}
                    />
                    <button className={styles.replySendBtn} onClick={handleSendReply} title="Send Reply" disabled={isReplying || !replyText.trim()}>
                      {isReplying ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noPostSelected}>
              <MessageSquare size={48} />
              <p>Select a conversation post to view comments</p>
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Feedback Toast */}
      <div className={`${styles.toast} ${toastVisible ? styles.toastVisible : ''}`}>
        <CheckCircle2 size={16} className={styles.toastIcon} />
        <span>{toastMessage}</span>
      </div>
    </div>
  )
}
