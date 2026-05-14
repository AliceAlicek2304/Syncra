import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisualCard } from './VisualCard'
import type { CalPost } from './CalendarConstants'

const mockPost: CalPost = {
  id: 'p1',
  title: 'Test Post Title',
  platform: 'Instagram',
  time: '14:30',
  color: '#ec4899',
  date: new Date('2026-01-15'),
  image: 'https://example.com/image.jpg',
  postId: 'post-1',
}

describe('VisualCard', () => {
  it('renders post title', () => {
    render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('Test Post Title')).toBeDefined()
  })

  it('renders post platform badge', () => {
    render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('Instagram')).toBeDefined()
  })

  it('renders scheduled time', () => {
    render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('14:30')).toBeDefined()
  })

  it('renders with draggable attribute', () => {
    const { container } = render(<VisualCard post={mockPost} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(container.querySelector('[draggable="true"]')).toBeDefined()
  })

  it('shows fallback when no image', () => {
    const postNoImage = { ...mockPost, image: undefined }
    render(<VisualCard post={postNoImage} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(screen.getByText('Test Post Title')).toBeDefined()
  })

  it('renders placeholder when no image provided', () => {
    const postNoImage = { ...mockPost, image: undefined }
    const { container } = render(<VisualCard post={postNoImage} onClick={vi.fn()} isDragging={false} onDragStart={vi.fn()} onDragEnd={vi.fn()} />)
    expect(container.querySelector('[class*="cardPlaceholder"]')).toBeDefined()
  })
})
