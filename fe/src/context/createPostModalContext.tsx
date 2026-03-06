import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ScheduledPost } from './calendarContextBase'

export type CreatePostSource = 'direct' | 'idea' | 'coach' | 'repurpose' | 'command' | 'calendar'

export interface OpenCreatePostParams {
  initialContent?: string
  source?: CreatePostSource
  initialDate?: { year: number; month: number; day: number }
  editPost?: ScheduledPost
}

export interface CreatePostModalState {
  isOpen: boolean
  initialContent?: string
  source: CreatePostSource
  initialDate?: { year: number; month: number; day: number }
  editPost?: ScheduledPost | null
}

export interface CreatePostModalContextValue {
  state: CreatePostModalState
  openCreatePost: (params?: OpenCreatePostParams) => void
  openEditPost: (post: ScheduledPost) => void
  closeCreatePost: () => void
}

const CreatePostModalContext = createContext<CreatePostModalContextValue | null>(null)

export function CreatePostModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreatePostModalState>({
    isOpen: false,
    source: 'direct'
  })

  const openCreatePost = (params?: OpenCreatePostParams) => {
    setState({
      isOpen: true,
      initialContent: params?.initialContent,
      source: params?.source ?? (params?.initialContent ? 'idea' : 'direct'),
      initialDate: params?.initialDate,
      editPost: null
    })
  }

  const openEditPost = (post: ScheduledPost) => {
    setState({
      isOpen: true,
      initialContent: undefined,
      source: 'direct',
      initialDate: undefined,
      editPost: post
    })
  }

  const closeCreatePost = () => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      initialContent: undefined,
      source: 'direct',
      initialDate: undefined,
      editPost: undefined
    }))
  }

  return (
    <CreatePostModalContext.Provider value={{ state, openCreatePost, openEditPost, closeCreatePost }}>
      {children}
    </CreatePostModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCreatePostModal() {
  const ctx = useContext(CreatePostModalContext)
  if (!ctx) throw new Error('useCreatePostModal must be used within CreatePostModalProvider')
  return ctx
}