import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkeletonLoader } from './SkeletonLoader'

describe('SkeletonLoader', () => {
  it('renders with aria-label="Loading content"', () => {
    render(<SkeletonLoader />)
    expect(screen.getByLabelText('Loading content')).toBeDefined()
  })

  it('renders with aria-busy="true"', () => {
    const { container } = render(<SkeletonLoader />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('aria-busy')).toBe('true')
  })

  it('renders with role="status"', () => {
    render(<SkeletonLoader />)
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('applies skeleton CSS class', () => {
    const { container } = render(<SkeletonLoader />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('skeleton')
  })

  it('applies skeleton-card class when card=true', () => {
    const { container } = render(<SkeletonLoader card />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('skeleton-card')
  })

  it('applies custom height as inline style', () => {
    const { container } = render(<SkeletonLoader height={200} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.height).toBe('200px')
  })

  it('applies custom width as inline style', () => {
    const { container } = render(<SkeletonLoader width="50%" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('50%')
  })
})
