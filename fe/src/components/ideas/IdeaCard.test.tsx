import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IdeaCard } from './IdeaCard'
import type { Idea } from '../../api/ideas'
import type { Group } from '../../api/groups'

const mockIdea: Idea = {
  id: 'idea-1',
  title: 'Test Idea',
  description: 'Test description content',
  groupId: 'group-1',
  status: 'idea',
  createdAt: '2026-01-01',
}

const mockGroups: Group[] = [
  { id: 'group-1', name: 'Unassigned' },
  { id: 'group-2', name: 'Todo' },
]

describe('IdeaCard', () => {
  it('renders idea title and description', () => {
    render(<IdeaCard idea={mockIdea} groups={mockGroups} onEdit={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)
    expect(screen.getByText('Test Idea')).toBeDefined()
    expect(screen.getByText('Test description content')).toBeDefined()
  })

  it('renders without description when not provided', () => {
    const noDescIdea = { ...mockIdea, description: undefined }
    const { container } = render(<IdeaCard idea={noDescIdea} groups={mockGroups} onEdit={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)
    expect(screen.getByText('Test Idea')).toBeDefined()
    expect(container.querySelectorAll('p').length).toBe(1)
  })

  it('has a more options button', () => {
    render(<IdeaCard idea={mockIdea} groups={mockGroups} onEdit={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)
    expect(screen.getByTitle('More options')).toBeDefined()
  })
})
