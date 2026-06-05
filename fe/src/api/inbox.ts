import api from '../lib/axios';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface InboxConversationDto {
  id: string;
  zernioConversationId: string;
  platform: string;
  participantName?: string;
  participantAvatarUrl?: string;
  lastMessageText?: string;
  lastMessageAtUtc?: string;
  unreadCount: number;
  isRead: boolean;
  socialAccountId?: string;
  createdAtUtc: string;
}

export interface ZernioMessageAttachmentDto {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'share';
  url: string;
  filename?: string;
  previewUrl?: string;
}

export interface InboxMessageReactionDto {
  emoji: string;
  accountId?: string;
  participantId?: string;
  participantName?: string;
  count?: number;
}

export interface InboxMessageDto {
  id: string;
  inboxConversationId: string;
  zernioMessageId: string;
  direction: string; // "Inbound" | "Outbound"
  bodyText?: string;
  sentAtUtc: string;
  zernioAccountId?: string;
  createdAtUtc: string;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: ZernioMessageAttachmentDto[];
  reactions?: InboxMessageReactionDto[];
}

export interface InboxParticipantDto {
  id: string;
  name: string;
}

export interface InboxInstagramProfileDto {
  isFollower?: boolean;
  isFollowing?: boolean;
  followerCount?: number;
  isVerified?: boolean;
  fetchedAt?: string;
}

export interface InboxConversationDetailsDto {
  id: string;
  accountId: string;
  accountUsername: string;
  platform: string;
  status: string;
  participantName: string;
  participantId: string;
  participantVerifiedType?: string;
  lastMessage: string;
  lastMessageAt: string;
  updatedTime: string;
  participants: InboxParticipantDto[];
  instagramProfile?: InboxInstagramProfileDto;
}

export interface InboxQuickReplyDto {
  title: string;
  payload: string;
  imageUrl?: string;
}

export interface InboxButtonDto {
  type: string; // "url" | "postback" | "phone"
  title: string;
  url?: string;
  payload?: string;
  phone?: string;
}

export interface InboxTemplateElementDto {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: InboxButtonDto[];
}

export interface InboxTemplateDto {
  type: string; // "generic"
  elements: InboxTemplateElementDto[];
}

export interface InboxTelegramButtonDto {
  text: string;
  callbackData?: string;
  url?: string;
}

export interface InboxTelegramReplyMarkupDto {
  type: string; // "inline_keyboard" | "reply_keyboard"
  keyboard: InboxTelegramButtonDto[][];
  oneTime?: boolean;
}

export interface InboxSendMessageRequest {
  text?: string;
  accountId: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio' | 'file';
  quickReplies?: InboxQuickReplyDto[];
  buttons?: InboxButtonDto[];
  template?: InboxTemplateDto;
  interactive?: any;
  replyMarkup?: InboxTelegramReplyMarkupDto;
  replyTo?: string;
  messagingType?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  messageTag?: 'CONFIRMED_EVENT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'ACCOUNT_UPDATE' | 'HUMAN_AGENT';
}

export interface SendInboxMessageResponse {
  zernioMessageId: string;
  sentAtUtc: string;
}

export interface CreateInboxConversationRequest {
  accountId: string;
  participantId?: string;
  participantUsername?: string;
  message?: string;
  skipDmCheck?: boolean;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
}

export interface InboxCreateConversationResponseDto {
  messageId: string;
  conversationId: string;
  participantId: string;
  participantName?: string;
  participantUsername?: string;
}

export interface UpdateInboxConversationRequest {
  accountId: string;
  status: 'active' | 'archived';
}

export interface InboxUpdateConversationResponseDto {
  status: string;
  id: string;
  accountId: string;
  platform: string;
  updatedAt: string;
}

export interface EditInboxMessageRequest {
  accountId: string;
  text: string;
  replyMarkup?: InboxTelegramReplyMarkupDto;
}

export interface InboxEditMessageResponseDto {
  messageId: number;
}

export interface AddMessageReactionRequest {
  accountId: string;
  emoji: string;
}

export interface InboxCommentDto {
  id: string;
  zernioCommentId: string;
  socialAccountId?: string;
  platform: string;
  authorName: string;
  authorUsername?: string;
  authorPicture?: string;
  bodyText: string;
  zernioPostId?: string;
  zernioAccountId?: string;
  postPreviewCaption?: string;
  postPreviewThumbnailUrl?: string;
  commentCount: number;
  zernioTopCommentId?: string;
  isRead: boolean;
  receivedAtUtc: string;
  createdAtUtc: string;
}

