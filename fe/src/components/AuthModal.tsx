import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { AxiosError } from 'axios'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import styles from './AuthModal.module.css'

type AuthMode = 'login' | 'register'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiMessage = error.response?.data?.message ?? error.response?.data?.Message
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage
    }

    if (error.response?.status === 401) return 'Email hoặc mật khẩu không đúng.'
    if (error.response?.status === 400) return 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.'
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại.'
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, register, isLoading } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setErrorMessage('')
    setMode('login')
  }

  const handleClose = () => {
    if (isLoading) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        await register({ email, password, firstName, lastName })
      }

      resetForm()
      onClose()
      onSuccess?.()
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={handleClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Authentication">
        <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Close authentication dialog">
          <X size={18} />
        </button>

        <p className={styles.eyebrow}>Welcome back</p>
        <h2 className={styles.title}>{mode === 'login' ? 'Sign in to Syncra' : 'Create your account'}</h2>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Manage your workspace, ideas and analytics in one place.'
            : 'Start organizing your content workflow in under a minute.'}
        </p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => {
              setMode('login')
              setErrorMessage('')
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => {
              setMode('register')
              setErrorMessage('')
            }}
          >
            Sign up
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>First name</span>
                <input
                  className={styles.input}
                  placeholder="Minh"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Last name</span>
                <input
                  className={styles.input}
                  placeholder="Anh"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </label>
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>

          {errorMessage && <p className={styles.error}>{errorMessage}</p>}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className={styles.modeSwitchText}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className={styles.modeSwitchButton}
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setErrorMessage('')
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )

  // Render outside Navbar DOM tree so fixed positioning is not affected by navbar filters.
  return createPortal(modalContent, document.body)
}
