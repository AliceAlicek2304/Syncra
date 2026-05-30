import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, Search, X, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '../../api/posts'
import type { Post, PostMediaItem } from '../../api/posts'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import { useWorkspace } from '../../context/WorkspaceContext'
import styles from './ReusePostModal.module.css'

interface ReusePostModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (payload: { content?: string; mediaItems?: PostMediaItem[] }) => void
}

type SortOrder = 'newest' | 'oldest'
type ReuseTarget = 'content' | 'media'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const day = d.getDate()
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${month} ${day}, ${h12}:${minutes} ${ampm}`
}

function getDisplayPlatforms(post: Post): string[] {
  return Array.from(new Set(
    post.platforms?.length
      ? post.platforms
      : (post.platformTargets?.map(t => t.platform.toLowerCase()) || [])
  ))
}

export default function ReusePostModal({ isOpen, onClose, onApply }: ReusePostModalProps) {
  const { activeWorkspace } = useWorkspace()
  const [view, setView] = useState<'grid' | 'detail'>('grid')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [selectedUses, setSelectedUses] = useState<Set<ReuseTarget>>(new Set(['content']))
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['posts', activeWorkspace?.id, 'reuse'],
    queryFn: () => postsApi.getPosts(activeWorkspace?.id!, { page: 1, pageSize: 20 }),
    enabled: isOpen && !!activeWorkspace?.id,
  })

  const posts = useMemo(() => {
    if (!data?.items) return []
    let filtered = data.items

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        (p.content?.toLowerCase().includes(q)) ||
        (p.title?.toLowerCase().includes(q))
      )
    }

    filtered.sort((a, b) => {
      const da = new Date(a.createdAt).getTime()
      const db = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? db - da : da - db
    })

    return filtered
  }, [data?.items, searchQuery, sortOrder])

  const handlePostClick = useCallback((post: Post) => {
    setSelectedPost(post)
    setView('detail')
  }, [])

  const handleBack = useCallback(() => {
    setView('grid')
    setSelectedPost(null)
    setSelectedUses(new Set(['content']))
  }, [])

  const toggleUse = useCallback((target: ReuseTarget) => {
    setSelectedUses(prev => {
      const next = new Set(prev)
      if (next.has(target)) {
        next.delete(target)
      } else {
        next.add(target)
      }
      if (next.size === 0) next.add('content')
      return next
    })
  }, [])

  const handleApply = useCallback(() => {
    if (!selectedPost) return
    const payload: { content?: string; mediaItems?: PostMediaItem[] } = {}
    if (selectedUses.has('content')) {
      payload.content = selectedPost.content || ''
    }
    if (selectedUses.has('media') && selectedPost.mediaItems?.length) {
      payload.mediaItems = selectedPost.mediaItems
    }
    onApply(payload)
    onClose()
  }, [selectedPost, selectedUses, onApply, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Reuse previous post"
        onMouseDown={e => e.stopPropagation()}
      >
        {view === 'grid' ? (
          <>
            {/* ── Grid Header ── */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h2 className={styles.headerTitle}>Reuse previous post</h2>
                <p className={styles.headerSubtitle}>Pick a post to reuse its content or media.</p>
              </div>
              <div className={styles.headerRight}>
                <div className={styles.searchBox}>
                  <Search size={15} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                  {searchQuery && (
                    <button type="button" className={styles.searchClear} onClick={() => setSearchQuery('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className={styles.sortWrapper}>
                  <button
                    type="button"
                    className={styles.sortBtn}
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  >
                    {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.sortChevron}>
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {sortDropdownOpen && (
                    <div className={styles.sortDropdown}>
                      <button
                        type="button"
                        className={`${styles.sortOption} ${sortOrder === 'newest' ? styles.sortOptionActive : ''}`}
                        onClick={() => { setSortOrder('newest'); setSortDropdownOpen(false) }}
                      >
                        Newest
                      </button>
                      <button
                        type="button"
                        className={`${styles.sortOption} ${sortOrder === 'oldest' ? styles.sortOptionActive : ''}`}
                        onClick={() => { setSortOrder('oldest'); setSortDropdownOpen(false) }}
                      >
                        Oldest
                      </button>
                    </div>
                  )}
                </div>
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Grid Body ── */}
            <div className={styles.gridBody}>
              {isLoading ? (
                <div className={styles.emptyState}>Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className={styles.emptyState}>
                  {searchQuery ? 'No posts match your search.' : 'No posts found.'}
                </div>
              ) : (
                <div className={styles.grid}>
                  {posts.map(post => {
                    const platforms = getDisplayPlatforms(post)
                    const thumbnail = post.mediaItems?.[0]
                    return (
                      <button
                        key={post.id}
                        type="button"
                        className={styles.postCard}
                        onClick={() => handlePostClick(post)}
                      >
                        <div className={styles.cardContent}>
                          <div className={styles.cardInfo}>
                            <p className={styles.cardTitle}>{post.content || post.title}</p>
                            <div className={styles.cardPlatforms}>
                              {platforms.map((p, i) => (
                                <span key={i} className={styles.platformBadge}>
                                  <ExtendedPlatformIcon platform={p} size={14} />
                                  <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                </span>
                              ))}
                            </div>
                            <span className={styles.cardDate}>{formatDate(post.createdAt)}</span>
                          </div>
                          {thumbnail && (
                            <div className={styles.cardThumb}>
                              <img src={thumbnail.url} alt="" className={styles.cardThumbImg} />
                              {(post.mediaItems?.length ?? 0) > 1 && (
                                <span className={styles.mediaCount}>{post.mediaItems!.length}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* ── Detail Header ── */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <button type="button" className={styles.backBtn} onClick={handleBack}>
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h2 className={styles.headerTitle}>Post details</h2>
                  <p className={styles.headerSubtitle}>Select what you want to reuse from this post.</p>
                </div>
              </div>
              <div className={styles.headerRight}>
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Detail Body ── */}
            {selectedPost && (
              <div className={styles.detailBody}>
                <div className={styles.detailContent}>
                  {/* Content Preview */}
                  {selectedUses.has('content') && selectedPost.content && (
                    <div className={styles.detailSection}>
                      <h3 className={styles.detailSectionTitle}>Content</h3>
                      <p className={styles.detailText}>{selectedPost.content}</p>
                      {selectedPost.platformContents && selectedPost.platformContents.length > 0 && (
                        <div className={styles.platformContents}>
                          {selectedPost.platformContents.map((pc, i) => (
                            <div key={i} className={styles.platformContentItem}>
                              <div className={styles.platformContentHeader}>
                                <ExtendedPlatformIcon platform={pc.platform} size={14} />
                                <span className={styles.platformContentName}>
                                  {pc.platform.charAt(0).toUpperCase() + pc.platform.slice(1)}
                                </span>
                              </div>
                              <p className={styles.platformContentCaption}>{pc.caption}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Media Preview */}
                  {selectedUses.has('media') && selectedPost.mediaItems && selectedPost.mediaItems.length > 0 && (
                    <div className={styles.detailSection}>
                      <h3 className={styles.detailSectionTitle}>Media</h3>
                      <div className={styles.mediaGrid}>
                        {selectedPost.mediaItems.map((m, i) => (
                          <div key={i} className={styles.mediaPreview}>
                            {m.type === 'video' ? (
                              <video src={m.url} className={styles.mediaPreviewItem} controls={false} muted />
                            ) : (
                              <img src={m.url} alt={m.filename || ''} className={styles.mediaPreviewItem} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback when nothing selected for preview */}
                  {!selectedUses.has('content') && !selectedUses.has('media') && (
                    <div className={styles.emptyState}>Select what to reuse below.</div>
                  )}
                </div>

                {/* ── What to use ── */}
                <div className={styles.whatToUse}>
                  <h3 className={styles.whatToUseTitle}>What to use</h3>
                  <p className={styles.whatToUseDesc}>Choose what you want to reuse from this post.</p>

                  <div className={styles.useOptions}>
                    <button
                      type="button"
                      className={`${styles.useOption} ${selectedUses.has('content') ? styles.useOptionActive : ''}`}
                      onClick={() => toggleUse('content')}
                    >
                      <div className={styles.useCheckbox}>
                        {selectedUses.has('content') && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className={styles.useOptionMeta}>
                        <span className={styles.useOptionLabel}>Content</span>
                        <span className={styles.useOptionDesc}>Caption text</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`${styles.useOption} ${selectedUses.has('media') ? styles.useOptionActive : ''}`}
                      onClick={() => toggleUse('media')}
                    >
                      <div className={styles.useCheckbox}>
                        {selectedUses.has('media') && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className={styles.useOptionMeta}>
                        <span className={styles.useOptionLabel}>Media</span>
                        <span className={styles.useOptionDesc}>Images &amp; videos</span>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.applyBtn}
                    onClick={handleApply}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
