import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [status, setStatus] = useState('Connecting...');
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      showError('Google authentication was cancelled or denied');
      navigate('/login');
      return;
    }

    if (!code || !state) {
      showError('Invalid OAuth callback parameters');
      navigate('/login');
      return;
    }

    const processCallback = async () => {
      try {
        setStatus('Signing you in...');
        const response = await authApi.oauthCallback('google', code, state);
        localStorage.setItem('syncra_access_token', response.token);
        setStatus('Success! Redirecting...');
        navigate('/app/dashboard', { replace: true });
      } catch (err: unknown) {
        console.error('OAuth callback error:', err);
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete Google sign-in';
        showError(message);
        navigate('/login');
      }
    };

    processCallback();
  }, [searchParams, navigate, showError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b14]">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mx-auto" />
        <p className="text-lg font-semibold text-white">{status}</p>
      </div>
    </div>
  );
}
