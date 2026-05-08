import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WidgetErrorFallback } from './WidgetErrorFallback'

const mockError = new Error('Test widget crash')

describe('WidgetErrorFallback', () => {
  it('renders "Something went wrong" heading', () => {
    render(
      <WidgetErrorFallback
        error={mockError}
        resetErrorBoundary={vi.fn()}
      />
    )
    expect(screen.getByText('Something went wrong')).toBeDefined()
  })

  it('renders error body text', () => {
    render(
      <WidgetErrorFallback
        error={mockError}
        resetErrorBoundary={vi.fn()}
      />
    )
    expect(
      screen.getByText("This widget encountered an error and couldn't load.")
    ).toBeDefined()
  })

  it('renders "Try again" button', () => {
    render(
      <WidgetErrorFallback
        error={mockError}
        resetErrorBoundary={vi.fn()}
      />
    )
    expect(screen.getByText('Try again')).toBeDefined()
  })

  it('calls resetErrorBoundary when "Try again" is clicked', () => {
    const mockReset = vi.fn()
    render(
      <WidgetErrorFallback
        error={mockError}
        resetErrorBoundary={mockReset}
      />
    )
    fireEvent.click(screen.getByText('Try again'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('has role="alert" on container', () => {
    render(
      <WidgetErrorFallback
        error={mockError}
        resetErrorBoundary={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('has data-testid="widget-error-fallback"', () => {
    render(
      <WidgetErrorFallback
        error={mockError}
        resetErrorBoundary={vi.fn()}
      />
    )
    expect(screen.getByTestId('widget-error-fallback')).toBeDefined()
  })
})
