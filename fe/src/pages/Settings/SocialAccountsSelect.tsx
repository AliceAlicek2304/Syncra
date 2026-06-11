import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Check, ArrowRight, Loader2, AlertTriangle, Building2, Info, XCircle, Clock,
} from 'lucide-react';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import styles from './SocialAccountsSelect.module.css';
import { useWorkspace } from '../../context/WorkspaceContext';
import logo from '../../assets/syncra-logo.png';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageItem {
  id: string;
  name: string;
  category?: string;
  avatarUrl?: string;
}

interface ErrorInfo {
  title: string;
  message: string;
  suggestion?: string;
  icon: 'alert' | 'info' | 'denied' | 'expired';
}

type LoadState = 'loading' | 'loaded' | 'error';

// Platforms that require page/board/location/profile/phone selection step
const SUB_ENTITY_PLATFORMS = ['facebook', 'linkedin', 'pinterest', 'googlebusiness', 'whatsapp', 'snapchat'];

const ZERNIO_ERROR_MESSAGES: Record<string, string> = {
  no_facebook_pages: 'No Facebook Pages found for this account. You need at least one Facebook Page to post through Syncra.',
  access_denied: 'You declined the authorization request on the provider\'s website.',
  user_unauthorized: 'Authorization could not be completed. The provider did not grant access.',
};

const ZERNIO_ERROR_SUGGESTIONS: Record<string, string> = {
  no_facebook_pages: 'Create a Facebook Page at facebook.com/pages/create, then try connecting again.',
  access_denied: 'No action needed. Go back to Connections when you\'re ready to try again.',
  user_unauthorized: 'Return to Connections and try connecting your account again.',
};

