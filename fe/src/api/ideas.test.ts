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

const mockedApi = api as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('ideasApi', () => {
  const workspaceId = 'ws-123'
  const ideaId = 'idea-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getIdeas calls correct endpoint with status=idea param', async () => {
    mockedApi.get.mockResolvedValue({ data: [] })
    await ideasApi.getIdeas(workspaceId)
    expect(mockedApi.get).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts`,
      { params: { status: 'idea' } }
    )
  })

  it('createIdea sends status idea in body', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: ideaId, title: 'Test', status: 'idea', groupId: 'g-1', createdAt: '' } })
    await ideasApi.createIdea(workspaceId, { title: 'Test', groupId: 'g-1' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts`,
      expect.objectContaining({ status: 'idea' })
    )
  })

  it('updateIdea calls correct endpoint', async () => {
    mockedApi.put.mockResolvedValue({ data: {} })
    await ideasApi.updateIdea(workspaceId, ideaId, { title: 'Updated' })
    expect(mockedApi.put).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/${ideaId}`,
      { title: 'Updated' }
    )
  })

  it('deleteIdea calls DELETE on correct endpoint', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined })
    await ideasApi.deleteIdea(workspaceId, ideaId)
    expect(mockedApi.delete).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/${ideaId}`
    )
  })

  it('reorderIdeas sends orderedIds array to reorder endpoint', async () => {
    mockedApi.put.mockResolvedValue({ data: undefined })
    const ids = ['id-1', 'id-2', 'id-3']
    await ideasApi.reorderIdeas(workspaceId, ids)
    expect(mockedApi.put).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/reorder`,
      { orderedIds: ids }
    )
  })
})
