import { useEffect, useMemo } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import type { NotificationItem } from '../api/notifications'

interface UseNotificationHubArgs {
  workspaceId?: string
}

export function useNotificationHub({ workspaceId }: UseNotificationHubArgs) {
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: ['notifications', workspaceId],
    enabled: Boolean(workspaceId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!workspaceId) return []
      return notificationsApi.listNotifications(workspaceId, { take: 50 })
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

    void connection.start().catch(() => {
      // no-op: polling fallback remains active via query refetch interval (30s)
    })

    return () => {
      connection.off('notification.created')
      void connection.stop()
    }
  }, [queryClient, workspaceId])

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
