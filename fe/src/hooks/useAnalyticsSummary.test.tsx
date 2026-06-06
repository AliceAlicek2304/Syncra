import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

vi.mock('../api/analytics', () => {
  return {
    analyticsApi: {
      getDailyMetrics: vi.fn().mockResolvedValue({ dailyData: [], platformBreakdown: [] }),
      getBestTime: vi.fn().mockResolvedValue({ slots: [] }),
      getAnalyticsList: vi.fn().mockResolvedValue({ posts: [] }),
      getFollowerStats: vi.fn().mockResolvedValue({ accounts: [] }),
      getContentDecay: vi.fn().mockResolvedValue({ decayCurve: [] }),
      getPostingFrequency: vi.fn().mockResolvedValue({ buckets: [] }),
    },
  }
})

import { analyticsApi } from '../api/analytics'
import { useAnalyticsSummary } from './useAnalyticsSummary'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const today = new Date()
const expectedFromDate = new Date(today)
expectedFromDate.setDate(today.getDate() - 30)
const expectedFromDateStr = expectedFromDate.toISOString().split('T')[0]

describe('useAnalyticsSummary — Analytics page load contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('issues exactly the 6 contract endpoints on initial mount with the correct params', async () => {
    renderHook(() => useAnalyticsSummary({ workspaceId: 'ws-1' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(analyticsApi.getDailyMetrics).toHaveBeenCalledTimes(1)
      expect(analyticsApi.getBestTime).toHaveBeenCalledTimes(1)
      expect(analyticsApi.getAnalyticsList).toHaveBeenCalledTimes(1)
      expect(analyticsApi.getFollowerStats).toHaveBeenCalledTimes(1)
      expect(analyticsApi.getContentDecay).toHaveBeenCalledTimes(1)
      expect(analyticsApi.getPostingFrequency).toHaveBeenCalledTimes(1)
    })

    // 1. daily-metrics — only fromDate, no toDate/source
    expect(analyticsApi.getDailyMetrics).toHaveBeenCalledWith(
      { fromDate: expectedFromDateStr },
      'ws-1'
    )

    // 2. best-time — no params
    expect(analyticsApi.getBestTime).toHaveBeenCalledWith('ws-1')

    // 3. analytics (top-posts) — only the 4 contract params
    expect(analyticsApi.getAnalyticsList).toHaveBeenCalledWith('ws-1', {
      sortBy: 'engagement',
      order: 'desc',
      limit: 10,
      fromDate: expectedFromDateStr,
    })

    // 4. follower-stats — only fromDate
    expect(analyticsApi.getFollowerStats).toHaveBeenCalledWith('ws-1', {
      fromDate: expectedFromDateStr,
    })

    // 5. content-decay — no params
    expect(analyticsApi.getContentDecay).toHaveBeenCalledWith('ws-1')

    // 6. posting-frequency — no params
    expect(analyticsApi.getPostingFrequency).toHaveBeenCalledWith('ws-1')
  })

  it('passes null workspace id when filter is "all" so the backend gets the empty header', async () => {
    renderHook(() => useAnalyticsSummary({ workspaceId: 'all' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(analyticsApi.getBestTime).toHaveBeenCalled()
    })

    expect(analyticsApi.getDailyMetrics).toHaveBeenCalledWith(
      { fromDate: expectedFromDateStr },
      null
    )
    expect(analyticsApi.getBestTime).toHaveBeenCalledWith(null)
    expect(analyticsApi.getAnalyticsList).toHaveBeenCalledWith(null, {
      sortBy: 'engagement',
      order: 'desc',
      limit: 10,
      fromDate: expectedFromDateStr,
    })
    expect(analyticsApi.getFollowerStats).toHaveBeenCalledWith(null, {
      fromDate: expectedFromDateStr,
    })
    expect(analyticsApi.getContentDecay).toHaveBeenCalledWith(null)
    expect(analyticsApi.getPostingFrequency).toHaveBeenCalledWith(null)
  })

  it('does NOT call any analytics API when workspaceId is missing', async () => {
    renderHook(() => useAnalyticsSummary({}), { wrapper: makeWrapper() })

    // Give React Query a chance to fire
    await new Promise((r) => setTimeout(r, 50))

    expect(analyticsApi.getDailyMetrics).not.toHaveBeenCalled()
    expect(analyticsApi.getBestTime).not.toHaveBeenCalled()
    expect(analyticsApi.getAnalyticsList).not.toHaveBeenCalled()
    expect(analyticsApi.getFollowerStats).not.toHaveBeenCalled()
    expect(analyticsApi.getContentDecay).not.toHaveBeenCalled()
    expect(analyticsApi.getPostingFrequency).not.toHaveBeenCalled()
  })
})