const ZERNIO_ERROR_ICONS: Record<string, ErrorInfo['icon']> = {
  no_facebook_pages: 'info',
  access_denied: 'denied',
  user_unauthorized: 'alert',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SocialAccountsSelect() {
  const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const hasInitialized = useRef(false);

  const [items, setItems] = useState<PageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // Extract query params — accept both Zernio headless names and direct-connect names
  const platform = searchParams.get('platform') ?? searchParams.get('connected') ?? '';
  const tempToken = searchParams.get('tempToken') ?? searchParams.get('connect_token') ?? '';
  const state = searchParams.get('state') ?? '';
  const accountId = searchParams.get('accountId') ?? '';
  const username = searchParams.get('username') ?? '';
  const profileId = searchParams.get('profileId') ?? '';
  const userProfileParam = searchParams.get('userProfile') ?? '';

  // Decode and parse userProfile from URL (facebook redirects double-url encode this parameter)
  let userProfileObj: any = null;
  if (userProfileParam) {
    try {
      const decodedOnce = decodeURIComponent(userProfileParam);
      const decodedString = decodedOnce.startsWith('%') ? decodeURIComponent(decodedOnce) : decodedOnce;
      userProfileObj = JSON.parse(decodedString);
    } catch (e) {
      console.error('Failed to parse userProfile', e);
    }
  }

  const isDirectConnect = !SUB_ENTITY_PLATFORMS.includes(platform.toLowerCase()) && !!accountId;
  const zernioError = searchParams.get('error') ?? '';

  const handleRetry = () => {
    hasInitialized.current = false;
    setLoadState('loading');
    setErrorInfo(null);
  };

  const errorIconMap: Record<ErrorInfo['icon'], React.ReactNode> = {
    alert: <AlertTriangle size={32} />,
    info: <Info size={32} />,
    denied: <XCircle size={32} />,
    expired: <Clock size={32} />,
  };

  // ─ Submit selection ─────────────────────────────────────────────────────

  const handleConfirm = useCallback(async (idOverride?: string) => {
    const idToConfirm = idOverride || selectedId;
    if (!idToConfirm || !activeWorkspace) return;

    setIsSubmitting(true);
    try {
      if (platform.toLowerCase() === 'facebook') {
        await api.post(`connect/facebook/select-page`, {
          profileId,
          pageId: idToConfirm,
          tempToken,
          userProfile: {
            ...(userProfileObj || {}),
            name: userProfileObj?.name || userProfileObj?.displayName || userProfileObj?.username || '',
          },
        }, {
          headers: {
            'X-Workspace-Id': activeWorkspace.id
          }
        });
      } else {
        await api.post(`social-accounts/${platform}/select-page`, {
          selectedId: idToConfirm,
          tempToken,
          state,
          userProfile: userProfileObj || {},
        }, {
          headers: {
            'X-Workspace-Id': activeWorkspace.id
          }
        });
      }
      showSuccess(`${platform} account connected successfully`);
      navigate('/app/connections', { replace: true });
    } catch (err) {
      const respErr = err as { response?: { data?: { message?: string } } };
      const msg = respErr?.response?.data?.message || 'Failed to complete the connection.';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [platform, profileId, tempToken, state, userProfileObj, selectedId, activeWorkspace, showSuccess, navigate, showError]);

  // ─ Handle direct connect or fetch pages ──────────────────────────────

  useEffect(() => {
    if (hasInitialized.current) return;
    if (workspaceLoading || !activeWorkspace) return;
    hasInitialized.current = true;

    // Zernio error param (provider-level error, e.g. no_facebook_pages)
    if (zernioError) {
      setErrorInfo({
        title: 'Connection couldn\'t be completed',
        message: ZERNIO_ERROR_MESSAGES[zernioError]
          || `The provider returned: ${zernioError.replace(/_/g, ' ')}`,
        suggestion: ZERNIO_ERROR_SUGGESTIONS[zernioError]
          || 'Return to Connections and try again.',
        icon: ZERNIO_ERROR_ICONS[zernioError] || 'alert',
      });
      setLoadState('error');
      return;
    }

    // Missing platform param
    if (!platform) {
      setErrorInfo({
        title: 'No platform specified',
        message: 'The callback didn\'t include which platform to connect. This may be a temporary issue with the provider.',
        suggestion: 'Return to Connections and try again.',
        icon: 'expired',
      });
      setLoadState('error');
      return;
    }

    // Missing state token (expired session)
    if (!state) {
      setErrorInfo({
        title: 'Connection session expired',
        message: 'This OAuth session expired or the state parameter is missing. Connections must be completed within 15 minutes.',
        suggestion: 'Return to Connections and start a fresh connection.',
        icon: 'expired',
      });
      setLoadState('error');
      return;
    }

    // Facebook-specific: profileId + tempToken
    if (platform.toLowerCase() === 'facebook') {
      if (!profileId || !tempToken) {
        setErrorInfo({
          title: 'Facebook data incomplete',
          message: 'The Facebook callback was missing required data (profile ID or temporary token).',
          suggestion: 'Return to Connections and try connecting Facebook again.',
          icon: 'alert',
        });
        setLoadState('error');
        return;
      }
    }

    // Direct-connect platforms (e.g. TikTok): skip select page UI, save & redirect
    if (isDirectConnect) {
      const completeDirectConnect = async () => {
        try {
          await api.post('social-accounts/direct-connect', {
            state,
            connectToken: tempToken,
            platform,
            accountId,
            displayName: username,
          }, {
            headers: { 'X-Workspace-Id': activeWorkspace.id }
          });
          showSuccess(`${platform} account connected successfully`);
          navigate('/app/connections', { replace: true });
        } catch (err) {
          const respErr = err as { response?: { data?: { message?: string } } };
          setErrorInfo({
            title: 'Connection failed',
            message: respErr?.response?.data?.message || 'The provider did not complete the connection.',
            suggestion: 'Return to Connections and try again.',
            icon: 'alert',
          });
          setLoadState('error');
        }
      };
      completeDirectConnect();
      return;
    }

    // Sub-entity platforms: tempToken required
    if (!tempToken) {
      setErrorInfo({
        title: 'Connection data missing',
        message: 'The callback was missing the temporary access token needed to load account options.',
        suggestion: 'Return to Connections and try again.',
        icon: 'expired',
      });
      setLoadState('error');
      return;
    }

    const fetchPages = async () => {
      try {
        let response;
        if (platform.toLowerCase() === 'facebook') {
          response = await api.get(
            `connect/facebook/select-page`,
            {
              params: { profileId, tempToken },
              headers: { 'X-Workspace-Id': activeWorkspace.id }
            }
          );
        } else {
          response = await api.get<PageItem[]>(
            `social-accounts/${platform}/pages`,
            {
              params: { tempToken, state, userProfile: userProfileParam },
              headers: { 'X-Workspace-Id': activeWorkspace.id }
            }
          );
        }
        const resData = response.data as any;
        const rawItems: any[] = resData.pages ? resData.pages : (resData.options ? resData.options : resData);
        const mappedItems = rawItems.map((item: any) => ({
          ...item,
          avatarUrl: item.picture?.data?.url || item.avatarUrl,
        }));
        setItems(mappedItems);

        // Auto-connect LinkedIn Personal Profile if that's the only option
        if (platform.toLowerCase() === 'linkedin' && mappedItems.length === 1 && mappedItems[0].id === 'personal') {
          await handleConfirm(mappedItems[0].id);
        } else {
          setLoadState('loaded');
        }
      } catch (err) {
        const respErr = err as { response?: { data?: { message?: string } } };
        setErrorInfo({
          title: 'Failed to load options',
          message: respErr?.response?.data?.message || `Could not load available accounts for ${platform}.`,
          suggestion: 'This may be a temporary issue. Return to Connections and try again.',
          icon: 'alert',
        });
        setLoadState('error');
      }
    };

    fetchPages();
  }, [platform, tempToken, state, activeWorkspace, workspaceLoading, isDirectConnect, accountId, username, navigate, showSuccess, profileId, zernioError, userProfileParam, handleConfirm]);

  const platformLabel = platform
    ? platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')
    : 'Account';

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        {/* Centered logo */}
        <div className={styles.logoContainer}>
          <img src={logo} alt="Syncra" className={styles.logoImg} />
          <span className={styles.logoText}>Syncra</span>
        </div>

        {/* Centered Card */}
        <div className={styles.card}>
          {loadState === 'loading' && (
            <>
              <div className={styles.header}>
                <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonSubtitle}`} />
              </div>
              <div className={styles.list}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.skeletonRow} ${styles.shimmer}`} />
                ))}
              </div>
            </>
          )}

          {loadState === 'error' && errorInfo && (
            <div className={styles.errorState}>
              <div className={`${styles.errorIconWrap} ${styles[`errorIcon_${errorInfo.icon}`]}`}>
                {errorIconMap[errorInfo.icon]}
              </div>
              <h2 className={styles.errorTitle}>{errorInfo.title}</h2>
              <p className={styles.errorMessage}>{errorInfo.message}</p>
              {errorInfo.suggestion && (
                <p className={styles.errorSuggestion}>{errorInfo.suggestion}</p>
              )}
              <div className={styles.errorActions}>
                <button
                  className={styles.btnPrimary}
                  onClick={() => navigate('/app/connections', { replace: true })}
                >
                  Back to Connections
                </button>
                {zernioError && (
                  <button
                    className={styles.btnGhost}
                    onClick={handleRetry}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {loadState === 'loaded' && (
            <>
              {/* Header */}
              <div className={styles.header}>
                <h1 className={styles.title}>Select {platformLabel} page</h1>
                <p className={styles.subtitle}>
                  Choose which page to connect for posting.
                </p>
              </div>

              {/* Page list */}
              <div className={styles.list} role="listbox" aria-label="Available accounts">
                {items.length === 0 ? (
                  <div className={styles.emptyList}>
                    <Building2 size={28} />
                    <p>No pages or accounts found for this connection.</p>
                  </div>
                ) : (
                  items.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={isSelected}
                        className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        {/* Avatar or fallback icon */}
                        <div className={styles.rowAvatarWrap}>
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.name}
                              className={styles.rowAvatar}
                            />
                          ) : (
                            <div className={styles.rowAvatarFallback}>
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Name and category */}
                        <div className={styles.rowMeta}>
                          <span className={styles.rowName}>{item.name}</span>
                          {item.category && (
                            <span className={styles.rowCategory}>{item.category}</span>
                          )}
                        </div>

                        {/* Selection indicator */}
                        <div
                          className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ''}`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Actions inside card */}
              <div className={styles.cardActions}>
                <button
                  className={styles.btnGhost}
                  onClick={() => navigate('/app/connections', { replace: true })}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={() => handleConfirm()}
                  disabled={!selectedId || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className={styles.spinner} />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Confirm Connection
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
