import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import AnalyticsPage from './AnalyticsPage'

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    workspaces: [{ id: 'ws-1', name: 'Workspace 1' }],
    activeWorkspace: { id: 'ws-1', name: 'Workspace 1' },
    setActiveWorkspace: vi.fn(),
  }),
}))

const mockRefresh = vi.fn()

vi.mock('../../hooks/useAnalyticsSummary', () => ({
  useAnalyticsSummary: vi.fn(),
}))

async function mockHook(overrides: Record<string, unknown>) {
  const mod = await import('../../hooks/useAnalyticsSummary')
  const fn = mod.useAnalyticsSummary as Mock
  fn.mockReturnValue({
    presetDays: 30,
    setPresetDays: vi.fn(),
    presetOptions: [{ label: 'Last 30 days', days: 30 }],
    selectedPresetLabel: 'Last 30 days',
    rangeLabel: 'Apr 24 – May 23, 2026',
    heatmapPlatform: undefined,
    setHeatmapPlatform: vi.fn(),
    dailyMetrics: null,
    topPosts: [],
    bestTime: null,
    followerStats: null,
    contentDecay: null,
    postingFrequency: null,
    dataUpdatedAt: 0,
    isLoading: false,
    isFetching: false,
    isError: false,
    isBillingGateError: false,
    isScopeError: false,
    analyticsError: null,
    refresh: mockRefresh,
    ...overrides,
  })
}

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

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title and subtitle', async () => {
    await mockHook({ isLoading: true })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    expect(screen.getByText('Analytics')).toBeDefined()
    expect(screen.getByText('View post performance metrics')).toBeDefined()
  })

  it('renders refresh button', async () => {
    await mockHook({})
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    expect(screen.getByTestId('refresh-analytics-btn')).toBeDefined()
  })

  it('calls refresh when refresh button clicked', async () => {
    mockRefresh.mockClear()
    await mockHook({})
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('refresh-analytics-btn'))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('renders summary metrics when data is available', async () => {
    await mockHook({
      dailyMetrics: {
        dailyData: [],
        platformBreakdown: [
          {
            platform: 'facebook',
            postCount: 12,
            impressions: 100000,
            reach: 50000,
            likes: 2250,
            comments: 100,
            shares: 50,
            saves: 0,
            clicks: 0,
            views: 0,
          },
        ],
      },
      bestTime: { slots: [] },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Total Reach')).toBeDefined()
    })
    expect(screen.getByText('Avg. Engagement')).toBeDefined()
    expect(screen.getByText('Total followers')).toBeDefined()
    expect(screen.getByText('Posts this period')).toBeDefined()
  })

  it('shows billing gate banner for 402 status', async () => {
    await mockHook({
      isError: true,
      isBillingGateError: true,
      analyticsError: {
        status: 402,
        code: 'PAYMENT_REQUIRED',
        message: 'Analytics add-on is required.',
        dashboardUrl: 'https://zernio.com/dashboard/billing',
      },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('billing-gate-banner')).toBeDefined()
    })
    expect(screen.getByText('Analytics Add-on Required')).toBeDefined()
    expect(screen.getByText('Upgrade Plan')).toBeDefined()
  })

  it('shows billing gate banner for 403 analytics_addon_required', async () => {
    await mockHook({
      isError: true,
      isBillingGateError: true,
      analyticsError: {
        status: 403,
        code: 'analytics_addon_required',
        message: 'Analytics add-on is required.',
        dashboardUrl: 'https://zernio.com/dashboard/billing',
      },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('billing-gate-banner')).toBeDefined()
    })
    expect(screen.getByText('Analytics Add-on Required')).toBeDefined()
  })

  it('shows reauthorization banner for 412 status', async () => {
    await mockHook({
      isError: true,
      isScopeError: true,
      analyticsError: {
        status: 412,
        code: 'analytics_scope_required',
        message: 'Additional analytics permissions are required.',
        platform: 'instagram',
        reauthorizeUrl: 'https://zernio.com/dashboard/analytics/reauth',
      },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('reauth-banner')).toBeDefined()
    })
    expect(screen.getByText(/Re-authorization Required/)).toBeDefined()
    expect(screen.getByText('Re-authorize')).toBeDefined()
  })

  it('shows generic error banner for other errors', async () => {
    await mockHook({
      isError: true,
      isBillingGateError: false,
      isScopeError: false,
      analyticsError: { status: 500, code: 'internal_error', message: 'Server error' },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('generic-error-banner')).toBeDefined()
    })
    expect(screen.getByText('Retry')).toBeDefined()
  })

  it('dismisses billing gate banner when dismiss clicked', async () => {
    await mockHook({
      isError: true,
      isBillingGateError: true,
      analyticsError: {
        status: 402,
        code: 'PAYMENT_REQUIRED',
        message: 'Analytics add-on is required.',
        dashboardUrl: 'https://zernio.com/dashboard/billing',
      },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('billing-gate-banner')).toBeDefined()
    })
    fireEvent.click(screen.getByText('Dismiss'))
    await waitFor(() => {
      expect(screen.queryByTestId('billing-gate-banner')).toBeNull()
    })
  })

  it('shows heatmap platform filter button', async () => {
    await mockHook({
      bestTime: { slots: [] },
    })
    render(<AnalyticsPage />, { wrapper: createWrapper() })
    expect(screen.getByTestId('heatmap-platform-filter')).toBeDefined()
    expect(screen.getByText('All Platforms')).toBeDefined()
  })
})
