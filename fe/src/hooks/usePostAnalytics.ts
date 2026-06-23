import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type PostAnalyticsResult = any

export function usePostAnalytics() {
  return useQuery({
    queryKey: ['admin', 'post-analytics'],
    queryFn: async (): Promise<PostAnalyticsResult> => {
      try {
        const data = await adminApi.getPostAnalytics()
        console.log('Post analytics data from API:', JSON.stringify(data, null, 2))
        console.log('Data keys:', Object.keys(data || {}))
        return data
      } catch (error) {
        console.error('Failed to fetch post analytics:', error)
        throw error
      }
    },
    staleTime: 0, // Disable cache to force fresh data
  })
}
