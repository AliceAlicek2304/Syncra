import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import LinkAccountModal from '../components/auth/LinkAccountModal';
import { useAuth } from '../context/AuthContext';
import { PageWrapper } from '../components/PageWrapper';
import { adminApi } from '../api/admin';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const { hydrateSession } = useAuth();
  const [status, setStatus] = useState('Connecting...');
  const [linkingState, setLinkingState] = useState<{
    showModal: boolean;
    email: string;
    providerKey: string;
    avatarUrl?: string;
  }>({
    showModal: false,
    email: '',
    providerKey: '',
    avatarUrl: '',
  });
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

        // Handle successful login
        localStorage.setItem('syncra_access_token', response.token);
        localStorage.removeItem('syncra_workspace_id');
        localStorage.removeItem('syncra_profile_id');

        setStatus('Success! Syncing account...');
        await hydrateSession();
        setStatus('Redirecting...');
        try {
          await adminApi.checkAccess();
          navigate('/admin', { replace: true });
        } catch {
          navigate('/app/connections', { replace: true });
        }
      } catch (err: unknown) {
        console.error('OAuth callback error:', err);
        
        const errorData = (err as { response?: { data?: { code?: string, email?: string, providerKey?: string, avatarUrl?: string, message?: string } } })?.response?.data;
        
        if (errorData?.code === 'linking_required' && errorData.email && errorData.providerKey) {
          setStatus('Account linking required');
          setLinkingState({
            showModal: true,
            email: errorData.email,
            providerKey: errorData.providerKey,
            avatarUrl: errorData.avatarUrl,
          });
          return;
        }

        const message = errorData?.message || 'Failed to complete Google sign-in';
        showError(message);
        navigate('/login');
      }
    };

    processCallback();
  }, [searchParams, navigate, showError]);

  const handleLinkSuccess = async (token: string) => {
    localStorage.setItem('syncra_access_token', token);
    localStorage.removeItem('syncra_workspace_id');
    localStorage.removeItem('syncra_profile_id');
    setStatus('Success! Account linked. Syncing...');
    await hydrateSession();
    setStatus('Redirecting...');
    setLinkingState(prev => ({ ...prev, showModal: false }));
    try {
      await adminApi.checkAccess();
      navigate('/admin', { replace: true });
    } catch {
      navigate('/app/connections', { replace: true });
    }
  };

  return (
    <PageWrapper>
      <div className="flex min-h-screen items-center justify-center bg-brand-canvas-soft">
        <div className="text-center">
          {!linkingState.showModal && (
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto" />
          )}
          <p className="text-lg font-semibold text-brand-ink">{status}</p>
        </div>

        <LinkAccountModal
          isOpen={linkingState.showModal}
          onClose={() => navigate('/login')}
          email={linkingState.email}
          providerKey={linkingState.providerKey}
          avatarUrl={linkingState.avatarUrl}
          onLinkSuccess={handleLinkSuccess}
        />
      </div>
    </PageWrapper>
  );
}
