import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageWrapper } from './PageWrapper'

describe('PageWrapper', () => {
  it('renders children correctly', () => {
    render(
      <PageWrapper>
        <div data-testid="child-content">Hello Phase 11</div>
      </PageWrapper>
    )
    expect(screen.getByTestId('child-content')).toBeDefined()
    expect(screen.getByText('Hello Phase 11')).toBeDefined()
  })

  it('renders with data-testid="page-wrapper" by default', () => {
    render(
      <PageWrapper>
        <span>content</span>
      </PageWrapper>
    )
    expect(screen.getByTestId('page-wrapper')).toBeDefined()
  })

  it('accepts a custom data-testid', () => {
    render(
      <PageWrapper data-testid="custom-page">
        <span>content</span>
      </PageWrapper>
    )
    expect(screen.getByTestId('custom-page')).toBeDefined()
  })

  it('renders correctly when useReducedMotion returns true (no crash)', async () => {
    // The framer-motion mock from setup.ts sets useReducedMotion to return false by default
    // Override to simulate reduced-motion user preference
    const { useReducedMotion } = vi.mocked(
      await import('framer-motion')
    )
    ;(useReducedMotion as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)

    render(
      <PageWrapper>
        <div>Reduced motion content</div>
      </PageWrapper>
    )
    expect(screen.getByText('Reduced motion content')).toBeDefined()
  })
})
