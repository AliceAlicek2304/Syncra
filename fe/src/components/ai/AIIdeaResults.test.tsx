import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AIIdeaResults } from './AIIdeaResults'
import type { GeneratedIdea as ApiGeneratedIdea } from '../../api/ai'

const mockIdeas: ApiGeneratedIdea[] = [
  { id: 'i1', title: 'AI Trends 2026', hook: 'Latest trends in AI', caption: 'Full caption about AI trends', type: 'Carousel', platforms: ['Instagram', 'LinkedIn'] },
  { id: 'i2', title: 'Productivity Hacks', hook: 'Boost your productivity', caption: 'Full caption for productivity', type: 'Reel', platforms: ['TikTok'] },
]

describe('AIIdeaResults', () => {
  it('renders list of generated ideas', () => {
    render(<AIIdeaResults ideas={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    expect(screen.getByText('AI Trends 2026')).toBeDefined()
    expect(screen.getByText('Productivity Hacks')).toBeDefined()
  })

  it('shows idea type and platforms', () => {
    render(<AIIdeaResults ideas={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    expect(screen.getByText('Carousel')).toBeDefined()
    expect(screen.getByText('Reel')).toBeDefined()
    expect(screen.getByText('Instagram · LinkedIn')).toBeDefined()
  })

  it('shows hook text for each idea', () => {
    render(<AIIdeaResults ideas={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    expect(screen.getByText('Latest trends in AI')).toBeDefined()
    expect(screen.getByText('Boost your productivity')).toBeDefined()
  })

  it('shows select buttons for each idea', () => {
    render(<AIIdeaResults ideas={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    const selectBtns = screen.getAllByText('+ Select')
    expect(selectBtns.length).toBe(2)
  })

  it('shows "Add to board" button when not presetResults', () => {
    render(<AIIdeaResults ideas={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    expect(screen.getByText('Add to board')).toBeDefined()
  })

  it('shows "Create now" button when presetResults', () => {
    render(<AIIdeaResults ideas={mockIdeas} presetResults={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    expect(screen.getByText('Create now')).toBeDefined()
  })

  it('shows bulk add disabled when nothing selected', () => {
    render(<AIIdeaResults ideas={mockIdeas} onSelectIdea={vi.fn()} onRegenerate={vi.fn()} cooldownRemaining={0} />)
    const addBtn = screen.getByText('Add to board').closest('button')
    expect(addBtn).toBeDisabled()
  })
})
