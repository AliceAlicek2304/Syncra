import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIIdeaForm } from './AIIdeaForm'

const defaultProps = {
  onSubmit: vi.fn(),
  isGenerating: false,
  cooldownRemaining: 0,
  uploadedFiles: [],
  uploadProgress: {},
  onFilesChange: vi.fn(),
}

describe('AIIdeaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea for topic input', () => {
    render(<AIIdeaForm {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Describe your content idea…')
    expect(textarea).toBeDefined()
  })

  it('submit button is disabled when topic is empty', () => {
    render(<AIIdeaForm {...defaultProps} />)
    const btn = screen.getByTitle('Generate (Ctrl+Enter)')
    expect(btn).toBeDisabled()
  })

  it('submit button is enabled when topic has text', () => {
    render(<AIIdeaForm {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Describe your content idea…')
    fireEvent.change(textarea, { target: { value: 'New content about AI' } })
    const btn = screen.getByTitle('Generate (Ctrl+Enter)')
    expect(btn).not.toBeDisabled()
  })

  it('calls onSubmit with form data when submitted', () => {
    const onSubmit = vi.fn()
    render(<AIIdeaForm {...defaultProps} onSubmit={onSubmit} />)
    const textarea = screen.getByPlaceholderText('Describe your content idea…')
    fireEvent.change(textarea, { target: { value: 'New content about AI' } })
    const btn = screen.getByTitle('Generate (Ctrl+Enter)')
    fireEvent.click(btn)
    expect(onSubmit).toHaveBeenCalledWith({
      topic: 'New content about AI',
      niche: undefined,
      audience: undefined,
      goal: undefined,
      tone: undefined,
    })
  })

  it('shows generating state on submit button when isGenerating=true', () => {
    render(<AIIdeaForm {...defaultProps} isGenerating={true} />)
    expect(screen.getByText('Generating…')).toBeDefined()
  })

  it('shows cooldown message when cooldownRemaining > 0', () => {
    render(<AIIdeaForm {...defaultProps} cooldownRemaining={15} />)
    expect(screen.getByText('Wait 15s')).toBeDefined()
  })

  it('renders tone chips', () => {
    render(<AIIdeaForm {...defaultProps} />)
    expect(screen.getByText('Balanced')).toBeDefined()
    expect(screen.getByText('Casual')).toBeDefined()
    expect(screen.getByText('Pro')).toBeDefined()
  })

  it('renders goal chips', () => {
    render(<AIIdeaForm {...defaultProps} />)
    expect(screen.getByText('Engagement')).toBeDefined()
    expect(screen.getByText('Followers')).toBeDefined()
    expect(screen.getByText('Awareness')).toBeDefined()
    expect(screen.getByText('Sales')).toBeDefined()
  })

  it('shows advanced fields when toggled', () => {
    render(<AIIdeaForm {...defaultProps} />)
    const toggle = screen.getByText(/Advanced/)
    fireEvent.click(toggle)
    expect(screen.getByPlaceholderText('Niche (e.g. Fitness, Tech…)')).toBeDefined()
    expect(screen.getByPlaceholderText('Audience (e.g. Gen Z, Founders…)')).toBeDefined()
  })
})
