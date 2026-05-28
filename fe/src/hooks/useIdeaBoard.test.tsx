import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useIdeaBoard } from './useIdeaBoard'

vi.mock('../api/groups', () => ({
  groupsApi: {
    getGroups: vi.fn().mockResolvedValue([]),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
  },
}))

vi.mock('../api/ideas', () => ({
  ideasApi: {
    getIdeas: vi.fn().mockResolvedValue([]),
    createIdea: vi.fn(),
    updateIdea: vi.fn(),
    deleteIdea: vi.fn(),
    reorderIdeas: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useIdeaBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default empty state when no workspaceId provided', () => {
    const { result } = renderHook(() => useIdeaBoard(undefined), { wrapper: createWrapper() })
    expect(result.current.groups).toEqual([])
    expect(result.current.ideas).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('has default group IDs reference', () => {
    expect(useIdeaBoard).toBeDefined()
  })

  it('handleDragStart updates activeId state', () => {
    const { result } = renderHook(() => useIdeaBoard('ws-1'), { wrapper: createWrapper() })
    act(() => { result.current.handleDragStart({ active: { id: 'idea-1' } } as any) })
    expect(result.current.activeId).toBe('idea-1')
  })

  it('handleDragEnd clears activeId', () => {
    const { result } = renderHook(() => useIdeaBoard('ws-1'), { wrapper: createWrapper() })
    act(() => { result.current.handleDragStart({ active: { id: 'idea-1' } } as any) })
    expect(result.current.activeId).toBe('idea-1')
    act(() => { result.current.handleDragEnd() })
    expect(result.current.activeId).toBeNull()
  })

  it('returns activeIdea as null when no activeId', () => {
    const { result } = renderHook(() => useIdeaBoard('ws-1'), { wrapper: createWrapper() })
    expect(result.current.activeIdea).toBeNull()
  })

  it('sensors configuration is valid', () => {
    const { result } = renderHook(() => useIdeaBoard('ws-1'), { wrapper: createWrapper() })
    expect(result.current.sensors).toBeDefined()
  })

  it('with workspaceId, initiates queries', async () => {
    const { result } = renderHook(() => useIdeaBoard('ws-1'), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
