import { describe, it, expect, vi, beforeEach } from 'vitest'
import { groupsApi } from './groups'
import api from '../lib/axios'

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = api as any

describe('groupsApi', () => {
  const workspaceId = 'ws-123'
  const groupId = 'grp-1'
  beforeEach(() => vi.clearAllMocks())

  it('getGroups calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: [] })
    await groupsApi.getGroups(workspaceId)
    expect(mockedApi.get).toHaveBeenCalledWith(`workspaces/${workspaceId}/groups`)
  })

  it('createGroup sends name in body', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: groupId, name: 'Test' } })
    await groupsApi.createGroup(workspaceId, { name: 'Test' })
    expect(mockedApi.post).toHaveBeenCalledWith(`workspaces/${workspaceId}/groups`, { name: 'Test' })
  })

  it('updateGroup calls PUT with name', async () => {
    mockedApi.put.mockResolvedValue({ data: {} })
    await groupsApi.updateGroup(workspaceId, groupId, { name: 'New Name' })
    expect(mockedApi.put).toHaveBeenCalledWith(`workspaces/${workspaceId}/groups/${groupId}`, { name: 'New Name' })
  })

  it('deleteGroup calls DELETE', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined })
    await groupsApi.deleteGroup(workspaceId, groupId)
    expect(mockedApi.delete).toHaveBeenCalledWith(`workspaces/${workspaceId}/groups/${groupId}`)
  })
})
