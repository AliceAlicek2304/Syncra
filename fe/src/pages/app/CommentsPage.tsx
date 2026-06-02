import { useState } from 'react'
import {
  Search, MoreVertical, Send, CheckCircle2,
  ThumbsUp, EyeOff, MessageSquare
} from 'lucide-react'
import styles from './CommentsPage.module.css'

interface Comment {
  id: string
  author: string
  avatar: string
  time: string
  text: string
  isPriority?: boolean
  likes: number
  liked?: boolean
  hidden?: boolean
}

interface Post {
  id: string
  title: string
  platform: 'facebook' | 'instagram'
  image: string
  time: string
  lastComment: string
  likes: string
  shares: string
  desc: string
  comments: Comment[]
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'p1',
    title: 'New sneaker model 2024',
    platform: 'facebook',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=240',
    time: '2d',
    lastComment: 'Do you have this in size 42? I want to order this orange pair.',
    likes: '1.2k',
    shares: '12',
    desc: 'Check out our latest collection of high-performance footwear for the modern athlete. Available in various sizes and colors.',
    comments: [
      {
        id: 'c1',
        author: 'John Smith',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
        time: '2 hours ago',
        text: 'Do you have this in size 42? I want to order this orange pair.',
        likes: 0,
        liked: false
      },
      {
        id: 'c2',
        author: 'Elena Gomez',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
        time: '3 hours ago',
        text: 'Received the goods, very beautiful form. Can you tell me how to clean this fabric?',
        isPriority: true,
        likes: 12,
        liked: true
      }
    ]
  },
  {
    id: 'p2',
    title: 'Workshop: Social Media Management',
    platform: 'instagram',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=240',
    time: '5h',
    lastComment: 'Is this workshop held online or offline? Please give me the registration link!',
    likes: '840',
    shares: '4',
    desc: 'Join our upcoming workshop on mastering social media algorithms and content strategies for 2026. Register now to save your spot!',
    comments: [
      {
        id: 'c3',
        author: 'Alex Carter',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        time: '5 hours ago',
        text: 'Is this workshop held online or offline? Please give me the registration link!',
        likes: 2,
        liked: false
      }
    ]
  }
]

export default function CommentsPage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [selectedPostId, setSelectedPostId] = useState('p1')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterWorkspace, setFilterWorkspace] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [replyText, setReplyText] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const activePost = posts.find(p => p.id === selectedPostId) || posts[0]

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => {
      setToastVisible(false)
    }, 3000)
  }

  const handleLikeComment = (commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === selectedPostId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              const liked = !c.liked
              return {
                ...c,
                liked,
                likes: liked ? c.likes + 1 : c.likes - 1
              }
            }
            return c
          })
        }
      }
      return p
    }))
  }

  const handleHideComment = (commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === selectedPostId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              const hidden = !c.hidden
              if (hidden) triggerToast('Comment hidden')
              return { ...c, hidden }
            }
            return c
          })
        }
      }
      return p
    }))
  }

  const handleSendReply = () => {
    if (!replyText.trim()) return
    triggerToast('Reply sent successfully!')
    setReplyText('')
  }

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.comments.some(c => c.text.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesPlatform = filterPlatform === 'all' || p.platform === filterPlatform
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
            <span>Conversations</span>
          </div>
          <div className={styles.listItems}>
            {filteredPosts.length === 0 ? (
              <div className={styles.emptyState}>No comments found</div>
            ) : (
              filteredPosts.map(p => (
                <button
                  key={p.id}
                  className={`${styles.postItem} ${p.id === selectedPostId ? styles.activePost : ''}`}
                  onClick={() => setSelectedPostId(p.id)}
                >
                  <div className={styles.postThumbWrapper}>
                    <img src={p.image} alt={p.title} className={styles.postThumb} />
                    <span className={`${styles.platformBadge} ${styles[p.platform]}`}>
                      {p.platform === 'facebook' ? 'F' : 'I'}
                    </span>
                  </div>
                  <div className={styles.postInfo}>
                    <div className={styles.postTop}>
                      <span className={styles.postTitle}>{p.title}</span>
                      <span className={styles.postTime}>{p.time}</span>
                    </div>
                    <p className={styles.postSnippet}>{p.lastComment}</p>
                    <div className={styles.commentsCount}>
                      <span className={styles.badge}>{p.comments.length}</span>
                      <span>Comments</span>
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
              {/* Detail Header */}
              <div className={styles.detailHeader}>
                <div className={styles.postSource}>
                  <div className={`${styles.platformCircle} ${styles[activePost.platform]}`}>
                    {activePost.platform === 'facebook' ? 'f' : 'in'}
                  </div>
                  <div>
                    <h3>{activePost.platform === 'facebook' ? 'Facebook Page' : 'Instagram Feed'}</h3>
                    <span>Posted {activePost.time} ago</span>
                  </div>
                </div>
                <button className={styles.moreBtn} title="More Actions">
                  <MoreVertical size={18} />
                </button>
              </div>

              {/* Main Post Box */}
              <div className={styles.detailBody}>
                <div className={styles.postCard}>
                  <img src={activePost.image} alt={activePost.title} className={styles.postCardImg} />
                  <div className={styles.postCardContent}>
                    <h2>{activePost.title}</h2>
                    <p>{activePost.desc}</p>
                    <div className={styles.postCardMeta}>
                      <span>❤️ {activePost.likes} Likes</span>
                      <span>💬 {activePost.comments.length} Comments</span>
                      <span>🔄 {activePost.shares} Shares</span>
                    </div>
                  </div>
                </div>

                {/* Comments Stream */}
                <div className={styles.commentsStream}>
                  <h4>All Comments ({activePost.comments.length})</h4>
                  <div className={styles.commentsList}>
                    {activePost.comments.map(c => (
                      <div
                        key={c.id}
                        className={`${styles.commentWrapper} ${c.hidden ? styles.hiddenComment : ''}`}
                      >
                        <img src={c.avatar} alt={c.author} className={styles.commentAvatar} />
                        <div className={styles.commentContent}>
                          <div className={`${styles.commentBubble} ${c.isPriority ? styles.priorityBubble : ''}`}>
                            <div className={styles.commentUserRow}>
                              <span className={styles.commentAuthor}>{c.author}</span>
                              {c.isPriority && (
                                <span className={styles.priorityBadge}>Priority</span>
                              )}
                              <span className={styles.commentTime}>{c.time}</span>
                            </div>
                            <p>{c.text}</p>
                          </div>
                          <div className={styles.commentActions}>
                            <button
                              onClick={() => handleLikeComment(c.id)}
                              className={c.liked ? styles.likedAction : ''}
                            >
                              <ThumbsUp size={14} />
                              <span>{c.likes > 0 ? c.likes : 'Like'}</span>
                            </button>
                            <button onClick={() => handleHideComment(c.id)}>
                              <EyeOff size={14} />
                              <span>{c.hidden ? 'Show' : 'Hide'}</span>
                            </button>
                            <button>
                              <MessageSquare size={14} />
                              <span>Private reply</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reply box footer */}
              <div className={styles.replyFooter}>
                <div className={styles.replyControls}>
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                    alt="Admin"
                    className={styles.adminAvatar}
                  />
                  <div className={styles.textareaWrapper}>
                    <textarea
                      placeholder={`Type your reply to ${activePost.comments[0]?.author || 'post'}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={1}
                    />
                    <button className={styles.replySendBtn} onClick={handleSendReply} title="Send Reply">
                      <Send size={16} />
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
