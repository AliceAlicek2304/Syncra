import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type OverviewResult = any

// Only fetch endpoints that actually exist on the backend.
// The backend does not expose a global /admin/overview or /admin/jobs endpoint,
// so we avoid calling them and only request /workspaces. The UI will fall
// back to mocked overview/metrics when those values are not available.
export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'workspaces'],
    queryFn: async (): Promise<{ overview?: OverviewResult; workspaces?: any[]; jobs?: any[] } > => {
      const workspaces = await adminApi.listWorkspaces().catch(() => [])
      return { overview: undefined, workspaces, jobs: [] }
    },
    staleTime: 60_000,
  })
}
