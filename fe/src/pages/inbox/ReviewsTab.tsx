import { useState, useCallback, useMemo } from 'react';
import { Star, ArrowLeft, Loader2, Send } from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import type { InboxReviewDto } from '../../api/inbox';
import styles from './InboxPage.module.css';

interface ReviewsTabProps {
  workspaceId?: string;
  platform?: string;
  accountId?: string;
}

function formatTime(utc: string): string {
  const d = new Date(utc);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];
  return colors[Math.abs(hash) % colors.length];
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
      </div>
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{review.reviewerName}</span>
          <span className={styles.itemTime}>{formatTime(review.receivedAtUtc)}</span>
        </div>
        <div className={styles.itemPreview}>
          <StarRating rating={review.starRating} />{' '}
          {review.reviewText ?? 'No text'}
        </div>
      </div>
    </div>
  );
}

function ReviewDetail({
  review,
  onSendReply,
  onBack,
}: {
  review: InboxReviewDto;
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
        <span className={styles.detailTitle}>Review</span>
      </div>

      <div className={styles.detailCard}>
        <div className={styles.detailMeta}>
          {review.reviewerImageUrl && (
            <img src={review.reviewerImageUrl} alt="" className={styles.avatar} />
          )}
          <span className={styles.detailAuthor}>{review.reviewerName}</span>
          <span className={styles.detailPlatform}>{review.platform}</span>
        </div>

        <StarRating rating={review.starRating} />
        {review.reviewText && (
          <div className={styles.detailBody}>{review.reviewText}</div>
        )}
        <div className={styles.detailTime}>{formatTime(review.receivedAtUtc)}</div>
      </div>

      {/* Existing reply */}
      {review.hasReply && review.replyText && (
        <div className={styles.detailCard}>
          <div className={styles.detailBody}>
            <strong>Your reply:</strong> {review.replyText}
          </div>
          {review.replyCreatedAtUtc && (
            <div className={styles.detailTime}>{formatTime(review.replyCreatedAtUtc)}</div>
          )}
        </div>
      )}

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

export default function ReviewsTab({ workspaceId, platform, accountId }: ReviewsTabProps) {
  const {
    reviews,
    markReviewRead,
    replyToReview,
  } = useInbox({ workspaceId, platform, accountId });

  const [selectedReview, setSelectedReview] = useState<InboxReviewDto | null>(null);

  const reviewList = useMemo(
    () => reviews.data?.pages.flatMap((p) => p.items) ?? [],
    [reviews.data],
  );

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
    },
    [selectedReview, replyToReview],
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
      <div className={styles.masterPanel}>
        {reviewList.length === 0 ? (
          <div className={styles.emptyState}>
            <Star size={28} />
            <span>No reviews yet</span>
          </div>
        ) : (
          reviewList.map((r) => (
            <ReviewListItem
              key={r.id}
              review={r}
              isSelected={selectedReview?.id === r.id}
              onClick={() => handleSelect(r)}
            />
          ))
        )}
      </div>

      <div className={styles.detailPanel}>
        {selectedReview ? (
          <ReviewDetail
            review={selectedReview}
            onSendReply={handleSendReply}
            onBack={handleBack}
          />
        ) : (
          <div className={styles.detailEmpty}>
            <Star size={36} />
            <span>Select a review to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}
