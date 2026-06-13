import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type UserGrowthResult = any

export function useUserGrowth() {
  return useQuery({
    queryKey: ['admin', 'user-growth'],
    queryFn: async (): Promise<UserGrowthResult> => {
      try {
        const data = await adminApi.getUserGrowth()
        console.log('User growth data from API:', JSON.stringify(data, null, 2))
        console.log('Data keys:', Object.keys(data || {}))
        console.log('Activity trends:', data?.activityTrends || data?.ActivityTrends)
        console.log('Activity trends keys:', Object.keys(data?.activityTrends || data?.ActivityTrends || {}))
        return data
      } catch (error) {
        console.error('Failed to fetch user growth:', error)
        throw error
      }
    },
    staleTime: 0, // Disable cache to force fresh data
  })
}
