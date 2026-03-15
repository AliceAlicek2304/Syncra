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

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => void
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


  const login = async () => {
    try {
      setIsLoading(true)
      const credentials = { email: 'minhanh@syncra.io', password: 'Password123!' }
      

      try {
        const res = await api.post('/auth/login', credentials)
        localStorage.setItem('accessToken', res.data.accessToken)
        localStorage.setItem('refreshToken', res.data.refreshToken)
      } catch (e: any) {

        if (e.response?.status === 401 || e.response?.status === 400 || e.response?.status === 404) {
          const regData = {
            email: credentials.email,
            password: credentials.password,
            firstName: 'Minh',
            lastName: 'Anh'
          }
          await api.post('/auth/register', regData)

          const res = await api.post('/auth/login', credentials)
          localStorage.setItem('accessToken', res.data.accessToken)
          localStorage.setItem('refreshToken', res.data.refreshToken)
        } else {
          throw e
        }
      }
      
      await fetchUser()
    } catch (error) {
       console.error('Demo login failed', error)
       setIsLoading(false)
    }
  }

  const logout = () => {
    clearAuth()
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
