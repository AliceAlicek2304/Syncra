import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Share2,
} from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxCommentDto } from '../../api/inbox';
import { formatDateTime, getInitials, stringToColor, mapPlatformToIconKey } from './utils';
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons';
import { useToast } from '../../context/ToastContext';
import styles from './InboxPage.module.css';

interface CommentsTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
  search?: string;
  unreadOnly?: boolean;
}

interface PostGroup {
  id: string;
  caption: string;
  thumbnailUrl: string;
  platform: string;
  comments: InboxCommentDto[];
  unreadCount: number;
  updatedAt: string;
}

function PostListItem({
  post,
  isSelected,
  onClick,
}: {
  post: PostGroup;
  isSelected: boolean;
  onClick: () => void;
}) {
  const latestComment = post.comments[0];

  return (
    <div
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''} ${post.unreadCount > 0 ? styles.listItemUnread : ''}`}
      onClick={onClick}
      style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}
    >
      <div className={styles.avatarWrap} style={{ width: 44, height: 44, position: 'relative', flexShrink: 0 }}>
        {post.thumbnailUrl ? (
          <img src={post.thumbnailUrl} alt="" className={styles.avatar} style={{ width: 44, height: 44, borderRadius: '6px', objectFit: 'cover' }} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            style={{ width: 44, height: 44, borderRadius: '6px', background: 'var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <MessageCircle size={18} style={{ color: 'var(--clr-body-mid)' }} />
          </div>
        )}
        <span className={styles.platformBadge} style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: '1px' }}>
          <ExtendedPlatformIcon platform={mapPlatformToIconKey(post.platform)} size={12} />
        </span>
      </div>
      <div className={styles.itemBody} style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.itemHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
          <span className={styles.itemName} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--clr-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', flex: 1, marginRight: '8px' }}>
            {post.caption}
          </span>
          <span className={styles.itemTime} style={{ fontSize: '11px', color: 'var(--clr-body-mid)', whiteSpace: 'nowrap' }}>
            {formatDateTime(post.updatedAt)}
          </span>
        </div>
        {latestComment && (
          <div className={styles.itemPreview} style={{ fontSize: '12px', color: 'var(--clr-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, color: 'var(--clr-ink-soft)' }}>{latestComment.authorName}: </span>
            {latestComment.bodyText}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {post.unreadCount > 0 && (
            <span className={styles.badgeUnreadCount} style={{ margin: 0, padding: '0 5px', height: '15px', minWidth: '15px', fontSize: '10px' }}>
              {post.unreadCount}
            </span>
          )}
          <span style={{ fontSize: '10px', color: 'var(--clr-body-mid)', fontWeight: 500 }}>
            {post.comments.length} comment{post.comments.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MockReply {
  id: string;
  authorName: string;
  bodyText: string;
  receivedAtUtc: string;
}

interface CommentRowProps {
  comment: InboxCommentDto;
  isActive: boolean;
  onSelect: () => void;
  onLike: (commentId: string, postId: string, currentlyLiked: boolean) => Promise<void>;
  onHide: (commentId: string, postId: string, currentlyHidden: boolean) => Promise<void>;
  onDelete: (commentId: string, postId: string) => Promise<void>;
  onPrivateReply: (commentId: string, postId: string) => void;
  replies: MockReply[];
}

function CommentRow({
  comment,
  isActive,
  onSelect,
  onLike,
  onHide,
  onDelete,
  onPrivateReply,
  replies,
}: CommentRowProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supportsLikes = useMemo(() => {
    return !['instagram', 'threads', 'youtube', 'linkedin'].includes(comment.platform);
  }, [comment.platform]);

  const supportsHiding = useMemo(() => {
    return !['bluesky', 'reddit', 'youtube', 'linkedin'].includes(comment.platform);
  }, [comment.platform]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supportsLikes) return;
    const next = !isLiked;
    setIsLiked(next);
    await onLike(comment.id, comment.zernioPostId ?? 'mock-post-id', !next);
  };

  const handleHideClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supportsHiding) return;
    const next = !isHidden;
    setIsHidden(next);
    await onHide(comment.id, comment.zernioPostId ?? 'mock-post-id', !next);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(comment.id, comment.zernioPostId ?? 'mock-post-id');
    setShowDeleteConfirm(false);
  };

  const handlePrivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPrivateReply(comment.id, comment.zernioPostId ?? 'mock-post-id');
  };

  const handleRowClick = () => {
    onSelect();
  };

  // Add simulated priority badge for UI aesthetics
  const isPriority = comment.zernioTopCommentId === null && comment.id.charCodeAt(0) % 2 === 0;

  return (
    <div style={{ display: 'flex', gap: '12px', opacity: isHidden ? 0.5 : 1 }}>
      <div className={styles.avatarWrap} style={{ width: 36, height: 36, flexShrink: 0 }}>
        {comment.authorPicture ? (
          <img src={comment.authorPicture} alt="" className={styles.avatar} style={{ width: 36, height: 36 }} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            style={{ width: 36, height: 36, fontSize: '13px', background: stringToColor(comment.authorName) }}
          >
            {getInitials(comment.authorName)}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={handleRowClick}
          className={`${styles.commentCard} ${isActive ? styles.listItemSelected : ''}`}
          style={{
            background: 'white',
            padding: '12px',
            borderRadius: '12px',
            border: isActive ? '1px solid var(--clr-primary)' : '1px solid var(--clr-border)',
            boxShadow: '0 1px 3px rgba(32, 21, 21, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.itemName} style={{ fontSize: '13px', fontWeight: 600 }}>{comment.authorName}</span>
              {isPriority && (
                <span className={styles.badgePriority} style={{ background: '#ffdbd0', color: '#a93100', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Priority
                </span>
              )}
            </div>
            <span className={styles.itemTime} style={{ fontSize: '11px', color: 'var(--clr-body-mid)' }}>{formatDateTime(comment.receivedAtUtc)}</span>
          </div>
          <p className={styles.detailBody} style={{ fontSize: '13px', color: 'var(--clr-ink-soft)', lineHeight: 1.5, margin: 0 }}>
            {comment.bodyText}
          </p>
        </div>

        {/* Comment Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '6px', paddingLeft: '4px' }}>
          {supportsLikes && (
            <button
              onClick={handleLikeClick}
              className={`${styles.commentActionBtn} ${isLiked ? styles.commentActionBtnActive : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: isLiked ? 'var(--clr-primary)' : 'var(--clr-body-mid)', fontWeight: 600 }}
            >
              <ThumbsUp size={12} /> {isLiked ? 'Liked' : 'Like'}
            </button>
          )}
          {supportsHiding && (
            <button
              onClick={handleHideClick}
              className={`${styles.commentActionBtn} ${isHidden ? styles.commentActionBtnActive : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-body-mid)' }}
            >
              <EyeOff size={12} /> {isHidden ? 'Hidden' : 'Hide'}
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className={styles.commentActionBtn}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-body-mid)' }}
          >
            <Trash2 size={12} /> Delete
          </button>
          {comment.platform === 'facebook' && (
            <button
              onClick={handlePrivateClick}
              className={styles.commentActionBtn}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-primary)', fontWeight: 600, marginLeft: 'auto' }}
            >
              Private reply
            </button>
          )}
        </div>

        {/* Delete Confirm inline popover */}
        {showDeleteConfirm && (
          <div style={{ background: 'var(--clr-canvas-soft)', border: '1px solid var(--clr-border)', padding: '8px 12px', borderRadius: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--clr-ink-soft)' }}>Delete this comment permanently?</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                style={{ fontSize: '11px', background: 'none', border: 'none', padding: '2px 8px', cursor: 'pointer', color: 'var(--clr-body-mid)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ fontSize: '11px', background: 'var(--clr-primary)', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Comment Replies Tree (Only for active comment) */}
        {isActive && replies.length > 0 && (
          <div className={styles.commentReplies} style={{ marginLeft: '16px', borderLeft: '2px solid var(--clr-border)', paddingLeft: '16px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {replies.map((rep) => (
              <div key={rep.id} style={{ display: 'flex', gap: '8px' }}>
                <div className={styles.avatarWrap} style={{ width: 28, height: 28, flexShrink: 0 }}>
                  <div
                    className={styles.avatarPlaceholder}
                    style={{ width: 28, height: 28, fontSize: '10px', background: stringToColor(rep.authorName) }}
                  >
                    {getInitials(rep.authorName)}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, background: 'var(--clr-canvas-soft)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--clr-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span className={styles.itemName} style={{ fontSize: '12px', fontWeight: 600 }}>{rep.authorName}</span>
                    <span className={styles.itemTime} style={{ fontSize: '10px', color: 'var(--clr-body-mid)' }}>{formatDateTime(rep.receivedAtUtc)}</span>
                  </div>
                  <p className={styles.detailBody} style={{ fontSize: '12px', color: 'var(--clr-body)', margin: 0 }}>
                    {rep.bodyText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PostDetailProps {
  post: PostGroup;
  activeComment: InboxCommentDto | null;
  onSelectComment: (comment: InboxCommentDto) => void;
  onSendReply: (commentId: string, message: string) => Promise<void>;
  onLike: (commentId: string, postId: string, currentlyLiked: boolean) => Promise<void>;
  onHide: (commentId: string, postId: string, currentlyHidden: boolean) => Promise<void>;
  onDelete: (commentId: string, postId: string) => Promise<void>;
  onPrivateReply: (commentId: string, postId: string, message: string) => Promise<void>;
  onBack: () => void;
  replies: MockReply[];
}

function PostDetail({
  post,
  activeComment,
  onSelectComment,
  onSendReply,
  onLike,
  onHide,
  onDelete,
  onPrivateReply,
  onBack,
  replies,
}: PostDetailProps) {
  const { success: toastSuccess } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Private reply modal
  const [privateReplyTarget, setPrivateReplyTarget] = useState<string | null>(null);
  const [privateReplyDraft, setPrivateReplyDraft] = useState('');
  const [sendingPrivateReply, setSendingPrivateReply] = useState(false);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !activeComment) return;
    setSending(true);
    try {
      await onSendReply(activeComment.id, draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  }, [draft, activeComment, onSendReply]);

  const handleSendPrivateReply = async () => {
    if (!privateReplyDraft.trim() || !privateReplyTarget || !activeComment) return;
    setSendingPrivateReply(true);
    try {
      await onPrivateReply(activeComment.id, post.id, privateReplyDraft.trim());
      setPrivateReplyDraft('');
      setPrivateReplyTarget(null);
    } finally {
      setSendingPrivateReply(false);
    }
  };

  const handlePrivateReplyTrigger = (commentId: string) => {
    setPrivateReplyTarget(commentId);
  };

  return (
    <>
      {/* Header */}
      <div className={styles.detailHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-canvas)', zIndex: 10 }}>
        <div className={styles.headerInfo} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className={styles.backBtn} onClick={onBack} title="Back" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '12px', border: '1px solid var(--clr-border)', background: 'var(--clr-canvas)', cursor: 'pointer', marginRight: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div className={styles.headerMeta}>
            <span className={styles.headerTitle} style={{ fontSize: '15px', fontWeight: 700, color: 'var(--clr-ink)' }}>
              {post.platform.toUpperCase()} Post Context
            </span>
            <span className={styles.headerSubtitle} style={{ fontSize: '12px', color: 'var(--clr-body-mid)' }}>
              Posted on {post.platform} • Active comments
            </span>
          </div>
        </div>

        <div className={styles.headerActions} style={{ display: 'flex', gap: '8px' }}>
          <button className={styles.actionBtn}>
            Archive Post
          </button>
          <button className={`${styles.actionBtn} ${styles.actionBtnActive}`}>
            Resolve All
          </button>
        </div>
      </div>

      {/* Detail scrollable panel */}
      <div className={styles.listScroll} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {/* Original Post context card - matching design */}
        <div className={styles.postPreviewCard}>
          {post.thumbnailUrl ? (
            <img
              src={post.thumbnailUrl}
              alt="Post thumbnail"
              className={styles.postThumbnail}
            />
          ) : (
            <div className={styles.postThumbnail} style={{ background: 'var(--clr-canvas-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={32} style={{ color: 'var(--clr-mute)' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--clr-ink)', marginBottom: '4px', textTransform: 'capitalize' }}>
              {post.platform} Page Post
            </h4>
            <p className={styles.postCaption}>{post.caption}</p>
            
            {/* Interactions row */}
            <div className={styles.postStatsRow}>
              <span className={styles.postStatItem}>
                <ThumbsUp size={12} /> 1.2k Likes
              </span>
              <span className={styles.postStatItem}>
                <MessageCircle size={12} /> {post.comments.length} Comments
              </span>
              <span className={styles.postStatItem}>
                <Share2 size={12} /> 12 Shares
              </span>
            </div>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); toastSuccess('Opening original post URL...'); }}
            style={{ padding: '6px', alignSelf: 'flex-start', color: 'var(--clr-body-mid)' }}
            title="Open Post"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Comments Section list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--clr-ink)', borderBottom: '1px solid var(--clr-border)', paddingBottom: '8px' }}>
            Comments under this Post ({post.comments.length})
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
            {post.comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                isActive={activeComment?.id === c.id}
                onSelect={() => onSelectComment(c)}
                onLike={onLike}
                onHide={onHide}
                onDelete={onDelete}
                onPrivateReply={handlePrivateReplyTrigger}
                replies={replies}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reply input drawer */}
      {activeComment && (
        <div className={styles.replyArea} style={{ padding: '16px 20px', borderTop: '1px solid var(--clr-border)', background: 'var(--clr-canvas-soft)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'absolute', bottom: 0, left: 0, width: '100%', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 20 }}>
          {showEmojiPicker && (
            <div className={styles.emojiPopover} style={{ position: 'absolute', bottom: '100%', left: '20px', background: 'white', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '8px', zIndex: 30, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div className={styles.emojiGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                {['😀', '😂', '🔥', '👍', '🙏', '❤️', '🎉', '💡', '🚀', '✨', '👏', '👀'].map((emoji) => (
                  <button
                    key={emoji}
                    className={styles.emojiBtn}
                    onClick={() => {
                      setDraft((p) => p + emoji);
                      setShowEmojiPicker(false);
                    }}
                    style={{ fontSize: '18px', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.inputControlsRow} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className={styles.toolbarBtn}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              title="Add emoji"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-body-mid)' }}
            >
              <Smile size={18} />
            </button>

            <div className={styles.inputFieldWrapper} style={{ flex: 1 }}>
              <textarea
                className={styles.replyInput}
                rows={1}
                placeholder={`Reply to ${activeComment.authorName}...`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                style={{ width: '100%', minHeight: '38px', maxHeight: '100px', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '8px 12px', fontSize: '13px', background: 'white', resize: 'none', outline: 'none' }}
              />
            </div>

            <button
              className={styles.replySendBtn}
              disabled={!draft.trim() || sending}
              onClick={handleSend}
              style={{ background: 'var(--clr-primary)', color: 'white', border: 'none', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s' }}
            >
              {sending ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Private Reply Modal */}
      {privateReplyTarget && activeComment && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className={styles.modalContent} style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 className={styles.modalTitle} style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Send Private Reply (DM)</h3>
            <p className={styles.modalBody} style={{ fontSize: '13px', color: 'var(--clr-body)', marginBottom: '16px' }}>
              This will send a direct message in Messenger to <strong>{activeComment.authorName}</strong> in response to their public comment.
            </p>
            <textarea
              className={styles.replyInput}
              rows={3}
              placeholder="Type your private Messenger reply..."
              value={privateReplyDraft}
              onChange={(e) => setPrivateReplyDraft(e.target.value)}
              style={{ width: '100%', marginBottom: '16px', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '10px', fontSize: '13px' }}
            />
            <div className={styles.modalActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className={`${styles.modalBtn} ${styles.modalCancel}`}
                disabled={sendingPrivateReply}
                onClick={() => setPrivateReplyTarget(null)}
                style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--clr-border)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                className={`${styles.modalBtn} ${styles.modalConfirm}`}
                disabled={!privateReplyDraft.trim() || sendingPrivateReply}
                onClick={handleSendPrivateReply}
                style={{ padding: '8px 16px', background: 'var(--clr-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
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

  // State to track selected post ID
  const [selectedPostIdState, setSelectedPostIdState] = useState<string | null>(null);

  // Active reply target comment
  const [activeCommentState, setActiveCommentState] = useState<InboxCommentDto | null>(null);

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
          c.bodyText?.toLowerCase().includes(q) ||
          c.postPreviewCaption?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [commentList, search, unreadOnly]);

  // Group comments by post ID to match Stitch design system
  const postGroups = useMemo(() => {
    const groups: { [postId: string]: PostGroup } = {};

    filteredCommentList.forEach((c) => {
      const postId = c.zernioPostId || `no-post-${c.id}`;

      if (!groups[postId]) {
        groups[postId] = {
          id: postId,
          caption: c.postPreviewCaption || 'Untitled Social Post',
          thumbnailUrl: c.postPreviewThumbnailUrl || '',
          platform: c.platform,
          comments: [],
          unreadCount: 0,
          updatedAt: c.receivedAtUtc || c.createdAtUtc,
        };
      }

      groups[postId].comments.push(c);
      if (!c.isRead) {
        groups[postId].unreadCount += 1;
      }
      
      if (new Date(c.receivedAtUtc || c.createdAtUtc) > new Date(groups[postId].updatedAt)) {
        groups[postId].updatedAt = c.receivedAtUtc || c.createdAtUtc;
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [filteredCommentList]);

  const selectedPostId = selectedPostIdState || postGroups[0]?.id || null;

  const selectedPost = useMemo(() => {
    return postGroups.find((g) => g.id === selectedPostId) || null;
  }, [postGroups, selectedPostId]);

  const activeComment = activeCommentState || selectedPost?.comments[0] || null;

  // Simulated replies state for active thread (user sent replies)
  const [replies, setReplies] = useState<MockReply[]>([]);

  // Mark active comment as read when it changes
  useEffect(() => {
    if (activeComment && !activeComment.isRead) {
      void markCommentRead(activeComment.id);
    }
  }, [activeComment, markCommentRead]);

  const displayReplies = useMemo(() => {
    if (!activeComment) return [];
    const defaultMock: MockReply = {
      id: 'rep-mock-1',
      authorName: 'Support Bot',
      bodyText: `Processing support request for ${activeComment.authorName}.`,
      receivedAtUtc: new Date(new Date(activeComment.receivedAtUtc).getTime() + 60000).toISOString(),
    };
    return [defaultMock, ...replies];
  }, [activeComment, replies]);

  const handleSelectPost = useCallback(
    (post: PostGroup) => {
      setSelectedPostIdState(post.id);
      setActiveCommentState(null); // resets to default comment of new post
      setReplies([]); // clear sent replies for the new post context

      const firstComment = post.comments[0];
      if (firstComment) {
        post.comments.forEach((c) => {
          if (!c.isRead) {
            void markCommentRead(c.id);
          }
        });
      }
    },
    [markCommentRead],
  );

  const handleSelectComment = useCallback(
    (comment: InboxCommentDto) => {
      setActiveCommentState(comment);
      setReplies([]); // clear sent replies for the new comment context
      if (!comment.isRead) {
        void markCommentRead(comment.id);
      }
    },
    [markCommentRead]
  );

  const handleSendReply = useCallback(
    async (commentId: string, message: string) => {
      await replyToComment({ commentId, message });

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
    [replyToComment],
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
      // If we deleted the active comment, clear it or set to another
      setActiveCommentState(null);
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
    setSelectedPostIdState(null);
    setActiveCommentState(null);
    setReplies([]);
  }, []);

  if (comments.isLoading) {
    return (
      <div className={styles.emptyState} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Loading comments...</span>
      </div>
    );
  }

  return (
    <div className={styles.masterDetail} style={{ display: 'flex', height: '100%', overflow: 'hidden', flex: 1 }}>
      {/* Left panel: Post list */}
      <div className={styles.masterPanel} style={{ width: '340px', borderRight: '1px solid var(--clr-border)', overflowY: 'auto', background: 'var(--clr-canvas)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className={styles.listHeader} style={{ padding: '16px', borderBottom: '1px solid var(--clr-border)', fontSize: '11px', fontWeight: 700, color: 'var(--clr-body-mid)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          <span>Posts with comments ({postGroups.length})</span>
        </div>
        <div className={styles.listScroll} style={{ flex: 1, overflowY: 'auto' }}>
          {postGroups.length === 0 ? (
            <div className={styles.emptyState} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', gap: '12px', color: 'var(--clr-body-mid)' }}>
              <MessageCircle size={28} />
              <span>No comments match filters</span>
            </div>
          ) : (
            postGroups.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                isSelected={selectedPostId === post.id}
                onClick={() => handleSelectPost(post)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: Post and comments detail */}
      <div className={styles.detailPanel} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--clr-canvas)', position: 'relative' }}>
        {selectedPost ? (
          <PostDetail
            post={selectedPost}
            activeComment={activeComment}
            onSelectComment={handleSelectComment}
            onSendReply={handleSendReply}
            onLike={handleLike}
            onHide={handleHide}
            onDelete={handleDeleteComment}
            onPrivateReply={handlePrivateReply}
            onBack={handleBack}
            replies={displayReplies}
          />
        ) : (
          <div className={styles.detailEmpty} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--clr-body-mid)', gap: '12px' }}>
            <MessageCircle size={36} className={styles.emptyIcon} style={{ opacity: 0.6 }} />
            <span>Select a post to view comments</span>
          </div>
        )}
      </div>
    </div>
  );
}
