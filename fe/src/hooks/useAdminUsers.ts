import { useQuery } from '@tanstack/react-query'
import adminApi from '../api/admin'

export function useAdminUsers(page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: ['admin', 'users', page, pageSize, search],
    queryFn: () => adminApi.listUsers({ page, pageSize, search: search.trim() || undefined }),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })
}
