import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Loader2, AlertTriangle, Building2 } from 'lucide-react';
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

type LoadState = 'loading' | 'loaded' | 'error';

// Platforms that require page/board/location/profile/phone selection step
const SUB_ENTITY_PLATFORMS = ['facebook', 'linkedin', 'pinterest', 'googlebusiness', 'whatsapp', 'snapchat'];

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
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // ─ Handle direct connect or fetch pages ──────────────────────────────

  useEffect(() => {
    if (hasInitialized.current) return;
    if (workspaceLoading || !activeWorkspace) return;
    hasInitialized.current = true;

    if (platform.toLowerCase() === 'facebook') {
      if (!platform || !profileId || !tempToken) {
        setErrorMessage('Invalid callback parameters. Please try connecting your account again.');
        setLoadState('error');
        return;
      }
    } else {
      if (!platform || !state) {
        setErrorMessage('Invalid callback parameters. Please try connecting your account again.');
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
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to complete connection. Please try again.';
          setErrorMessage(msg);
          setLoadState('error');
        }
      };
      completeDirectConnect();
      return;
    }

    // Page-select platforms (Facebook, LinkedIn, etc.)
    if (!tempToken) {
      setErrorMessage('Invalid callback parameters. Please try connecting your account again.');
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
              headers: {
                'X-Workspace-Id': activeWorkspace.id
              }
            }
          );
        } else {
          response = await api.get<PageItem[]>(
            `social-accounts/${platform}/pages`,
            {
              params: { tempToken, state },
              headers: {
                'X-Workspace-Id': activeWorkspace.id
              }
            }
          );
        }
        const resData = response.data as any;
        setItems(resData.pages ? resData.pages : (resData.options ? resData.options : resData));
        setLoadState('loaded');
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load account options. Please try again.';
        setErrorMessage(msg);
        setLoadState('error');
      }
    };

    fetchPages();
  }, [platform, tempToken, state, activeWorkspace, workspaceLoading, isDirectConnect, accountId, username, navigate, showSuccess, profileId]);

  // ─ Submit selection ─────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!selectedId || !activeWorkspace) return;

    setIsSubmitting(true);
    try {
      if (platform.toLowerCase() === 'facebook') {
        await api.post(`connect/facebook/select-page`, {
          profileId,
          pageId: selectedId,
          tempToken,
          userProfile: userProfileObj,
        }, {
          headers: {
            'X-Workspace-Id': activeWorkspace.id
          }
        });
      } else {
        await api.post(`social-accounts/${platform}/select-page`, {
          selectedId: selectedId,
          tempToken,
          state,
        }, {
          headers: {
            'X-Workspace-Id': activeWorkspace.id
          }
        });
      }
      showSuccess(`${platform} account connected successfully`);
      navigate('/app/connections', { replace: true });
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to complete connection. Please try again.';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {loadState === 'error' && (
            <div className={styles.errorState}>
              <AlertTriangle size={32} className={styles.errorIcon} />
              <h2>Something went wrong</h2>
              <p>{errorMessage}</p>
              <button
                className={styles.btnPrimary}
                onClick={() => navigate('/app/connections', { replace: true })}
              >
                Back to Connections
              </button>
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
                  onClick={handleConfirm}
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
