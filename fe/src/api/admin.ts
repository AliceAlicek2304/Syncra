import api from '../lib/axios'

export const adminApi = {
  checkAccess: async (): Promise<{ allowed: boolean }> => {
    const res = await api.get('/admin/access', { skipGlobalError: true } as any)
    return res.data
  },
  getOverview: async () => {
    const res = await api.get('/admin/overview')
    return res.data
  },
  getUserGrowth: async () => {
    const res = await api.get('/admin/users-growth')
    return res.data
  },
  getPostAnalytics: async () => {
    const res = await api.get('/admin/posts-analytics')
    return res.data
  },
  getRevenueAnalytics: async () => {
    const res = await api.get('/admin/revenue-analytics')
    return res.data
  },
  listJobs: async () => {
    const res = await api.get('/admin/jobs')
    return res.data
  },
  listWorkspaces: async () => {
    const res = await api.get('/workspaces')
    return res.data
  },
}

export default adminApi
