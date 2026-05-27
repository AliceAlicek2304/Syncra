import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Loader2, AlertTriangle, Building2 } from 'lucide-react';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import styles from './SocialAccountsSelect.module.css';
import { useWorkspace } from '../../context/WorkspaceContext';

  // ─── Types ───────────────────────────────────────────────────────────────────

interface PageItem {
  id: string;
  name: string;
  category?: string;
  avatarUrl?: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

// Platforms that connect directly without page/board selection step
const DIRECT_CONNECT_PLATFORMS = ['tiktok'];

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

  const isDirectConnect = DIRECT_CONNECT_PLATFORMS.includes(platform) && !!accountId;

  // ─ Handle direct connect or fetch pages ──────────────────────────────

  useEffect(() => {
    if (hasInitialized.current) return;
    if (workspaceLoading || !activeWorkspace) return;
    hasInitialized.current = true;

    if (!platform || !state) {
      setErrorMessage('Invalid callback parameters. Please try connecting your account again.');
      setLoadState('error');
      return;
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
        const response = await api.get<PageItem[]>(
          `social-accounts/${platform}/pages`,
          {
            params: { tempToken, state },
            headers: {
              'X-Workspace-Id': activeWorkspace.id
            }
          }
        );
        const resData = response.data as any;
        setItems(resData.options ? resData.options : resData);
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
  }, [platform, tempToken, state, activeWorkspace, workspaceLoading, isDirectConnect, accountId, username, navigate, showSuccess]);

  // ─ Submit selection ─────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!selectedId || !activeWorkspace) return;

    setIsSubmitting(true);
    try {
      await api.post(`social-accounts/${platform}/select-page`, {
        selectedId: selectedId,
        tempToken,
        state,
      }, {
        headers: {
          'X-Workspace-Id': activeWorkspace.id
        }
      });
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

  // ─ Render: skeleton ─────────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className={styles.pageRoot}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonSubtitle}`} />
          </div>
          <div className={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${styles.skeletonRow} ${styles.shimmer}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─ Render: error ────────────────────────────────────────────────────────

  if (loadState === 'error') {
    return (
      <div className={styles.pageRoot}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <AlertTriangle size={32} color="#ef4444" />
            <h2>Something went wrong</h2>
            <p>{errorMessage}</p>
            <button
              className={styles.btnPrimary}
              onClick={() => navigate('/app/connections', { replace: true })}
            >
              Back to Connections
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─ Render: selection list ────────────────────────────────────────────────

  const platformLabel = platform
    ? platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')
    : 'Account';

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Select {platformLabel} Account</h1>
          <p className={styles.subtitle}>
            Choose the page, organization, or profile you want to connect to this workspace.
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
      </div>

      {/* Fixed bottom action bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
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
      </div>
    </div>
  );
}
