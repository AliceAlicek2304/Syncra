import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

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

        setStatus('Redirecting...');
        setIsVerifying(false);
        showSuccess('Email verified successfully!');

        // Redirect to connections after brief delay so user sees success state
        setTimeout(() => {
          navigate('/app/connections', { replace: true });
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
      <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
        <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-md flex flex-col gap-6 text-center">
          <div>
            <h2 className="text-2xl font-black text-brand-ink tracking-tight mb-2">Invalid or expired link</h2>
            <p className="text-sm text-brand-body leading-relaxed">
              This verification link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              onClick={() => navigate('/app/connections', { replace: true })}
              className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold rounded-brand-md text-sm transition-all text-center focus:outline-none"
            >
              Go to Connections
            </button>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="flex-1 py-3 bg-brand-canvas-soft border border-brand-border hover:bg-brand-border/10 text-brand-ink font-bold rounded-brand-md text-sm transition-all text-center focus:outline-none"
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
      <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
        <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-sm flex flex-col items-center justify-center gap-6">
          <div className="animate-spin h-9 w-9 border-4 border-brand-primary border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-brand-body tracking-wide">{status}</p>
        </div>
      </div>
    );
  }

  // Should not reach here (will redirect or show error)
  return null;
}
