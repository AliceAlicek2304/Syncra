import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface MockUser {
  name: string
  handle: string
  avatar: string
  plan: 'Starter' | 'Creator' | 'Pro'
  email: string
}

/** Derive display fields from an email address. */
function userFromEmail(email: string): MockUser {
  const atIdx = email.indexOf('@')
  const local = atIdx > 0 ? email.slice(0, atIdx) : email
  const name = local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    email,
    name,
    handle: `@${local}`,
    avatar: local[0]?.toUpperCase() ?? '?',
    plan: 'Starter',
  }
}

function storedUser(): MockUser | null {
  try {
    const token = localStorage.getItem('technest_token')
    const email = localStorage.getItem('technest_email')
    if (token && email) return userFromEmail(email)
  } catch {
    // localStorage unavailable (e.g. SSR / private mode)
  }
  return null
}

interface AuthContextType {
  user: MockUser | null
  /** Legacy no-arg login kept for internal compatibility. */
  login: () => void
  logout: () => void
  signIn: (email: string, password: string) => Promise<MockUser>
  signUp: (email: string, password: string) => Promise<MockUser>
  loginWithToken: (token: string, email: string) => MockUser
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(storedUser)

  const _persist = (token: string, email: string): MockUser => {
    localStorage.setItem('technest_token', token)
    localStorage.setItem('technest_email', email)
    const u = userFromEmail(email)
    setUser(u)
    return u
  }

  const signUp = async (email: string, password: string): Promise<MockUser> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Sign up failed')
    return _persist(data.token, data.email)
  }

  const signIn = async (email: string, password: string): Promise<MockUser> => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Sign in failed')
    return _persist(data.token, data.email)
  }

  const loginWithToken = (token: string, email: string): MockUser => {
    return _persist(token, email)
  }

  const login = () => {
    // Legacy stub — no longer used; kept so existing callers don't break.
    setUser(userFromEmail('user@technest.io'))
  }

  const logout = () => {
    localStorage.removeItem('technest_token')
    localStorage.removeItem('technest_email')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, signIn, signUp, loginWithToken }}>
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

