import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type RevenueAnalyticsResult = any

export function useRevenueAnalytics() {
  return useQuery({
    queryKey: ['admin', 'revenue-analytics'],
    queryFn: async (): Promise<RevenueAnalyticsResult> => {
      try {
        const data = await adminApi.getRevenueAnalytics()
        return data
      } catch (error) {
        throw error
      }
    },
    staleTime: 0, // Disable cache to force fresh data
  })
}