export interface ZernioInboxFailedAccountDto {
  accountId: string;
  accountUsername?: string;
  platform: string;
  error: string;
  code?: string;
  retryAfter?: number;
}

export interface ZernioInboxCommentMetaDto {
  accountsQueried: number;
  accountsFailed: number;
  failedAccounts: ZernioInboxFailedAccountDto[];
  lastUpdated: string;
}

export interface InboxCommentedPostItemDto {
  id: string;
  platform: string;
  accountId?: string;
  accountUsername?: string;
  content: string;
  picture?: string;
  permalink?: string;
  createdTime: string;
  commentCount: number;
  likeCount?: number;
  cid?: string;
  subreddit?: string;
  isAd?: boolean;
  adId?: string;
  placement?: string;
}

export interface InboxCommentedPostsResponseDto {
  data: InboxCommentedPostItemDto[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
  meta?: ZernioInboxCommentMetaDto;
}


export interface LikeCommentResponse {
  liked: boolean;
  status?: string;
  commentId?: string;
  platform?: string;
  likeUri?: string;
}

export interface ZernioCommentAuthorDto {
  id: string;
  name: string;
  username?: string;
  picture?: string;
  isOwner: boolean;
  verifiedType?: string;
}

export interface ZernioPostCommentItemDto {
  id: string;
  message: string;
  createdTime: string;
  from?: ZernioCommentAuthorDto;
  likeCount: number;
  replyCount: number;
  platform: string;
  url?: string;
  canReply: boolean;
  canDelete: boolean;
  canHide: boolean;
  canLike: boolean;
  isHidden: boolean;
  isLiked: boolean;
  likeUri?: string;
  cid?: string;
  parentId?: string;
  isAd?: boolean;
  replies?: ZernioPostCommentItemDto[];
  hasSentPrivateReply?: boolean;
}

export interface PrivateReplyQuickReply {
  title: string;
  payload?: string;
  imageUrl?: string;
}

export interface PrivateReplyButton {
  type: string; // "url" | "postback" | "phone"
  title: string;
  url?: string;
  payload?: string;
  phone_number?: string;
}

export interface SendPrivateReplyRequest {
  message: string;
  quickReplies?: PrivateReplyQuickReply[];
  buttons?: PrivateReplyButton[];
}

export interface ZernioPostMetaDto {
  id: string;
  fullname?: string;
  title?: string;
  selftext?: string;
  author?: string;
  subreddit?: string;
  permalink?: string;
  url?: string;
  score: number;
  numComments: number;
  createdUtc: number;
  over18: boolean;
  stickied: boolean;
  flairText?: string;
  isGallery: boolean;
}

export interface ZernioCommentsMetaAdCommentsDto {
  adId?: string;
  adCommentsUrl?: string;
}

export interface ZernioCommentsMetaDto {
  platform: string;
  postId?: string;
  accountId?: string;
  subreddit?: string;
  lastUpdated?: string;
  adComments?: ZernioCommentsMetaAdCommentsDto;
}

export interface ZernioPostCommentsResponseDto {
  status: string;
  post?: ZernioPostMetaDto;
  meta: ZernioCommentsMetaDto;
  comments: ZernioPostCommentItemDto[];
  pagination: {
    hasMore: boolean;
    cursor?: string;
  };
}

export interface InboxSendCommentReplyResponse {
  commentId: string;
  cid?: string;
}

// ── API Wrapper Methods ──────────────────────────────────────────────────────

export const inboxApi = {
  // 1. Existing Endpoints
  getConversations: async (workspaceId: string): Promise<InboxConversationDto[]> => {
    const response = await api.get<InboxConversationDto[]>(
      `workspaces/${workspaceId}/inbox/conversations`,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  getMessages: async (
    workspaceId: string,
    conversationId: string,
    params?: { limit?: number; before?: string }
  ): Promise<InboxMessageDto[]> => {
    const response = await api.get<InboxMessageDto[]>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params,
      }
    );
    return response.data;
  },

  sendMessage: async (
    workspaceId: string,
    conversationId: string,
    request: InboxSendMessageRequest
  ): Promise<SendInboxMessageResponse> => {
    const response = await api.post<SendInboxMessageResponse>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  markAsRead: async (workspaceId: string, conversationId: string): Promise<void> => {
    await api.patch(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/read`,
      {},
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
  },

  // 2. New 8 Wrapper Endpoints
  getConversationDetails: async (
    workspaceId: string,
    conversationId: string,
    accountId: string
  ): Promise<InboxConversationDetailsDto> => {
    const response = await api.get<InboxConversationDetailsDto>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params: { accountId }
      }
    );
    return response.data;
  },

  createConversation: async (
    workspaceId: string,
    request: CreateInboxConversationRequest
  ): Promise<InboxCreateConversationResponseDto> => {
    const response = await api.post<InboxCreateConversationResponseDto>(
      `workspaces/${workspaceId}/inbox/conversations`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  updateConversationStatus: async (
    workspaceId: string,
    conversationId: string,
    request: UpdateInboxConversationRequest
  ): Promise<InboxUpdateConversationResponseDto> => {
    const response = await api.put<InboxUpdateConversationResponseDto>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  editMessage: async (
    workspaceId: string,
    conversationId: string,
    messageId: string,
    request: EditInboxMessageRequest
  ): Promise<InboxEditMessageResponseDto> => {
    const response = await api.patch<InboxEditMessageResponseDto>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages/${messageId}`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  deleteMessage: async (
    workspaceId: string,
    conversationId: string,
    messageId: string,
    accountId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages/${messageId}`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params: { accountId }
      }
    );
    return response.data;
  },

  addReaction: async (
    workspaceId: string,
    conversationId: string,
    messageId: string,
    request: AddMessageReactionRequest
  ): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages/${messageId}/reactions`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  removeReaction: async (
    workspaceId: string,
    conversationId: string,
    messageId: string,
    accountId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/messages/${messageId}/reactions`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params: { accountId }
      }
    );
    return response.data;
  },

  sendTypingIndicator: async (
    workspaceId: string,
    conversationId: string,
    accountId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/conversations/${conversationId}/typing`,
      { accountId },
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  // ── Comments API Methods ──────────────────────────────────────────────────

  getComments: async (
    workspaceId: string,
    params?: { limit?: number; before?: string; platform?: string; accountId?: string }
  ): Promise<InboxCommentedPostsResponseDto> => {
    const response = await api.get<InboxCommentedPostsResponseDto>(
      `workspaces/${workspaceId}/inbox/comments`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params,
      }
    );
    return response.data;
  },

  getPostComments: async (
    workspaceId: string,
    postId: string,
    accountId: string,
    params?: { subreddit?: string; limit?: number; cursor?: string; commentId?: string; forceRefresh?: boolean }
  ): Promise<ZernioPostCommentsResponseDto> => {
    const response = await api.get<ZernioPostCommentsResponseDto>(
      `workspaces/${workspaceId}/inbox/posts/${postId}/comments`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params: { accountId, ...params }
      }
    );
    return response.data;
  },

  deleteComment: async (
    workspaceId: string,
    commentId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}`,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  hideComment: async (
    workspaceId: string,
    commentId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/hide`,
      {},
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  unhideComment: async (
    workspaceId: string,
    commentId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/hide`,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  likeComment: async (
    workspaceId: string,
    commentId: string,
    cid?: string
  ): Promise<LikeCommentResponse> => {
    const response = await api.post<LikeCommentResponse>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/like`,
      { cid },
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  unlikeComment: async (
    workspaceId: string,
    commentId: string,
    likeUri?: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/like`,
      {
        headers: { 'X-Workspace-Id': workspaceId },
        params: { likeUri }
      }
    );
    return response.data;
  },

  replyToComment: async (
    workspaceId: string,
    commentId: string,
    message: string
  ): Promise<InboxSendCommentReplyResponse> => {
    const response = await api.post<InboxSendCommentReplyResponse>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/reply`,
      { message },
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  },

  sendPrivateReplyToComment: async (
    workspaceId: string,
    commentId: string,
    request: SendPrivateReplyRequest
  ): Promise<{ success: boolean; commentId?: string; messageId?: string; status?: string }> => {
    const response = await api.post<{ success: boolean; commentId?: string; messageId?: string; status?: string }>(
      `workspaces/${workspaceId}/inbox/comments/${commentId}/private-reply`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } }
    );
    return response.data;
  }
};
