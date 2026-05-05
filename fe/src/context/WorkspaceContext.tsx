import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/axios'
import { useAuth } from './AuthContext'

export interface Workspace {
  id: string
  name: string
  slug: string
  ownerUserId: string
  createdAtUtc: string
}

interface WorkspaceContextType {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  isLoading: boolean
  setActiveWorkspace: (w: Workspace) => void
  createWorkspace: (name: string) => Promise<void>
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/workspaces')
      const data: Workspace[] = res.data
      setWorkspaces(data)
      

      if (data.length > 0) {
        const savedId = localStorage.getItem('activeWorkspaceId')
        const found = data.find(w => w.id === savedId)
        if (found) {
          setActiveWorkspaceState(found)
        } else {
          setActiveWorkspace(data[0])
        }
      }
    } catch (error) {
       console.error('Failed to fetch workspaces', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchWorkspaces()
    } else {
      setWorkspaces([])
      setActiveWorkspaceState(null)
    }
  }, [user])

  const setActiveWorkspace = (w: Workspace) => {
    setActiveWorkspaceState(w)
    localStorage.setItem('activeWorkspaceId', w.id)
  }

  const createWorkspace = async (name: string) => {
    const res = await api.post('/workspaces', { name })
    const newWorkspace: Workspace = res.data
    await fetchWorkspaces()
    setActiveWorkspaceState(newWorkspace)
    localStorage.setItem('activeWorkspaceId', newWorkspace.id)
  }

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, isLoading, setActiveWorkspace, createWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}

export function useOptionalWorkspace() {
  return useContext(WorkspaceContext)
}
