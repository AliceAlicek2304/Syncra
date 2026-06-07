import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import DashboardPage from './DashboardPage'

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspace: { id: 'ws-1' } }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', displayName: 'Test User' } }),
}))

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('../../api/analytics', () => ({
  analyticsApi: {
    getDailyMetrics: vi.fn(),
  },
}))

vi.mock('../../api/posts', () => ({
  postsApi: {
    getPosts: vi.fn(),
  },
}))

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const mockDailyMetrics = {
  dailyData: [],
  platformBreakdown: [
    {
      platform: 'instagram',
      postCount: 12,
      reach: 50000,
      likes: 1000,
      comments: 500,
      shares: 750,
      impressions: 50000,
      views: 0,
      saves: 0,
      clicks: 0
    }
  ]
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton loaders while data is loading', async () => {
    vi.mocked((await import('../../api/analytics')).analyticsApi.getDailyMetrics).mockReturnValue(new Promise(() => {}))
    vi.mocked((await import('../../api/posts')).postsApi.getPosts).mockReturnValue(new Promise(() => {}))
    vi.mocked((await import('../../lib/axios')).default.get).mockReturnValue(new Promise(() => {}))

    render(<DashboardPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(4)
    })
  })

  it('renders summary cards with real data', async () => {
    const { analyticsApi } = await import('../../api/analytics')
    const { postsApi } = await import('../../api/posts')
    const axios = await import('../../lib/axios')

    vi.mocked(analyticsApi.getDailyMetrics).mockResolvedValue(mockDailyMetrics)
    vi.mocked(postsApi.getPosts).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } })
    vi.mocked(axios.default.get).mockResolvedValue({ data: [] })

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Tổng lượt reach')).toBeDefined()
    })

    expect(screen.getByText('Engagement rate')).toBeDefined()
    expect(screen.getByText('Platforms kết nối')).toBeDefined()
    expect(screen.getByText('Tổng posts')).toBeDefined()
  })

  it('renders recent posts when posts are returned', async () => {
    const { analyticsApi } = await import('../../api/analytics')
    const { postsApi } = await import('../../api/posts')
    const axios = await import('../../lib/axios')

    vi.mocked(analyticsApi.getDailyMetrics).mockResolvedValue(mockDailyMetrics)
    vi.mocked(axios.default.get).mockResolvedValue({ data: [] })
    vi.mocked(postsApi.getPosts).mockResolvedValue({
      items: [
        { id: 'p1', title: 'Post 1', status: 'published', platforms: ['Instagram'], createdAt: '2026-05-10T12:00:00Z', updatedAt: '2026-05-10T12:00:00Z' },
        { id: 'p2', title: 'Post 2', status: 'draft', platforms: ['TikTok'], createdAt: '2026-05-11T10:00:00Z', updatedAt: '2026-05-11T10:00:00Z' },
      ],
      pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }
    })

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Post 1')).toBeDefined()
    })
    expect(screen.getByText('Post 2')).toBeDefined()
  })

  it('shows error state when summary query fails', async () => {
    const { analyticsApi } = await import('../../api/analytics')
    const { postsApi } = await import('../../api/posts')
    const axios = await import('../../lib/axios')

    vi.mocked(analyticsApi.getDailyMetrics).mockRejectedValue(new Error('API Error'))
    vi.mocked(postsApi.getPosts).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } })
    vi.mocked(axios.default.get).mockResolvedValue({ data: [] })

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getAllByText(/Không thể tải dữ liệu/).length).toBe(4)
    })
  })

  it('shows error fallback when posts query fails', async () => {
    const { analyticsApi } = await import('../../api/analytics')
    const { postsApi } = await import('../../api/posts')
    const axios = await import('../../lib/axios')

    vi.mocked(analyticsApi.getDailyMetrics).mockResolvedValue(mockDailyMetrics)
    vi.mocked(postsApi.getPosts).mockRejectedValue(new Error('Posts Error'))
    vi.mocked(axios.default.get).mockResolvedValue({ data: [] })

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải posts/)).toBeDefined()
    })
  })

  it('handles empty data gracefully', async () => {
    const { analyticsApi } = await import('../../api/analytics')
    const { postsApi } = await import('../../api/posts')
    const axios = await import('../../lib/axios')

    vi.mocked(analyticsApi.getDailyMetrics).mockResolvedValue(mockDailyMetrics)
    vi.mocked(postsApi.getPosts).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } })
    vi.mocked(axios.default.get).mockResolvedValue({ data: [] })

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Chưa có post nào/)).toBeDefined()
    })
  })
})
