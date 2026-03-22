import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/axios'

export interface User {
  id: string
  email: string
  displayName?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  timezone?: string
  locale?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  firstName: string
  lastName: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

type AuthResponse = {
  token?: string
  accessToken?: string
  refreshToken?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user', error)
      clearAuth()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      fetchUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  const clearAuth = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }


  const login = async (payload: LoginPayload) => {
    try {
      setIsLoading(true)
      const res = await api.post<AuthResponse>('/auth/login', payload)
      const accessToken = res.data.token ?? res.data.accessToken
      const refreshToken = res.data.refreshToken

      if (!accessToken || !refreshToken) {
        throw new Error('Invalid login response from server.')
      }

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      
      await fetchUser()
      setIsLoading(false)
    } catch (error) {
       console.error('Login failed', error)
       setIsLoading(false)
       throw error
    }
  }

  const register = async (payload: RegisterPayload) => {
    try {
      setIsLoading(true)
      await api.post('/auth/register', payload)
      await login({ email: payload.email, password: payload.password })
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }

  const logout = () => {
    clearAuth()
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
