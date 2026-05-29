import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import GlassUpload from './GlassUpload'

class MockDataTransfer {
  items: { length: number } = { length: 0 }
  files: File[] = []
  add(file: File) { this.files.push(file) }
}

interface MockDragEventInit {
  dataTransfer?: MockDataTransfer
}

class MockDragEvent extends Event {
  dataTransfer: MockDataTransfer | null
  constructor(type: string, init?: MockDragEventInit) {
    super(type, init as EventInit)
    this.dataTransfer = init?.dataTransfer ?? null
  }
}
globalThis.DragEvent = MockDragEvent as unknown as typeof DragEvent

const mockUpload = vi.fn()
let mockWorkspaceId = 'ws-1'

vi.mock('../hooks/useR2Upload', () => ({
  useR2Upload: () => ({
    upload: mockUpload,
    isUploading: false,
    progress: {},
    error: null,
    resetProgress: vi.fn(),
  }),
}))

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspace: { id: mockWorkspaceId } }),
}))

const mockShowToast = vi.fn()
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    success: mockShowToast,
    error: mockShowToast,
  }),
}))

describe('GlassUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkspaceId = 'ws-1'
  })

  it('is not visible when not dragging', () => {
    const { container } = render(<GlassUpload />)
    expect(container.innerHTML).toBe('')
  })

  it('becomes visible on dragenter event', () => {
    render(<GlassUpload />)
    const dt = new MockDataTransfer()
    dt.items.length = 1
    act(() => {
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt as unknown as DataTransfer }))
    })
    expect(screen.getByText('Drop your media here')).toBeDefined()
  })

  it('disappears on dragleave event', () => {
    render(<GlassUpload />)
    const dt = new MockDataTransfer()
    dt.items.length = 1
    act(() => {
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt as unknown as DataTransfer }))
    })
    expect(screen.getByText('Drop your media here')).toBeDefined()
    act(() => {
      window.dispatchEvent(new DragEvent('dragleave'))
    })
    expect(screen.queryByText('Drop your media here')).toBeNull()
  })

  it('calls upload when files are dropped', async () => {
    mockUpload.mockResolvedValue({ url: 'https://example.com/uploaded.jpg' })
    render(<GlassUpload />)

    const enterDt = new MockDataTransfer()
    enterDt.items.length = 1
    act(() => {
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: enterDt as unknown as DataTransfer }))
    })
    expect(screen.getByText('Drop your media here')).toBeDefined()

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const dropDt = new MockDataTransfer()
    dropDt.add(file)

    await act(async () => {
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dropDt as unknown as DataTransfer }))
    })

    expect(mockUpload).toHaveBeenCalledWith(file, 'ws-1')
    expect(mockShowToast).toHaveBeenCalled()
  })

  it('shows error toast on upload failure', async () => {
    mockUpload.mockRejectedValue(new Error('Upload failed'))
    render(<GlassUpload />)

    const enterDt = new MockDataTransfer()
    enterDt.items.length = 1
    act(() => {
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: enterDt as unknown as DataTransfer }))
    })

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const dropDt = new MockDataTransfer()
    dropDt.add(file)

    await act(async () => {
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dropDt as unknown as DataTransfer }))
    })

    expect(mockUpload).toHaveBeenCalled()
  })

  it('does not upload when no workspace', async () => {
    mockWorkspaceId = undefined as unknown as string

    render(<GlassUpload />)
    const enterDt = new MockDataTransfer()
    enterDt.items.length = 1
    act(() => {
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: enterDt as unknown as DataTransfer }))
    })

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const dropDt = new MockDataTransfer()
    dropDt.add(file)
    await act(async () => {
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dropDt as unknown as DataTransfer }))
    })
    expect(mockUpload).not.toHaveBeenCalled()
  })
})
