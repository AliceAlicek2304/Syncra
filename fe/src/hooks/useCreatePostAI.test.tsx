import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCreatePostAI } from './useCreatePostAI'

vi.mock('../api/ai', () => ({
  aiApi: {
    generateIdeas: vi.fn(),
  },
}))

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspace: { id: 'ws-1' } }),
}))

function createWrapper() {
  return ({ children }: { children: ReactNode }) => <>{children}</>
}

describe('useCreatePostAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default state', () => {
    const { result } = renderHook(() => useCreatePostAI(), { wrapper: createWrapper() })
    expect(result.current.aiPrompt).toBe('')
    expect(result.current.aiResults).toEqual([])
    expect(result.current.aiIsGenerating).toBe(false)
    expect(result.current.showAI).toBe(false)
  })

  it('setAiPrompt updates the prompt value', () => {
    const { result } = renderHook(() => useCreatePostAI(), { wrapper: createWrapper() })
    act(() => { result.current.setAiPrompt('New idea') })
    expect(result.current.aiPrompt).toBe('New idea')
  })

  it('setShowAI toggles the AI panel visibility', () => {
    const { result } = renderHook(() => useCreatePostAI(), { wrapper: createWrapper() })
    act(() => { result.current.setShowAI(true) })
    expect(result.current.showAI).toBe(true)
    act(() => { result.current.setShowAI(false) })
    expect(result.current.showAI).toBe(false)
  })

  it('handleGenerateAI triggers loading state', async () => {
    const { aiApi } = await import('../api/ai')
    vi.mocked(aiApi.generateIdeas).mockResolvedValue({ ideas: [] })
    const { result } = renderHook(() => useCreatePostAI(), { wrapper: createWrapper() })
    act(() => { result.current.setAiPrompt('Test topic') })
    await act(async () => { await result.current.handleGenerateAI() })
    expect(aiApi.generateIdeas).toHaveBeenCalled()
  })

  it('applyAISuggestion clears the AI prompt state', () => {
    const { result } = renderHook(() => useCreatePostAI(), { wrapper: createWrapper() })
    act(() => { result.current.setAiPrompt('Some prompt') })
    expect(result.current.aiPrompt).toBe('Some prompt')
    act(() => { result.current.applyAISuggestion() })
    expect(result.current.aiPrompt).toBe('')
  })

  it('resetAI resets all state', () => {
    const { result } = renderHook(() => useCreatePostAI(), { wrapper: createWrapper() })
    act(() => {
      result.current.setShowAI(true)
      result.current.setAiPrompt('Test')
      result.current.setAiIsGenerating(true)
    })
    expect(result.current.showAI).toBe(true)
    expect(result.current.aiPrompt).toBe('Test')
    expect(result.current.aiIsGenerating).toBe(true)
    act(() => { result.current.resetAI() })
    expect(result.current.showAI).toBe(false)
    expect(result.current.aiPrompt).toBe('')
    expect(result.current.aiResults).toEqual([])
    expect(result.current.aiIsGenerating).toBe(false)
  })
})
