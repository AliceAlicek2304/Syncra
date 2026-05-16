import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiApi } from './ai'
import api from '../lib/axios'

vi.mock('../lib/axios', () => ({
  default: { post: vi.fn() },
}))

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn> }

describe('aiApi', () => {
  const workspaceId = 'ws-123'
  beforeEach(() => vi.clearAllMocks())

  it('generateIdeas POSTs to correct endpoint', async () => {
    mockedApi.post.mockResolvedValue({ data: { ideas: [], cooldownSeconds: 30 } })
    await aiApi.generateIdeas(workspaceId, { topic: 'Content marketing' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/ai/ideas/generate`,
      { topic: 'Content marketing' }
    )
  })

  it('generateIdeas includes referenceAssetIds when provided', async () => {
    mockedApi.post.mockResolvedValue({ data: { ideas: [] } })
    await aiApi.generateIdeas(workspaceId, { topic: 'Test', referenceAssetIds: ['asset-1', 'asset-2'] })
    expect(mockedApi.post).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/ai/ideas/generate`,
      expect.objectContaining({ referenceAssetIds: ['asset-1', 'asset-2'] })
    )
  })
})
