import api from '../lib/axios';

// ── DTOs ──────────────────────────────────────────────────────────────────

export interface InboxConversationDto {
  id: string;
  zernioConversationId: string;
  platform: string;
  participantName: string | null;
  participantAvatarUrl: string | null;
  lastMessageText: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
  isRead: boolean;
  socialAccountId: string | null;
  createdAtUtc: string;
}

export interface InboxMessageDto {
  id: string;
  inboxConversationId: string;
  zernioMessageId: string;
  direction: string;
  bodyText: string | null;
  sentAtUtc: string;
  zernioAccountId: string | null;
  createdAtUtc: string;
  // Rich features for frontend integration & mock data
  attachments?: Array<{ type: 'image' | 'video' | 'file' | 'audio'; url: string; name?: string }>;
  buttons?: Array<{ label: string; payload?: string }>;
  isEdited?: boolean;
  isDeleted?: boolean;
  isSystem?: boolean;
}

export interface InboxCommentDto {
  id: string;
  zernioCommentId: string;
  socialAccountId: string | null;
  platform: string;
  authorName: string;
  authorUsername: string | null;
  authorPicture: string | null;
  bodyText: string;
  zernioPostId: string | null;
  zernioAccountId: string | null;
  postPreviewCaption: string | null;
  postPreviewThumbnailUrl: string | null;
  isRead: boolean;
  receivedAtUtc: string;
  createdAtUtc: string;
}

export interface InboxReviewDto {
  id: string;
  zernioReviewId: string;
  socialAccountId: string | null;
  platform: string;
  reviewerName: string;
  reviewerImageUrl: string | null;
  starRating: number;
  reviewText: string | null;
  hasReply: boolean;
  replyText: string | null;
  replyCreatedAtUtc: string | null;
  isRead: boolean;
  receivedAtUtc: string;
  createdAtUtc: string;
}

