import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type OverviewResult = any

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async (): Promise<{ overview?: OverviewResult; workspaces?: any[]; jobs?: any[] } > => {
      try {
        const overview = await adminApi.getOverview()
        return { overview, workspaces: overview?.workspaces ?? [], jobs: [] }
      } catch (error) {
        return { overview: undefined, workspaces: [], jobs: [] }
      }
    },
    staleTime: 60_000,
  })
}
