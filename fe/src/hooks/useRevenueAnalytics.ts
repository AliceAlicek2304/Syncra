import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type RevenueAnalyticsResult = any

export function useRevenueAnalytics() {
  return useQuery({
    queryKey: ['admin', 'revenue-analytics'],
    queryFn: async (): Promise<RevenueAnalyticsResult> => {
      try {
        const data = await adminApi.getRevenueAnalytics()
        console.log('Revenue analytics data from API:', JSON.stringify(data, null, 2))
        console.log('Data keys:', Object.keys(data || {}))
        return data
      } catch (error) {
        console.error('Failed to fetch revenue analytics:', error)
        throw error
      }
    },
    staleTime: 0, // Disable cache to force fresh data
  })
}
