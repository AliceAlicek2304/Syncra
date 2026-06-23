import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type PostAnalyticsResult = any

export function usePostAnalytics() {
  return useQuery({
    queryKey: ['admin', 'post-analytics'],
    queryFn: async (): Promise<PostAnalyticsResult> => {
      return adminApi.getPostAnalytics()
    },
    staleTime: 30_000,
  })
}
