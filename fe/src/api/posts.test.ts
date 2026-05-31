import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postsApi } from './posts'
import api from '../lib/axios'

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('postsApi', () => {
  const workspaceId = 'ws-123'
  const postId = 'post-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getPosts calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: [] })
    await postsApi.getPosts(workspaceId, { status: 'draft' })
    expect(mockedApi.get).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts`,
      { params: { status: 'draft' } }
    )
  })

  it('createPost calls correct endpoint', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: postId, title: 'Test' } })
    await postsApi.createPost(workspaceId, { title: 'Test' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts`,
      { title: 'Test' }
    )
  })

  it('getPost calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: { id: postId } })
    await postsApi.getPost(workspaceId, postId)
    expect(mockedApi.get).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/${postId}`
    )
  })

  it('updatePost calls correct endpoint', async () => {
    mockedApi.put.mockResolvedValue({ data: {} })
    await postsApi.updatePost(workspaceId, postId, { title: 'Updated' })
    expect(mockedApi.put).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/${postId}`,
      { title: 'Updated' }
    )
  })

  it('reschedulePost calls PUT with scheduledAtUtc', async () => {
    mockedApi.put.mockResolvedValue({ data: {} })
    const date = '2026-06-01T10:00:00Z'
    await postsApi.reschedulePost(workspaceId, postId, date)
    expect(mockedApi.put).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/${postId}`,
      { scheduledAtUtc: date }
    )
  })

  it('deletePost calls DELETE on correct endpoint', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined })
    await postsApi.deletePost(workspaceId, postId)
    expect(mockedApi.delete).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/${postId}`
    )
  })

  it('deleteZernioPost calls DELETE on correct endpoint', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined })
    const zernioPostId = 'zernio-123'
    await postsApi.deleteZernioPost(workspaceId, zernioPostId)
    expect(mockedApi.delete).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/zernio/${zernioPostId}`
    )
  })

  it('unpublishZernioPost calls POST on correct endpoint with params', async () => {
    mockedApi.post.mockResolvedValue({ data: undefined })
    const zernioPostId = 'zernio-123'
    await postsApi.unpublishZernioPost(workspaceId, zernioPostId, false)
    expect(mockedApi.post).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts/zernio/${zernioPostId}/unpublish`,
      null,
      { params: { deleteFromDb: false } }
    )
  })
})
