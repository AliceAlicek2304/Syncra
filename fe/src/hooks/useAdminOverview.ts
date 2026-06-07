import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type OverviewResult = any

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async (): Promise<{ overview?: OverviewResult; workspaces?: any[]; jobs?: any[] } > => {
      try {
        const overview = await adminApi.getOverview()
        console.log('Admin overview data:', overview)
        return { overview, workspaces: overview?.workspaces ?? [], jobs: [] }
      } catch (error) {
        console.error('Failed to fetch admin overview:', error)
        return { overview: undefined, workspaces: [], jobs: [] }
      }
    },
    staleTime: 60_000,
  })
}
