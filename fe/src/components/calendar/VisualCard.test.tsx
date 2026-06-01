import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisualCard } from './VisualCard'
import type { CalPost } from './CalendarConstants'

const mockPost: CalPost = {
  id: 'p1',
  title: 'Test Post Title',
  platform: 'Instagram',
  status: 'scheduled',
  time: '14:30',
  color: '#ec4899',
  caption: 'Test caption',
  hashtags: [],
  image: 'https://example.com/image.jpg',
}

describe('VisualCard', () => {
  it('renders post title', () => {
    render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('Test Post Title')).toBeDefined()
  })

  it('renders platform icon', () => {
    const { container } = render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    const headers = container.querySelectorAll('[class*="cardHeader"]')
    expect(headers.length).toBe(1)
  })

  it('renders scheduled time', () => {
    render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('14:30')).toBeDefined()
  })

  it('renders with draggable attribute', () => {
    const { container } = render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(container.querySelector('[draggable="true"]')).toBeDefined()
  })

  it('shows title when no image', () => {
    const postNoImage = { ...mockPost, image: undefined }
    render(<VisualCard post={postNoImage} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('Test Post Title')).toBeDefined()
  })

  it('renders thumbnail when image provided', () => {
    const { container } = render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(container.querySelector('img[src="https://example.com/image.jpg"]')).toBeDefined()
  })
})
