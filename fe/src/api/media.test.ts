import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mediaApi } from './media'
import api from '../lib/axios'

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const mockedApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }

describe('mediaApi', () => {
  const workspaceId = 'ws-123'
  beforeEach(() => vi.clearAllMocks())

  it('getMedia calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: [] })
    await mediaApi.getMedia(workspaceId)
    expect(mockedApi.get).toHaveBeenCalledWith(`workspaces/${workspaceId}/media`, { params: undefined })
  })

  it('presignUpload POSTs to /media/presign with file info', async () => {
    const presignData = { filename: 'test.jpg', contentType: 'image/jpeg', sizeBytes: 1000 }
    mockedApi.post.mockResolvedValue({ data: { presignedUrl: 'https://r2.example.com/test', assetId: 'asset-1', publicUrl: '' } })
    await mediaApi.presignUpload(workspaceId, presignData)
    expect(mockedApi.post).toHaveBeenCalledWith(`workspaces/${workspaceId}/media/presign`, presignData)
  })

  it('confirmUpload POSTs to /media/confirm with assetId', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })
    await mediaApi.confirmUpload(workspaceId, 'asset-1')
    expect(mockedApi.post).toHaveBeenCalledWith(`workspaces/${workspaceId}/media/confirm`, { assetId: 'asset-1' })
  })

  it('deleteMedia calls DELETE on correct endpoint', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined })
    await mediaApi.deleteMedia(workspaceId, 'media-1')
    expect(mockedApi.delete).toHaveBeenCalledWith(`workspaces/${workspaceId}/media/media-1`)
  })
})
