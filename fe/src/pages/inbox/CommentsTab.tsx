import { useState, useCallback, useMemo } from 'react';
import {
  MessageCircle,
  ArrowLeft,
  Loader2,
  Send,
  ThumbsUp,
  EyeOff,
  Trash2,
  ExternalLink,
  Smile,
} from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxCommentDto } from '../../api/inbox';
import { formatDateTime, getInitials, stringToColor } from './utils';
import { useToast } from '../../context/ToastContext';
import styles from './InboxPage.module.css';

interface CommentsTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
  search?: string;
  unreadOnly?: boolean;
}

function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'facebook': return 'f';
    case 'instagram': return 'i';
    case 'twitter': return 'x';
    case 'bluesky': return 'b';
    case 'reddit': return 'r';
    case 'threads': return 't';
    case 'youtube': return 'y';
    case 'linkedin': return 'l';
    default: return platform[0];
  }
}

function getPlatformClass(platform: string): string {
  switch (platform) {
    case 'facebook': return styles.bgFacebook;
    case 'instagram': return styles.bgInstagram;
    case 'twitter': return styles.bgTwitter;
    case 'bluesky': return styles.bgBluesky;
    case 'threads': return styles.bgThreads;
    case 'reddit': return styles.bgReddit;
    case 'youtube': return styles.bgYoutube;
    case 'linkedin': return styles.bgLinkedin;
    default: return '';
  }
}

