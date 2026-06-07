import api from '../lib/axios'

export const adminApi = {
  getOverview: async () => {
    const res = await api.get('/admin/overview')
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
