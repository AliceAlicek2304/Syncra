import api from '../lib/axios'

export type AdminVoucher = {
  id: string
  code: string
  name: string
  description?: string | null
  discountType: 'percent' | 'amount' | string
  percentOff?: number | null
  amountOff?: number | null
  currency: string
  minimumAmount?: number | null
  applicablePlanCodesJson?: string | null
  applicableIntervalsJson?: string | null
  maxRedemptions?: number | null
  maxRedemptionsPerUser?: number | null
  redeemedCount: number
  startsAtUtc?: string | null
  expiresAtUtc?: string | null
  isActive: boolean
  requiresStudentVerification: boolean
  source: string
  createdAtUtc: string
  updatedAtUtc?: string | null
  redemptionCount: number
}

export type UpsertAdminVoucherRequest = {
  code: string
  name: string
  description?: string | null
  discountType: 'percent' | 'amount'
  percentOff?: number | null
  amountOff?: number | null
  minimumAmount?: number | null
  applicablePlanCodes?: string[] | null
  applicableIntervals?: string[] | null
  maxRedemptions?: number | null
  maxRedemptionsPerUser?: number | null
  startsAtUtc?: string | null
  expiresAtUtc?: string | null
  isActive: boolean
  requiresStudentVerification: boolean
  source?: string | null
}

export type AdminVoucherRedemption = {
  id: string
  userId: string
  userEmail: string
  planId: string
  planCode: string
  status: string
  originalAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
  checkoutSessionId?: string | null
  paymentProvider?: string | null
  redeemedAtUtc: string
}

export type ActivityMetric = {
  key: string
  count: number
}

export type ActivityEvent = {
  id: string
  workspaceId?: string | null
  workspaceName?: string | null
  userId?: string | null
  userEmail?: string | null
  eventType: string
  eventGroup: string
  status: string
  title: string
  description?: string | null
  subjectType?: string | null
  subjectId?: string | null
  metadata?: string | null
  createdAtUtc: string
}

export type ActivityEventsResponse = {
  retentionDays: number
  generatedAtUtc: string
  groupCounts24h: ActivityMetric[]
  statusCounts24h: ActivityMetric[]
  events: ActivityEvent[]
}

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
  listVouchers: async (): Promise<AdminVoucher[]> => {
    const res = await api.get('/admin/vouchers')
    return res.data
  },
  createVoucher: async (payload: UpsertAdminVoucherRequest): Promise<AdminVoucher> => {
    const res = await api.post('/admin/vouchers', payload)
    return res.data
  },
  updateVoucher: async (id: string, payload: UpsertAdminVoucherRequest): Promise<AdminVoucher> => {
    const res = await api.put(`/admin/vouchers/${id}`, payload)
    return res.data
  },
  updateVoucherStatus: async (id: string, isActive: boolean): Promise<AdminVoucher> => {
    const res = await api.patch(`/admin/vouchers/${id}/status`, { isActive })
    return res.data
  },
  listVoucherRedemptions: async (id: string): Promise<AdminVoucherRedemption[]> => {
    const res = await api.get(`/admin/vouchers/${id}/redemptions`)
    return res.data
  },
  listActivityEvents: async (params?: { group?: string; status?: string; limit?: number }): Promise<ActivityEventsResponse> => {
    const res = await api.get('/admin/activity-events', { params })
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
