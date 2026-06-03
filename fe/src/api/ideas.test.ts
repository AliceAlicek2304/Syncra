import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ideasApi } from './ideas'
import api from '../lib/axios'

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

describe('ideasApi', () => {
  const workspaceId = 'ws-123'
  const ideaId = 'idea-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getIdeas calls correct endpoint and maps BE Status to FE groupId', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        items: [{ id: 'a', workspaceId: workspaceId, title: 'T', description: null, status: 'todo', createdAtUtc: '2025-01-01T00:00:00Z', updatedAtUtc: null }],
        page: 1, pageSize: 20, totalItems: 1, totalPages: 1,
      },
    })
    const ideas = await ideasApi.getIdeas(workspaceId)
    expect(mockedApi.get).toHaveBeenCalledWith(`workspaces/${workspaceId}/ideas`)
    expect(ideas[0].groupId).toBe('todo')
  })

  it('createIdea sends groupId as BE status', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: ideaId, workspaceId, title: 'Test', description: null, status: 'todo', createdAtUtc: '', updatedAtUtc: null } })
    await ideasApi.createIdea(workspaceId, { title: 'Test', groupId: 'todo' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/ideas`,
      expect.objectContaining({ status: 'todo' })
    )
  })

  it('updateIdea calls correct endpoint', async () => {
    mockedApi.put.mockResolvedValue({ data: {} })
    await ideasApi.updateIdea(workspaceId, ideaId, { title: 'Updated' })
    expect(mockedApi.put).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/ideas/${ideaId}`,
      { title: 'Updated' }
    )
  })

  it('deleteIdea calls DELETE on correct endpoint', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined })
    await ideasApi.deleteIdea(workspaceId, ideaId)
    expect(mockedApi.delete).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/ideas/${ideaId}`
    )
  })

  it('reorderIdeas sends orderedIds array to reorder endpoint', async () => {
    mockedApi.put.mockResolvedValue({ data: undefined })
    const ids = ['id-1', 'id-2', 'id-3']
    await ideasApi.reorderIdeas(workspaceId, ids)
    expect(mockedApi.put).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/ideas/reorder`,
      { orderedIds: ids }
    )
  })
})
