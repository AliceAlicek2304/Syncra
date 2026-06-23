import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type RevenueAnalyticsResult = any

export function useRevenueAnalytics() {
  return useQuery({
    queryKey: ['admin', 'revenue-analytics'],
    queryFn: async (): Promise<RevenueAnalyticsResult> => {
      return adminApi.getRevenueAnalytics()
    },
    staleTime: 30_000,
  })
}
