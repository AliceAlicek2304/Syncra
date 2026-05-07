import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import axios from 'axios'
import { useR2Upload } from './useR2Upload'
import { mediaApi } from '../api/media'

// Mock plain axios (the one used for R2 PUT)
vi.mock('axios', () => ({
  default: { put: vi.fn() },
}))

// Mock mediaApi (presign + confirm)
vi.mock('../api/media', () => ({
  mediaApi: {
    presignUpload: vi.fn(),
    confirmUpload: vi.fn(),
  },
}))

describe('useR2Upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns upload function and initial state', () => {
    const { result } = renderHook(() => useR2Upload())
    expect(typeof result.current.upload).toBe('function')
    expect(result.current.isUploading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('calls presignUpload then plain axios.put then confirmUpload', async () => {
    const mockFile = new File(['hello'], 'test.jpg', { type: 'image/jpeg' })
    const presignRes = { presignedUrl: 'https://r2.test/upload', assetId: 'asset-1', publicUrl: 'https://r2.test/test.jpg' }

    vi.mocked(mediaApi.presignUpload).mockResolvedValue(presignRes)
    vi.mocked(axios.put).mockResolvedValue({ status: 200 })
    vi.mocked(mediaApi.confirmUpload).mockResolvedValue({ id: 'asset-1', filename: 'test.jpg', publicUrl: '', contentType: 'image/jpeg', sizeBytes: 5, createdAt: '' })

    const { result } = renderHook(() => useR2Upload())
    let assetId: string | undefined
    await act(async () => {
      assetId = await result.current.upload(mockFile, 'ws-123')
    })

    expect(mediaApi.presignUpload).toHaveBeenCalledWith('ws-123', {
      filename: 'test.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 5,
    })
    expect(axios.put).toHaveBeenCalledWith(
      'https://r2.test/upload',
      mockFile,
      expect.objectContaining({ headers: { 'Content-Type': 'image/jpeg' } })
    )
    expect(mediaApi.confirmUpload).toHaveBeenCalledWith('ws-123', 'asset-1')
    expect(assetId).toBe('asset-1')
  })

  it('skips PUT if presignedUrl is empty (deduplication case)', async () => {
    const mockFile = new File(['hello'], 'dup.jpg', { type: 'image/jpeg' })
    const presignRes = { presignedUrl: '', assetId: 'asset-2', publicUrl: 'https://r2.test/dup.jpg' }

    vi.mocked(mediaApi.presignUpload).mockResolvedValue(presignRes)

    const { result } = renderHook(() => useR2Upload())
    let assetId: string | undefined
    await act(async () => {
      assetId = await result.current.upload(mockFile, 'ws-123')
    })

    expect(axios.put).not.toHaveBeenCalled()
    expect(mediaApi.confirmUpload).not.toHaveBeenCalled() // If dedup, backend already confirmed
    expect(assetId).toBe('asset-2')
  })
})