function CommentListItem({
  comment,
  isSelected,
  onClick,
}: {
  comment: InboxCommentDto;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''} ${!comment.isRead ? styles.listItemUnread : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatarWrap}>
        {comment.authorPicture ? (
          <img src={comment.authorPicture} alt="" className={styles.avatar} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            style={{ background: stringToColor(comment.authorName) }}
          >
            {getInitials(comment.authorName)}
          </div>
        )}
        <span className={`${styles.platformBadge} ${getPlatformClass(comment.platform)}`}>
          {getPlatformIcon(comment.platform)}
        </span>
      </div>
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{comment.authorName}</span>
          <span className={styles.itemTime}>{formatDateTime(comment.receivedAtUtc)}</span>
        </div>
        <div className={styles.itemPreview}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {comment.bodyText}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CommentDetailProps {
  comment: InboxCommentDto;
  onSendReply: (message: string) => Promise<void>;
  onLike: (commentId: string, postId: string, currentlyLiked: boolean) => Promise<void>;
  onHide: (commentId: string, postId: string, currentlyHidden: boolean) => Promise<void>;
  onDelete: (commentId: string, postId: string) => Promise<void>;
  onPrivateReply: (commentId: string, postId: string, message: string) => Promise<void>;
  onBack: () => void;
  replies: any[];
}

function CommentDetail({
  comment,
  onSendReply,
  onLike,
  onHide,
  onDelete,
  onPrivateReply,
  onBack,
  replies,
}: CommentDetailProps) {
  const { success: toastSuccess } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Private reply state
  const [showPrivateReplyModal, setShowPrivateReplyModal] = useState(false);
  const [privateReplyDraft, setPrivateReplyDraft] = useState('');
  const [sendingPrivateReply, setSendingPrivateReply] = useState(false);

  // Local state modifiers for parent comment
  const [isLiked, setIsLiked] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isFacebook = comment.platform === 'facebook';

  // Platform capabilities matrix checks
  const supportsLikes = useMemo(() => {
    return !['instagram', 'threads', 'youtube', 'linkedin'].includes(comment.platform);
  }, [comment.platform]);

  const supportsHiding = useMemo(() => {
    return !['bluesky', 'reddit', 'youtube', 'linkedin'].includes(comment.platform);
  }, [comment.platform]);

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await onSendReply(draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  }, [draft, onSendReply]);

  const handleLikeToggle = async () => {
    if (!supportsLikes) return;
    const nextVal = !isLiked;
    setIsLiked(nextVal);
    await onLike(comment.id, comment.zernioPostId ?? 'mock-post-id', !nextVal);
  };

  const handleHideToggle = async () => {
    if (!supportsHiding) return;
    const nextVal = !isHidden;
    setIsHidden(nextVal);
    await onHide(comment.id, comment.zernioPostId ?? 'mock-post-id', !nextVal);
  };

  const handleDelete = async () => {
    await onDelete(comment.id, comment.zernioPostId ?? 'mock-post-id');
    setShowDeleteConfirm(false);
  };

  const handleSendPrivateReply = async () => {
    if (!privateReplyDraft.trim()) return;
    setSendingPrivateReply(true);
    try {
      await onPrivateReply(comment.id, comment.zernioPostId ?? 'mock-post-id', privateReplyDraft.trim());
      setPrivateReplyDraft('');
      setShowPrivateReplyModal(false);
    } finally {
      setSendingPrivateReply(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.headerInfo}>
          <button className={styles.backBtn} onClick={onBack} title="Back">
            <ArrowLeft size={16} />
          </button>
          <div className={styles.avatarWrap} style={{ width: 36, height: 36 }}>
            {comment.authorPicture ? (
              <img src={comment.authorPicture} alt="" className={styles.avatar} style={{ width: 36, height: 36 }} />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ width: 36, height: 36, background: stringToColor(comment.authorName) }}
              >
                {getInitials(comment.authorName)}
              </div>
            )}
            <span className={`${styles.platformBadge} ${getPlatformClass(comment.platform)}`} style={{ width: 14, height: 14, fontSize: 8 }}>
              {getPlatformIcon(comment.platform)}
            </span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerTitle}>{comment.authorName}</span>
            <span className={styles.headerSubtitle}>
              {comment.platform} Comment {comment.authorUsername ? `@${comment.authorUsername}` : ''}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn}>
            Archive
          </button>
          <button className={`${styles.actionBtn} ${styles.actionBtnActive}`}>
            Resolve
          </button>
        </div>
      </div>

      {/* Main Comment detail panel */}
      <div className={styles.listScroll} style={{ padding: '20px' }}>
        {/* Post Context Preview Card */}
        {(comment.postPreviewCaption || comment.postPreviewThumbnailUrl) && (
          <div className={styles.postPreviewCard}>
            {comment.postPreviewThumbnailUrl && (
              <img
                src={comment.postPreviewThumbnailUrl}
                alt="Post preview"
                className={styles.postThumbnail}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
                ORIGINAL POST CONTEXT
              </div>
              <div className={styles.postCaption}>{comment.postPreviewCaption || 'Untitled post'}</div>
            </div>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); toastSuccess('Redirecting to post URL...'); }}
              className={styles.commentActionBtn}
              style={{ padding: 4 }}
              title="Open Post"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* The Comment Block */}
        <div className={styles.commentBlock}>
          {/* Main Parent Comment */}
          <div className={styles.commentCard} style={{ opacity: isHidden ? 0.5 : 1 }}>
            <div className={styles.avatarWrap} style={{ width: 32, height: 32 }}>
              {comment.authorPicture ? (
                <img src={comment.authorPicture} alt="" className={styles.avatar} style={{ width: 32, height: 32 }} />
              ) : (
                <div
                  className={styles.avatarPlaceholder}
                  style={{ width: 32, height: 32, fontSize: 12, background: stringToColor(comment.authorName) }}
                >
                  {getInitials(comment.authorName)}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.itemName}>{comment.authorName}</span>
                <span className={styles.itemTime}>{formatDateTime(comment.receivedAtUtc)}</span>
              </div>
              <div className={styles.detailBody} style={{ marginTop: 4, color: 'var(--text-primary)' }}>
                {comment.bodyText}
              </div>

              {/* Action Toolbar */}
              <div className={styles.commentActionsRow}>
                {supportsLikes && (
                  <button
                    className={`${styles.commentActionBtn} ${isLiked ? styles.commentActionBtnActive : ''}`}
                    onClick={handleLikeToggle}
                  >
                    <ThumbsUp size={12} /> {isLiked ? 'Liked' : 'Like'}
                  </button>
                )}
                {supportsHiding && (
                  <button
                    className={`${styles.commentActionBtn} ${isHidden ? styles.commentActionBtnActive : ''}`}
                    onClick={handleHideToggle}
                  >
                    <EyeOff size={12} /> {isHidden ? 'Hidden' : 'Hide'}
                  </button>
                )}
                <button
                  className={styles.commentActionBtn}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={12} /> Delete
                </button>

                {isFacebook && (
                  <button
                    className={styles.commentActionBtn}
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setShowPrivateReplyModal(true)}
                  >
                    <span className={styles.badgePrivateReply}>Send Private Reply</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Comment Replies Tree */}
          {replies.length > 0 && (
            <div className={styles.commentReplies}>
              {replies.map((rep) => (
                <div key={rep.id} className={styles.commentCard}>
                  <div className={styles.avatarWrap} style={{ width: 28, height: 28 }}>
                    <div
                      className={styles.avatarPlaceholder}
                      style={{ width: 28, height: 28, fontSize: 11, background: stringToColor(rep.authorName) }}
                    >
                      {getInitials(rep.authorName)}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.itemName} style={{ fontSize: 13 }}>{rep.authorName}</span>
                      <span className={styles.itemTime}>{formatDateTime(rep.receivedAtUtc)}</span>
                    </div>
                    <div className={styles.detailBody} style={{ fontSize: 13, marginTop: 4, color: 'var(--text-primary)' }}>
                      {rep.bodyText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply input */}
      <div className={styles.replyArea}>
        {showEmojiPicker && (
          <div className={styles.emojiPopover}>
            <div className={styles.emojiGrid}>
              {['😀', '😂', '🔥', '👍', '🙏', '❤️', '🎉', '💡', '🚀', '✨', '👏', '👀'].map((emoji) => (
                <button
                  key={emoji}
                  className={styles.emojiBtn}
                  onClick={() => {
                    setDraft((p) => p + emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.inputControlsRow}>
          <button
            className={styles.toolbarBtn}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Add emoji"
          >
            <Smile size={18} />
          </button>

          <div className={styles.inputFieldWrapper}>
            <textarea
              className={styles.replyInput}
              rows={1}
              placeholder="Write a reply..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
            disabled={!draft.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Delete Comment</h3>
            <p className={styles.modalBody}>
              Are you sure you want to delete this comment? This action is permanent and cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalCancel}`} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className={`${styles.modalBtn} ${styles.modalConfirm}`} style={{ background: '#ef4444' }} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facebook Send Private Reply Modal */}
      {showPrivateReplyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Send Private Reply (DM)</h3>
            <p className={styles.modalBody}>
              This will send a direct message in Messenger to <strong>{comment.authorName}</strong> in response to their public comment.
            </p>
            <textarea
              className={styles.replyInput}
              rows={3}
              placeholder="Type your private Messenger reply..."
              value={privateReplyDraft}
              onChange={(e) => setPrivateReplyDraft(e.target.value)}
              style={{ width: '100%', marginBottom: 16 }}
            />
            <div className={styles.modalActions}>
              <button
                className={`${styles.modalBtn} ${styles.modalCancel}`}
                disabled={sendingPrivateReply}
                onClick={() => setShowPrivateReplyModal(false)}
              >
                Cancel
              </button>
              <button
                className={`${styles.modalBtn} ${styles.modalConfirm}`}
                disabled={!privateReplyDraft.trim() || sendingPrivateReply}
                onClick={handleSendPrivateReply}
              >
                {sendingPrivateReply ? <Loader2 size={14} className={styles.spinner} /> : 'Send Private Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CommentsTab({ workspaceId, platform, accountId, search, unreadOnly }: CommentsTabProps) {
  const {
    comments,
    markCommentRead,
    replyToComment,
    likeComment,
    unlikeComment,
    hideComment,
    unhideComment,
    deleteComment,
    sendPrivateReply,
  } = useInbox({ workspaceId, platform, accountId });

  const [selectedComment, setSelectedComment] = useState<InboxCommentDto | null>(null);

  // Simulated replies state for active thread
  const [replies, setReplies] = useState<any[]>([]);

  const commentList = useMemo(
    () => comments.data?.pages.flatMap((p) => p.items) ?? [],
    [comments.data],
  );

  // Filter list client-side based on search queries and read/unread flags
  const filteredCommentList = useMemo(() => {
    let list = commentList;

    if (unreadOnly) {
      list = list.filter((c) => !c.isRead);
    }

    if (search?.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.authorName?.toLowerCase().includes(q) ||
          c.bodyText?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [commentList, search, unreadOnly]);

  const handleSelect = useCallback(
    (comment: InboxCommentDto) => {
      setSelectedComment(comment);
      // Reset replies to initial mock or load
      setReplies([
        {
          id: 'rep-mock-1',
          authorName: 'Support Bot',
          bodyText: 'We have received your comment and are processing it.',
          receivedAtUtc: new Date(new Date(comment.receivedAtUtc).getTime() + 60000).toISOString(),
        },
      ]);

      if (!comment.isRead) {
        void markCommentRead(comment.id);
      }
    },
    [markCommentRead],
  );

  const handleSendReply = useCallback(
    async (message: string) => {
      if (!selectedComment) return;
      await replyToComment({ commentId: selectedComment.id, message });

      // Add to local replies tree
      setReplies((prev) => [
        ...prev,
        {
          id: `rep-sent-${Date.now()}`,
          authorName: 'Syncra Agent',
          bodyText: message,
          receivedAtUtc: new Date().toISOString(),
        },
      ]);
    },
    [selectedComment, replyToComment],
  );

  const handleLike = useCallback(
    async (commentId: string, postId: string, currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await unlikeComment({ postId, commentId });
      } else {
        await likeComment({ postId, commentId });
      }
    },
    [likeComment, unlikeComment]
  );

  const handleHide = useCallback(
    async (commentId: string, postId: string, currentlyHidden: boolean) => {
      if (currentlyHidden) {
        await unhideComment({ postId, commentId });
      } else {
        await hideComment({ postId, commentId });
      }
    },
    [hideComment, unhideComment]
  );

  const handleDeleteComment = useCallback(
    async (_commentId: string, postId: string) => {
      await deleteComment({ postId });
      setSelectedComment(null);
    },
    [deleteComment]
  );

  const handlePrivateReply = useCallback(
    async (commentId: string, postId: string, message: string) => {
      await sendPrivateReply({ postId, commentId, message });
    },
    [sendPrivateReply]
  );

  const handleBack = useCallback(() => {
    setSelectedComment(null);
    setReplies([]);
  }, []);

  if (comments.isLoading) {
    return (
      <div className={styles.emptyState}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Loading comments...</span>
      </div>
    );
  }

  return (
    <div className={styles.masterDetail}>
      {/* Left panel: comment list */}
      <div className={styles.masterPanel}>
        <div className={styles.listHeader}>
          <span>COMMENTS ({filteredCommentList.length})</span>
        </div>
        <div className={styles.listScroll}>
          {filteredCommentList.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageCircle size={28} />
              <span>No comments match filters</span>
            </div>
          ) : (
            filteredCommentList.map((c) => (
              <CommentListItem
                key={c.id}
                comment={c}
                isSelected={selectedComment?.id === c.id}
                onClick={() => handleSelect(c)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: detail comment */}
      <div className={styles.detailPanel}>
        {selectedComment ? (
          <CommentDetail
            comment={selectedComment}
            onSendReply={handleSendReply}
            onLike={handleLike}
            onHide={handleHide}
            onDelete={handleDeleteComment}
            onPrivateReply={handlePrivateReply}
            onBack={handleBack}
            replies={replies}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <MessageCircle size={36} className={styles.emptyIcon} />
            <span>Select a comment to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}
