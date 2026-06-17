import { useEffect, useMemo } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import type { NotificationItem } from '../api/notifications'
import { useToast } from '../context/ToastContext'
import type { Post } from '../api/posts'

interface UseNotificationHubArgs {
  workspaceId?: string
}

export function useNotificationHub({ workspaceId }: UseNotificationHubArgs) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const notificationsQuery = useQuery({
    queryKey: ['notifications', workspaceId],
    enabled: Boolean(workspaceId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!workspaceId) return []
      const result = await notificationsApi.listNotifications(workspaceId, { pageSize: 50 })
      return result.items
    },
  })

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await notificationsApi.markRead(workspaceId, notificationId)
      return notificationId
    },
    onMutate: async (notificationId) => {
      const queryKey = ['notifications', workspaceId] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NotificationItem[]>(queryKey) ?? []

      queryClient.setQueryData<NotificationItem[]>(
        queryKey,
        previous.map((item) =>
          item.id === notificationId ? { ...item, readAtUtc: item.readAtUtc ?? new Date().toISOString() } : item
        )
      )

      return { previous }
    },
    onError: (_error, _id, context) => {
      if (!context?.previous) return
      queryClient.setQueryData(['notifications', workspaceId], context.previous)
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Missing workspace id')
      await notificationsApi.markAllRead(workspaceId)
    },
    onMutate: async () => {
      const queryKey = ['notifications', workspaceId] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NotificationItem[]>(queryKey) ?? []

      queryClient.setQueryData<NotificationItem[]>(
        queryKey,
        previous.map((item) => ({ ...item, readAtUtc: item.readAtUtc ?? new Date().toISOString() }))
      )

      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (!context?.previous) return
      queryClient.setQueryData(['notifications', workspaceId], context.previous)
    },
  })

  useEffect(() => {
    if (!workspaceId) return

    const token = localStorage.getItem('syncra_access_token')
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
    const defaultBaseUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}api/v1`
    const apiBaseUrl = (configuredBaseUrl || defaultBaseUrl).replace(/\/+$/, '')
    const hubUrl = `${apiBaseUrl}/hubs/notifications?workspaceId=${workspaceId}`

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build()

    connection.on('notification.created', () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
    })

    connection.on('post.statusUpdated', (payload: any) => {
      const { postId, status, zernioTargetCount, platformTargets } = payload

      queryClient.setQueriesData<Post[]>(
        { queryKey: ['posts', workspaceId] },
        (oldData) => {
          if (!oldData) return oldData
          return oldData.map((post) =>
            post.id === postId
              ? { ...post, status, zernioTargetCount, platformTargets }
              : post
          )
        }
      )

      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['post', workspaceId, postId] })
      void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })

      if (status === 'published') {
        const publishedCount = platformTargets?.filter((t: any) => t.status === 'Published' || t.status === 'published').length || 0
        const totalCount = zernioTargetCount || platformTargets?.length || 0
        success(`Post published to ${publishedCount}/${totalCount} platforms`)
      } else if (status === 'partial') {
        const failedCount = platformTargets?.filter((t: any) => t.status === 'Failed' || t.status === 'failed').length || 0
        success(`Post partially published — ${failedCount} failed`)
      } else if (status === 'failed') {
        error('Post failed on all platforms')
      }
    })

    void connection.start().catch(() => {
      // no-op: polling fallback remains active via query refetch interval (30s)
    })

    return () => {
      connection.off('notification.created')
      connection.off('post.statusUpdated')
      void connection.stop()
    }
  }, [queryClient, workspaceId, success, error])

  const notificationsData = notificationsQuery.data
  const notifications = notificationsData ?? []
  const unread = useMemo(() => (notificationsData ?? []).filter((item) => !item.readAtUtc), [notificationsData])

  return {
    notifications,
    unread,
    hasUnread: unread.length > 0,
    isLoading: notificationsQuery.isLoading,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
  }
}
