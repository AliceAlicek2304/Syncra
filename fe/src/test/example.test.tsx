import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('example test', () => {
  it('renders', () => {
    render(<div>Hello</div>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
