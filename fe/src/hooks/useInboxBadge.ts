import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../context/WorkspaceContext';
import { inboxApi } from '../api/inbox';

/**
 * Lightweight hook that polls the inbox unread count for the nav badge.
 * Separate from the full useInbox hook so AppLayout doesn't have to
 * load all inbox data just to show a badge number.
 */
export function useInboxBadge() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const { data } = useQuery({
    queryKey: ['inbox-unread-badge', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<number> => {
      if (!workspaceId) return 0;
      const summary = await inboxApi.getInboxSummary(workspaceId);
      return summary.unreadTotal;
    },
    refetchInterval: 30_000,
  });

  return {
    unreadCount: data ?? 0,
  };
}
