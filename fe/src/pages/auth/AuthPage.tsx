import { useState } from 'react'
import { Zap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AuthPage.module.css'

type AuthTab = 'signin' | 'signup'

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(searchParams.get('oauthError') || '')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const switchTab = (t: AuthTab) => {
    setTab(t)
    setError('')
    setPassword('')
    setConfirm('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (tab === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    try {
      if (tab === 'signin') {
        await signIn(email.trim().toLowerCase(), password)
      } else {
        await signUp(email.trim().toLowerCase(), password)
      }
      navigate('/app/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    // Redirect to backend Google OAuth endpoint (proxied through Vite in dev)
    window.location.href = '/api/auth/google'
  }

  return (
    <div className={styles.page}>
      {/* Background glow */}
      <div className={styles.glow} />

      {/* Logo */}
      <Link to="/" className={styles.logo}>
        <span className={styles.logoIcon}><Zap size={18} /></span>
        <span className={styles.logoText}>TechNest</span>
      </Link>

      <div className={styles.card}>
        {/* Tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Authentication">
          <button
            role="tab"
            aria-selected={tab === 'signin'}
            aria-controls="auth-panel"
            id="tab-signin"
            className={`${styles.tab} ${tab === 'signin' ? styles.tabActive : ''}`}
            onClick={() => switchTab('signin')}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={tab === 'signup'}
            aria-controls="auth-panel"
            id="tab-signup"
            className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
            onClick={() => switchTab('signup')}
          >
            Sign Up
          </button>
        </div>

        <div
          id="auth-panel"
          role="tabpanel"
          aria-labelledby={tab === 'signin' ? 'tab-signin' : 'tab-signup'}
          className={styles.cardBody}
        >
          <h1 className={styles.title}>
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className={styles.subtitle}>
            {tab === 'signin'
              ? 'Sign in to continue to TechNest'
              : 'Start creating smarter content today'}
          </p>

          {/* Google OAuth button */}
          <button
            className={styles.googleBtn}
            onClick={handleGoogleAuth}
            type="button"
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {tab === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
          </button>

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Error message */}
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}

          {/* Email / Password form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-name">Full name</label>
                <div className={styles.inputWrapper}>
                  <User size={16} className={styles.inputIcon} />
                  <input
                    id="auth-name"
                    type="text"
                    className={styles.input}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-email">Email address</label>
              <div className={styles.inputWrapper}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="auth-email"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-password">Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder={tab === 'signup' ? 'Create a password' : 'Enter your password'}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {tab === 'signup' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-confirm">Confirm password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} className={styles.inputIcon} />
                  <input
                    id="auth-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={styles.input}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {tab === 'signin' && (
              <div className={styles.forgotRow}>
                <button
                  type="button"
                  className={styles.forgotBtn}
                  onClick={() => {
                    // Forgot password — not in scope
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading
                ? 'Please wait…'
                : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className={styles.switchRow}>
            {tab === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button className={styles.switchBtn} onClick={() => switchTab('signup')}>
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className={styles.switchBtn} onClick={() => switchTab('signin')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <button
        className={styles.backBtn}
        onClick={() => navigate('/')}
        type="button"
      >
        ← Back to home
      </button>
    </div>
  )
}

