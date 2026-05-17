import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import styles from './VerifyEmailPage.module.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const { hydrateSession } = useAuth();
  const [status, setStatus] = useState('Verifying email...');
  const [tokenError, setTokenError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const hasProcessed = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (hasProcessed.current) return;
    if (!token) {
      setTokenError(true);
      setIsVerifying(false);
      return;
    }

    hasProcessed.current = true;

    const verifyEmail = async () => {
      try {
        setStatus('Verifying your email...');
        const response = await authApi.verifyEmail(token);

        // Store JWT token (auto-login per D-02)
        localStorage.setItem('syncra_access_token', response.token);
        localStorage.removeItem('syncra_workspace_id');

        setStatus('Success! Syncing account...');
        await hydrateSession();

        setStatus('Redirecting to dashboard...');
        setIsVerifying(false);
        showSuccess('Email verified successfully!');

        // Redirect to dashboard after brief delay so user sees success state
        setTimeout(() => {
          navigate('/app/dashboard', { replace: true });
        }, 1000);
      } catch (err: unknown) {
        console.error('Email verification error:', err);
        const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || 'The verification link is invalid or has expired.';

        showError(errorMessage);
        setTokenError(true);
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token, navigate, showError, showSuccess, hydrateSession]);

  // Error state: token missing, expired, or invalid
  if (tokenError) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Invalid or expired link</h2>
            <p className={styles.subtitle}>
              This verification link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => navigate('/app/settings', { replace: true })}
              className={styles.primaryBtn}
            >
              Go to Settings
            </button>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className={styles.secondaryBtn}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading/verifying state
  if (isVerifying) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p className={styles.status}>{status}</p>
        </div>
      </div>
    );
  }

  // Should not reach here (will redirect or show error)
  return null;
}
