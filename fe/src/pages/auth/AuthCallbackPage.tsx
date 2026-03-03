import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Handles the redirect from the backend after Google OAuth.
 * The backend appends ?token=<jwt>&email=<email> to this URL.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const token = params.get('token')
    const email = params.get('email')
    const error = params.get('error')

    if (token && email) {
      loginWithToken(token, email)
      navigate('/app/dashboard', { replace: true })
    } else {
      // OAuth failed — send back to auth with a readable error
      const msg = error === 'oauth_failed'
        ? 'Google sign-in failed. Please try again.'
        : error === 'db_not_configured'
          ? 'Server is not configured yet. Please try email/password.'
          : 'Authentication failed. Please try again.'
      navigate(`/auth?oauthError=${encodeURIComponent(msg)}`, { replace: true })
    }
  }, [params, loginWithToken, navigate])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#fff' }}>
      Signing you in…
    </div>
  )
}
