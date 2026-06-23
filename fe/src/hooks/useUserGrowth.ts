import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

type UserGrowthResult = any

export function useUserGrowth() {
  return useQuery({
    queryKey: ['admin', 'user-growth'],
    queryFn: async (): Promise<UserGrowthResult> => {
      return adminApi.getUserGrowth()
    },
    staleTime: 30_000,
  })
}
