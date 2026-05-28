import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { inboxApi } from '../api/inbox'
import type {
  InboxConversationDto,
  InboxCommentDto,
  InboxReviewDto,
  InboxSummaryDto,
} from '../api/inbox'
import { useToast } from '../context/ToastContext'

interface UseInboxArgs {
  workspaceId?: string
  platform?: string
  accountId?: string
}

/** Map cursor-paginated response to useInfiniteQuery page shape */
function asPage<T>(items: T[]) {
  return {
    items,
    // The BE currently returns flat arrays; when cursor pagination is
    // implemented, this adapter reads nextCursor from the response envelope.
    nextCursor: null as unknown as string | undefined,
  }
}

/**
 * Hook providing per-tab TanStack Query hooks for the unified inbox (DM, comments, reviews).
 *
 * - Conversations: useInfiniteQuery with cursor pagination (D-20)
 * - Comments: useInfiniteQuery with cursor pagination
 * - Reviews: useInfiniteQuery with cursor pagination
 * - Summary unread count: useQuery
 * - Mutations: mark-read, send reply (optimistic)
 */
export function useInbox({ workspaceId, platform, accountId }: UseInboxArgs) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // ── Unread summary ────────────────────────────────────────────────────

  const summaryQuery = useQuery({
    queryKey: ['inbox-summary', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<InboxSummaryDto | null> => {
      if (!workspaceId) return null
      return inboxApi.getInboxSummary(workspaceId)
    },
    refetchInterval: 30_000,
  })

  const unreadCount = summaryQuery.data?.unreadTotal ?? 0

  // ── Conversations (DMs tab) ──────────────────────────────────────────

  const conversationsQuery = useInfiniteQuery({
    queryKey: ['inbox-conversations', workspaceId, platform, accountId],
    enabled: Boolean(workspaceId),
    queryFn: async ({ pageParam: _pageParam }: { pageParam: string | undefined }) => {
      if (!workspaceId) return asPage<InboxConversationDto>([])
      const items = await inboxApi.getConversations(workspaceId)
      return asPage(items)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  // ── Comments tab ─────────────────────────────────────────────────────

  const commentsQuery = useInfiniteQuery({
    queryKey: ['inbox-comments', workspaceId, platform, accountId],
    enabled: Boolean(workspaceId),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!workspaceId) return asPage<InboxCommentDto>([])
      const items = await inboxApi.getComments(
        workspaceId,
        50,
        pageParam,
        platform,
        accountId,
      )
      return asPage(items)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  // ── Reviews tab ──────────────────────────────────────────────────────

  const reviewsQuery = useInfiniteQuery({
    queryKey: ['inbox-reviews', workspaceId, platform, accountId],
    enabled: Boolean(workspaceId),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!workspaceId) return asPage<InboxReviewDto>([])
      const items = await inboxApi.getReviews(
        workspaceId,
        50,
        pageParam,
        platform,
        accountId,
      )
      return asPage(items)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  // ── Mutations ─────────────────────────────────────────────────────────

  /** Mark a conversation read. Optimistically clears unread dot. */
  const markConversationRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.markConversationRead(workspaceId, conversationId)
    },
    onMutate: async (_conversationId) => {
      const queryKey = ['inbox-conversations', workspaceId, platform, accountId]
      await queryClient.cancelQueries({ queryKey })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] })
    },
  })

  /** Mark a comment read. */
  const markCommentRead = useMutation({
    mutationFn: async (commentId: string) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.markCommentRead(workspaceId, commentId)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
      void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] })
    },
  })

  /** Mark a review read. */
  const markReviewRead = useMutation({
    mutationFn: async (reviewId: string) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.markReviewRead(workspaceId, reviewId)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-reviews'] })
      void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] })
    },
  })

  /** Send a DM reply (optimistic: D-12). */
  const sendDmReply = useMutation({
    mutationFn: async ({
      conversationId,
      text,
      accountId,
    }: {
      conversationId: string
      text: string
      accountId: string
    }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      return inboxApi.sendDmReply(workspaceId, conversationId, text, accountId)
    },
    onSuccess: () => {
      success('Reply sent')
    },
    onError: () => {
      error('Message not sent — Your reply could not be delivered. Try again.')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] })
    },
  })

  /** Reply to a comment. */
  const replyToComment = useMutation({
    mutationFn: async ({
      commentId,
      message,
    }: {
      commentId: string
      message: string
    }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      return inboxApi.replyToComment(workspaceId, commentId, message)
    },
    onSuccess: () => success('Reply sent'),
    onError: () => error('Message not sent — Your reply could not be delivered. Try again.'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  /** Reply to a review. */
  const replyToReview = useMutation({
    mutationFn: async ({
      reviewId,
      message,
    }: {
      reviewId: string
      message: string
    }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      return inboxApi.replyToReview(workspaceId, reviewId, message)
    },
    onSuccess: () => success('Reply sent'),
    onError: () => error('Message not sent — Your reply could not be delivered. Try again.'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-reviews'] })
    },
  })

  const likeComment = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.likeComment(workspaceId, postId, commentId)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  const unlikeComment = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.unlikeComment(workspaceId, postId, commentId)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  const hideComment = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.hideComment(workspaceId, postId, commentId)
    },
    onSuccess: () => success('Comment hidden'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  const unhideComment = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.unhideComment(workspaceId, postId, commentId)
    },
    onSuccess: () => success('Comment unhidden'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  const deleteComment = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.deleteComment(workspaceId, postId)
    },
    onSuccess: () => success('Comment deleted'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  const sendPrivateReply = useMutation({
    mutationFn: async ({ postId, commentId, message }: { postId: string; commentId: string; message: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      return inboxApi.sendPrivateReply(workspaceId, postId, commentId, message)
    },
    onSuccess: () => success('Private DM sent to commenter'),
    onError: () => error('Could not send private reply.'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-comments'] })
    },
  })

  const deleteReviewReply = useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await inboxApi.deleteReviewReply(workspaceId, reviewId)
    },
    onSuccess: () => success('Review reply deleted'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-reviews'] })
    },
  })

  return {
    unreadCount,
    conversations: conversationsQuery,
    comments: commentsQuery,
    reviews: reviewsQuery,
    summary: summaryQuery,
    markConversationRead: markConversationRead.mutateAsync,
    markCommentRead: markCommentRead.mutateAsync,
    markReviewRead: markReviewRead.mutateAsync,
    sendDmReply: sendDmReply.mutateAsync,
    replyToComment: replyToComment.mutateAsync,
    replyToReview: replyToReview.mutateAsync,
    likeComment: likeComment.mutateAsync,
    unlikeComment: unlikeComment.mutateAsync,
    hideComment: hideComment.mutateAsync,
    unhideComment: unhideComment.mutateAsync,
    deleteComment: deleteComment.mutateAsync,
    sendPrivateReply: sendPrivateReply.mutateAsync,
    deleteReviewReply: deleteReviewReply.mutateAsync,
  }
}
