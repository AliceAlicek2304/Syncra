import { useState, useCallback, useMemo } from 'react';
import { Star, ArrowLeft, Loader2, Send, Trash2, Smile } from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxReviewDto } from '../../api/inbox';
import { formatDateTime, getInitials, stringToColor, mapPlatformToIconKey } from './utils';
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons';
import styles from './InboxPage.module.css';

interface ReviewsTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
  search?: string;
  unreadOnly?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.reviewStars}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rating ? '#f59e0b' : 'none'}
          color={i < rating ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

function ReviewListItem({
  review,
  isSelected,
  onClick,
}: {
  review: InboxReviewDto;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''} ${!review.isRead ? styles.listItemUnread : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatarWrap}>
        {review.reviewerImageUrl ? (
          <img src={review.reviewerImageUrl} alt="" className={styles.avatar} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            style={{ background: stringToColor(review.reviewerName) }}
          >
            {getInitials(review.reviewerName)}
          </div>
        )}
        <span className={styles.platformBadge}>
          <ExtendedPlatformIcon platform={mapPlatformToIconKey(review.platform)} size={14} />
        </span>
      </div>
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{review.reviewerName}</span>
          <span className={styles.itemTime}>{formatDateTime(review.receivedAtUtc)}</span>
        </div>
        <div className={styles.itemPreview}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StarRating rating={review.starRating} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 140 }}>
              {review.reviewText ?? 'No text'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReviewDetailProps {
  review: InboxReviewDto;
  onSendReply: (message: string) => Promise<void>;
  onDeleteReply: (reviewId: string) => Promise<void>;
  onBack: () => void;
}

function ReviewDetail({
  review,
  onSendReply,
  onDeleteReply,
  onBack,
}: ReviewDetailProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Deletion logic (Google Business only)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isGoogle = review.platform === 'google';

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

  const handleDeleteReply = async () => {
    await onDeleteReply(review.id);
    setShowDeleteConfirm(false);
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
            {review.reviewerImageUrl ? (
              <img src={review.reviewerImageUrl} alt="" className={styles.avatar} style={{ width: 36, height: 36 }} />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ width: 36, height: 36, background: stringToColor(review.reviewerName) }}
              >
                {getInitials(review.reviewerName)}
              </div>
            )}
            <span className={styles.platformBadge} style={{ width: 14, height: 14 }}>
              <ExtendedPlatformIcon platform={mapPlatformToIconKey(review.platform)} size={10} />
            </span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerTitle}>{review.reviewerName}</span>
            <span className={styles.headerSubtitle}>
              {review.platform === 'google' ? 'Google Business Profile' : 'Facebook Page'} Review
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

      {/* Review details */}
      <div className={styles.listScroll} style={{ padding: '20px' }}>
        <div className={styles.detailCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <StarRating rating={review.starRating} />
            <span className={styles.detailTime}>{formatDateTime(review.receivedAtUtc)}</span>
          </div>

          <div className={styles.detailBody} style={{ color: 'var(--text-primary)', fontSize: '14px', marginTop: '12px' }}>
            {review.reviewText ?? <em>No review text provided.</em>}
          </div>
        </div>

        {/* Reply details */}
        {review.hasReply && review.replyText && (
          <div className={styles.detailCard} style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={styles.itemName} style={{ display: 'block', marginBottom: '4px' }}>
                  Your Response
                </span>
                <span className={styles.detailTime}>
                  {review.replyCreatedAtUtc ? formatDateTime(review.replyCreatedAtUtc) : 'Just now'}
                </span>
              </div>

              {isGoogle && (
                <button
                  className={styles.msgActionBtn}
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete review reply"
                >
                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                </button>
              )}
            </div>

            <div className={styles.detailBody} style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)' }}>
              {review.replyText}
            </div>
          </div>
        )}
      </div>

      {/* Input reply form */}
      {!review.hasReply && (
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
                placeholder="Write a response..."
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
      )}

      {/* Delete Reply Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Delete Response</h3>
            <p className={styles.modalBody}>
              Are you sure you want to delete your response to this review? This action is permanent and cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalCancel}`} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className={`${styles.modalBtn} ${styles.modalConfirm}`} style={{ background: '#ef4444' }} onClick={handleDeleteReply}>
                Delete Response
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ReviewsTab({ workspaceId, platform, accountId, search, unreadOnly }: ReviewsTabProps) {
  const {
    reviews,
    markReviewRead,
    replyToReview,
    deleteReviewReply,
  } = useInbox({ workspaceId, platform, accountId });

  const [selectedReview, setSelectedReview] = useState<InboxReviewDto | null>(null);

  const reviewList = useMemo(
    () => reviews.data?.pages.flatMap((p) => p.items) ?? [],
    [reviews.data],
  );

  // Filter list client-side based on search queries and read/unread flags
  const filteredReviewList = useMemo(() => {
    let list = reviewList;

    if (unreadOnly) {
      list = list.filter((r) => !r.isRead);
    }

    if (search?.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.reviewerName?.toLowerCase().includes(q) ||
          r.reviewText?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reviewList, search, unreadOnly]);

  const handleSelect = useCallback(
    (review: InboxReviewDto) => {
      setSelectedReview(review);
      if (!review.isRead) {
        void markReviewRead(review.id);
      }
    },
    [markReviewRead],
  );

  const handleSendReply = useCallback(
    async (message: string) => {
      if (!selectedReview) return;
      await replyToReview({ reviewId: selectedReview.id, message });

      // Optimistically update local review state
      setSelectedReview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          hasReply: true,
          replyText: message,
          replyCreatedAtUtc: new Date().toISOString(),
        };
      });
    },
    [selectedReview, replyToReview],
  );

  const handleDeleteReply = useCallback(
    async (reviewId: string) => {
      await deleteReviewReply({ reviewId });

      // Optimistically update local review state
      setSelectedReview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          hasReply: false,
          replyText: null,
          replyCreatedAtUtc: null,
        };
      });
    },
    [deleteReviewReply]
  );

  const handleBack = useCallback(() => {
    setSelectedReview(null);
  }, []);

  if (reviews.isLoading) {
    return (
      <div className={styles.emptyState}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Loading reviews...</span>
      </div>
    );
  }

  return (
    <div className={styles.masterDetail}>
      {/* Left panel: list */}
      <div className={styles.masterPanel}>
        <div className={styles.listHeader}>
          <span>REVIEWS ({filteredReviewList.length})</span>
        </div>
        <div className={styles.listScroll}>
          {filteredReviewList.length === 0 ? (
            <div className={styles.emptyState}>
              <Star size={28} />
              <span>No reviews match filters</span>
            </div>
          ) : (
            filteredReviewList.map((r) => (
              <ReviewListItem
                key={r.id}
                review={r}
                isSelected={selectedReview?.id === r.id}
                onClick={() => handleSelect(r)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: detail */}
      <div className={styles.detailPanel}>
        {selectedReview ? (
          <ReviewDetail
            review={selectedReview}
            onSendReply={handleSendReply}
            onDeleteReply={handleDeleteReply}
            onBack={handleBack}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <Star size={36} className={styles.emptyIcon} />
            <span>Select a review to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}
