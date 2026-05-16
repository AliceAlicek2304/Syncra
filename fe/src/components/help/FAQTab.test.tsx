import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FAQTab } from './FAQTab'
import type { FAQItem } from '../../pages/app/HelpPageData'

const mockItems: FAQItem[] = [
  { id: '1', category: 'General', q: 'What is Syncra?', a: 'Syncra is a social media management tool.' },
  { id: '2', category: 'General', q: 'How to get started?', a: 'Sign up and create your first post.' },
  { id: '3', category: 'Billing', q: 'What are the plans?', a: 'We offer Free, Pro, and Enterprise plans.' },
]

describe('FAQTab', () => {
  it('renders FAQ items from the provided items array', () => {
    render(<FAQTab items={mockItems} />)
    expect(screen.getByText('What is Syncra?')).toBeDefined()
    expect(screen.getByText('How to get started?')).toBeDefined()
    expect(screen.getByText('What are the plans?')).toBeDefined()
  })

  it('renders category titles', () => {
    render(<FAQTab items={mockItems} />)
    expect(screen.getByText('General')).toBeDefined()
    expect(screen.getByText('Billing')).toBeDefined()
  })

  it('shows contact support button when onContact provided', () => {
    render(<FAQTab items={mockItems} onContact={vi.fn()} />)
    expect(screen.getByText('Liên hệ support →')).toBeDefined()
  })

  it('toggles answer visibility when clicking a question', () => {
    render(<FAQTab items={mockItems} />)
    const question = screen.getByText('What is Syncra?')
    expect(screen.queryByText('Syncra is a social media management tool.')).toBeNull()
    fireEvent.click(question)
    expect(screen.getByText('Syncra is a social media management tool.')).toBeDefined()
    fireEvent.click(question)
    expect(screen.queryByText('Syncra is a social media management tool.')).toBeNull()
  })

  it('shows total item count', () => {
    render(<FAQTab items={mockItems} />)
    expect(screen.getByText(/3 câu hỏi thường gặp/)).toBeDefined()
  })

  it('renders empty state when no items', () => {
    render(<FAQTab items={[]} />)
    expect(screen.getByText(/0 câu hỏi thường gặp/)).toBeDefined()
  })
})
