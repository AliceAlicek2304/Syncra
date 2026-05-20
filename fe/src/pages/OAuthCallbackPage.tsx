import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import LinkAccountModal from '../components/auth/LinkAccountModal';
import { useAuth } from '../context/AuthContext';

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

        console.log('[OAuth] Backend response:', { token: response.token?.substring(0, 20) + '...', refreshToken: response.refreshToken?.substring(0, 20) + '...' });

        // Handle successful login
        localStorage.setItem('syncra_access_token', response.token);
        localStorage.removeItem('syncra_workspace_id');
        console.log(`[OAuth] Token saved to localStorage (length: ${response.token.length})`);

        setStatus('Success! Syncing account...');
        await hydrateSession();
        setStatus('Redirecting...');
        navigate('/app/dashboard', { replace: true });
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
    setStatus('Success! Account linked. Syncing...');
    await hydrateSession();
    setStatus('Redirecting...');
    setLinkingState(prev => ({ ...prev, showModal: false }));
    navigate('/app/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b14]">
      <div className="text-center">
        {!linkingState.showModal && (
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mx-auto" />
        )}
        <p className="text-lg font-semibold text-white">{status}</p>
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
  );
}
