import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupCard } from './GroupCard'
import type { Group } from '../../api/groups'
import type { Idea } from '../../api/ideas'

const mockGroup: Group = {
  id: 'group-1',
  name: 'Unassigned',
  order: 0,
  createdAt: '2026-01-01',
}

const mockIdeas: Idea[] = [
  { id: 'idea-1', title: 'Idea 1', description: 'Desc 1', groupId: 'group-1', status: 'idea', createdAt: '2026-01-01' },
]

const mockAllGroups: Group[] = [mockGroup]

describe('GroupCard', () => {
  it('renders group title', () => {
    render(<GroupCard group={mockGroup} ideas={mockIdeas} groups={mockAllGroups} onAddIdea={vi.fn()} onEditIdea={vi.fn()} onDeleteIdea={vi.fn()} onMoveIdea={vi.fn()} onRenameGroup={vi.fn()} onDeleteGroup={vi.fn()} isDefault={true} />)
    expect(screen.getByText('Unassigned')).toBeDefined()
  })

  it('shows idea count', () => {
    render(<GroupCard group={mockGroup} ideas={mockIdeas} groups={mockAllGroups} onAddIdea={vi.fn()} onEditIdea={vi.fn()} onDeleteIdea={vi.fn()} onMoveIdea={vi.fn()} onRenameGroup={vi.fn()} onDeleteGroup={vi.fn()} isDefault={true} />)
    expect(screen.getByText('1')).toBeDefined()
  })

  it('has add idea button', () => {
    render(<GroupCard group={mockGroup} ideas={mockIdeas} groups={mockAllGroups} onAddIdea={vi.fn()} onEditIdea={vi.fn()} onDeleteIdea={vi.fn()} onMoveIdea={vi.fn()} onRenameGroup={vi.fn()} onDeleteGroup={vi.fn()} isDefault={true} />)
    expect(screen.getByText('New Idea')).toBeDefined()
  })

  it('shows delete group button when not default', () => {
    render(<GroupCard group={mockGroup} ideas={mockIdeas} groups={mockAllGroups} onAddIdea={vi.fn()} onEditIdea={vi.fn()} onDeleteIdea={vi.fn()} onMoveIdea={vi.fn()} onRenameGroup={vi.fn()} onDeleteGroup={vi.fn()} isDefault={false} />)
    expect(screen.getByTitle('Delete group')).toBeDefined()
  })

  it('does not show delete group button when default', () => {
    render(<GroupCard group={mockGroup} ideas={mockIdeas} groups={mockAllGroups} onAddIdea={vi.fn()} onEditIdea={vi.fn()} onDeleteIdea={vi.fn()} onMoveIdea={vi.fn()} onRenameGroup={vi.fn()} onDeleteGroup={vi.fn()} isDefault={true} />)
    expect(screen.queryByTitle('Delete group')).toBeNull()
  })

  it('renders idea cards within group', () => {
    render(<GroupCard group={mockGroup} ideas={mockIdeas} groups={mockAllGroups} onAddIdea={vi.fn()} onEditIdea={vi.fn()} onDeleteIdea={vi.fn()} onMoveIdea={vi.fn()} onRenameGroup={vi.fn()} onDeleteGroup={vi.fn()} isDefault={true} />)
    expect(screen.getByText('Idea 1')).toBeDefined()
  })
})