export interface InboxPageMetadata {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface InboxCursorPage<T> {
  items: T[];
  pagination: InboxPageMetadata;
}

export interface InboxSummaryDto {
  unreadTotal: number;
}

export interface InboxSyncStatusDto {
  isSyncing: boolean;
  lastSyncedAtUtc: string | null;
}

export interface SendMessageResponse {
  zernioMessageId: string;
  sentAtUtc: string;
}

export interface SendCommentReplyResponse {
  commentId: string;
  cid: string | null;
}

export interface SendReviewReplyResponse {
  reviewReplyId: string;
}

// ── API Client ─────────────────────────────────────────────────────────────

export const inboxApi = {
  // ── Conversations (DMs) ────────────────────────────────────────────────

  getConversations: async (
    workspaceId: string,
  ): Promise<InboxConversationDto[]> => {
    const response = await api.get<InboxConversationDto[]>(
      `workspaces/${workspaceId}/inbox/conversations`,
    );
    return response.data;
  },

  getConversationMessages: async (
    workspaceId: string,
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<InboxMessageDto[]> => {
    const response = await api.get<InboxMessageDto[]>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages`,
      { params: { limit, ...(before ? { before } : {}) } },
    );
    return response.data;
  },

  sendDmReply: async (
    workspaceId: string,
    conversationId: string,
    text: string,
    accountId: string,
  ): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages`,
      { text, accountId },
    );
    return response.data;
  },

  markConversationRead: async (
    workspaceId: string,
    conversationId: string,
  ): Promise<void> => {
    await api.patch(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/read`,
    );
  },

  // ── Comments ───────────────────────────────────────────────────────────

  getComments: async (
    workspaceId: string,
    limit = 50,
    before?: string,
    platform?: string,
    accountId?: string,
  ): Promise<InboxCommentDto[]> => {
    const response = await api.get<InboxCommentDto[]>(
      `workspaces/${workspaceId}/inbox/comments`,
      {
        params: {
          limit,
          ...(before ? { before } : {}),
          ...(platform ? { platform } : {}),
          ...(accountId ? { accountId } : {}),
        },
      },
    );
    return response.data;
  },

  replyToComment: async (
    workspaceId: string,
    commentId: string,
    message: string,
  ): Promise<SendCommentReplyResponse> => {
    const response = await api.post<SendCommentReplyResponse>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/reply`,
      { message },
    );
    return response.data;
  },

  markCommentRead: async (
    workspaceId: string,
    commentId: string,
  ): Promise<void> => {
    await api.patch(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/read`,
    );
  },

  likeComment: async (
    workspaceId: string,
    postId: string,
    commentId: string,
  ): Promise<void> => {
    await api.post(`workspaces/${workspaceId}/inbox/comments/${postId}/${commentId}/like`);
  },

  unlikeComment: async (
    workspaceId: string,
    postId: string,
    commentId: string,
  ): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/inbox/comments/${postId}/${commentId}/like`);
  },

  hideComment: async (
    workspaceId: string,
    postId: string,
    commentId: string,
  ): Promise<void> => {
    await api.post(`workspaces/${workspaceId}/inbox/comments/${postId}/${commentId}/hide`);
  },

  unhideComment: async (
    workspaceId: string,
    postId: string,
    commentId: string,
  ): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/inbox/comments/${postId}/${commentId}/hide`);
  },

  deleteComment: async (
    workspaceId: string,
    postId: string,
  ): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/inbox/comments/${postId}`);
  },

  sendPrivateReply: async (
    workspaceId: string,
    postId: string,
    commentId: string,
    message: string,
  ): Promise<any> => {
    const response = await api.post(
      `workspaces/${workspaceId}/inbox/comments/${postId}/${commentId}/private-reply`,
      { message }
    );
    return response.data;
  },

  // ── Reviews ────────────────────────────────────────────────────────────

  getReviews: async (
    workspaceId: string,
    limit = 50,
    before?: string,
    platform?: string,
    accountId?: string,
  ): Promise<InboxReviewDto[]> => {
    const response = await api.get<InboxReviewDto[]>(
      `workspaces/${workspaceId}/inbox/reviews`,
      {
        params: {
          limit,
          ...(before ? { before } : {}),
          ...(platform ? { platform } : {}),
          ...(accountId ? { accountId } : {}),
        },
      },
    );
    return response.data;
  },

  replyToReview: async (
    workspaceId: string,
    reviewId: string,
    message: string,
  ): Promise<SendReviewReplyResponse> => {
    const response = await api.post<SendReviewReplyResponse>(
      `workspaces/${workspaceId}/inbox/reviews/${reviewId}/reply`,
      { message },
    );
    return response.data;
  },

  markReviewRead: async (
    workspaceId: string,
    reviewId: string,
  ): Promise<void> => {
    await api.patch(
      `workspaces/${workspaceId}/inbox/reviews/${reviewId}/read`,
    );
  },

  deleteReviewReply: async (
    workspaceId: string,
    reviewId: string,
  ): Promise<void> => {
    await api.delete(`workspaces/${workspaceId}/inbox/reviews/${reviewId}/reply`);
  },

  // ── Summary / Unread ───────────────────────────────────────────────────

  getInboxSummary: async (
    workspaceId: string,
  ): Promise<InboxSummaryDto> => {
    const response = await api.get<InboxSummaryDto>(
      `workspaces/${workspaceId}/inbox/unread-summary`,
    );
    return response.data;
  },

  // ── Sync / Backfill ────────────────────────────────────────────────────

  triggerInboxSync: async (
    workspaceId: string,
  ): Promise<void> => {
    await api.post(`workspaces/${workspaceId}/inbox/sync`);
  },

  getInboxSyncStatus: async (
    workspaceId: string,
  ): Promise<InboxSyncStatusDto> => {
    const response = await api.get<InboxSyncStatusDto>(
      `workspaces/${workspaceId}/inbox/sync-status`,
    );
    return response.data;
  },
};

export default inboxApi;
