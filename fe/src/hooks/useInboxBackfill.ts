import { useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inboxApi } from '../api/inbox'
import type { InboxSyncStatusDto } from '../api/inbox'

interface UseInboxBackfillArgs {
  workspaceId?: string
}

/**
 * Hook that manages inbox backfill lifecycle on first inbox open (D-09, D-11).
 *
 * - On mount: triggers sync via POST .../inbox/sync if backfill never completed.
 * - Polls GET .../inbox/sync-status while IsSyncing is true.
 * - Returns sync status for skeleton + banner rendering.
 */
export function useInboxBackfill({ workspaceId }: UseInboxBackfillArgs) {
  const hasTriggeredSync = useRef(false)

  const syncStatusQuery = useQuery({
    queryKey: ['inbox-sync-status', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<InboxSyncStatusDto | null> => {
      if (!workspaceId) return null
      return inboxApi.getInboxSyncStatus(workspaceId)
    },
    refetchInterval: (query) => {
      // Poll every 3 seconds while syncing
      const data = query.state.data
      if (data?.isSyncing) return 3_000
      return false
    },
  })

  const triggerSync = useCallback(async () => {
    if (!workspaceId) return
    try {
      await inboxApi.triggerInboxSync(workspaceId)
    } catch {
      // Sync trigger failure is non-critical — webhooks will still populate new items
    }
  }, [workspaceId])

  // Trigger sync on mount if never synced
  useEffect(() => {
    if (!workspaceId) return
    if (hasTriggeredSync.current) return

    const data = syncStatusQuery.data
    if (data && !data.lastSyncedAtUtc && !data.isSyncing) {
      hasTriggeredSync.current = true
      void triggerSync()
    }
  }, [workspaceId, syncStatusQuery.data, triggerSync])

  const isSyncing = syncStatusQuery.data?.isSyncing ?? false
  const lastSyncedAtUtc = syncStatusQuery.data?.lastSyncedAtUtc ?? null

  return {
    isSyncing,
    lastSyncedAtUtc,
    isLoading: syncStatusQuery.isLoading,
    triggerSync,
  }
}
