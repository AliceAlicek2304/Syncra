import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface MockUser {
  name: string
  handle: string
  avatar: string
  plan: 'Starter' | 'Creator' | 'Pro'
  email: string
}

const MOCK_USER: MockUser = {
  name: 'Minh Anh',
  handle: '@minhanh.creates',
  avatar: 'MA',
  plan: 'Creator',
  email: 'minhanh@technest.io',
}

interface AuthContextType {
  user: MockUser | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)

  const login = () => setUser(MOCK_USER)
  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
