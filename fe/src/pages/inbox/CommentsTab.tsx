import { useState, useCallback, useMemo } from 'react';
import { MessageCircle, ArrowLeft, Loader2, Send } from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxCommentDto } from '../../api/inbox';
import { formatDateTime, getInitials, stringToColor } from './utils';
import styles from './InboxPage.module.css';

interface CommentsTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
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
      </div>
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{comment.authorName}</span>
          <span className={styles.itemTime}>{formatDateTime(comment.receivedAtUtc)}</span>
        </div>
        <div className={styles.itemPreview}>{comment.bodyText}</div>
      </div>
    </div>
  );
}

function CommentDetail({
  comment,
  onSendReply,
  onBack,
}: {
  comment: InboxCommentDto;
  onSendReply: (message: string) => Promise<void>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

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

  return (
    <>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack} title="Back">
          <ArrowLeft size={16} />
        </button>
        <span className={styles.detailTitle}>Comment</span>
      </div>

      <div className={styles.detailCard}>
        <div className={styles.detailMeta}>
          {comment.authorPicture && (
            <img src={comment.authorPicture} alt="" className={styles.avatar} />
          )}
          <span className={styles.detailAuthor}>{comment.authorName}</span>
          <span className={styles.detailPlatform}>
            {comment.platform}
            {comment.authorUsername ? ` @${comment.authorUsername}` : ''}
          </span>
        </div>

        {comment.postPreviewThumbnailUrl && (
          <img
            src={comment.postPreviewThumbnailUrl}
            alt="Post preview"
            className={styles.postPreview}
            style={{ width: '100%', maxWidth: 280, borderRadius: 8, marginBottom: 12 }}
          />
        )}

        <div className={styles.detailBody}>{comment.bodyText}</div>
        <div className={styles.detailTime}>{formatDateTime(comment.receivedAtUtc)}</div>
      </div>

      {/* Reply input */}
      <div className={styles.replyArea}>
        <textarea
          className={styles.replyInput}
          rows={2}
          placeholder="Write a reply..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className={styles.replySendBtn}
          disabled={!draft.trim() || sending}
          onClick={handleSend}
        >
          {sending ? <Loader2 size={14} className={styles.spinner} /> : <Send size={14} />}
        </button>
      </div>
    </>
  );
}

export default function CommentsTab({ workspaceId, platform, accountId }: CommentsTabProps) {
  const {
    comments,
    markCommentRead,
    replyToComment,
  } = useInbox({ workspaceId, platform, accountId });

  const [selectedComment, setSelectedComment] = useState<InboxCommentDto | null>(null);

  const commentList = useMemo(
    () => comments.data?.pages.flatMap((p) => p.items) ?? [],
    [comments.data],
  );

  const handleSelect = useCallback(
    (comment: InboxCommentDto) => {
      setSelectedComment(comment);
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
    },
    [selectedComment, replyToComment],
  );

  const handleBack = useCallback(() => {
    setSelectedComment(null);
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
      <div className={styles.masterPanel}>
        {commentList.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageCircle size={28} />
            <span>No comments yet</span>
          </div>
        ) : (
          commentList.map((c) => (
            <CommentListItem
              key={c.id}
              comment={c}
              isSelected={selectedComment?.id === c.id}
              onClick={() => handleSelect(c)}
            />
          ))
        )}
      </div>

      <div className={styles.detailPanel}>
        {selectedComment ? (
          <CommentDetail
            comment={selectedComment}
            onSendReply={handleSendReply}
            onBack={handleBack}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <MessageCircle size={36} />
            <span>Select a comment to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}
