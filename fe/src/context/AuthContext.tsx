import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { User, LoginRequest, AuthResponse } from '../api/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginRequest) => Promise<AuthResponse>
  logout: () => void
  updateUser: (user: User | null) => void
  hydrateSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrateSession = async () => {
    const token = localStorage.getItem('syncra_access_token')
    if (token) {
      try {
        const userData = await authApi.getMe()
        if (userData && typeof userData === 'object' && typeof userData.email === 'string') {
          setUser(userData)
        } else {
          console.error('Invalid user data from /auth/me:', userData)
          localStorage.removeItem('syncra_access_token')
          localStorage.removeItem('syncra_workspace_id')
          localStorage.removeItem('syncra_profile_id')
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to hydrate session:', error)
        localStorage.removeItem('syncra_access_token')
        localStorage.removeItem('syncra_workspace_id')
        localStorage.removeItem('syncra_profile_id')
        setUser(null)
      }
    } else {
      setUser(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    hydrateSession()
  }, [])

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      localStorage.removeItem('syncra_workspace_id')
      localStorage.removeItem('syncra_profile_id')
      const response = await authApi.login(credentials)
      localStorage.setItem('syncra_access_token', response.token)
      await hydrateSession()
      return response
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('syncra_access_token')
    localStorage.removeItem('syncra_workspace_id')
    localStorage.removeItem('syncra_profile_id')
    setUser(null)
  }

  const updateUser = (userData: User | null) => {
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, hydrateSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
