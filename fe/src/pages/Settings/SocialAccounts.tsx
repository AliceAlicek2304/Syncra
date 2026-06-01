import { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import BillingGateOverlay from '../../components/BillingGateOverlay';
import styles from './SocialAccounts.module.css';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons';
import { getSocialAvatarUrl } from '../../utils/social';
import type { SocialAccountDto } from '../../api/socialAccounts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BillingErrorBody {
  reason: string;
  dashboardUrl: string;
  message?: string;
}

interface BillingOverlayState {
  isOpen: boolean;
  reason: string;
  dashboardUrl: string;
}

interface DisconnectState {
  accountId: string;
  platform: string;
  displayName: string;
  scheduledPostCount?: number;
}

import { ZERNIO_PLATFORMS } from '../../data/platforms';
import type { ZernioPlatform } from '../../data/platforms';

// ─── Platform metadata (derived from centralized registry) ──────────────────

const PLATFORMS: (ZernioPlatform & { key: string })[] = ZERNIO_PLATFORMS.map(p => ({
  ...p,
  key: p.id,
}));

type PlatformKey = typeof PLATFORMS[number]['key'];

// ─── Platform brand icons (inline SVG paths) ─────────────────────────────────

function PlatformIcon({ platformKey }: { platformKey: PlatformKey; color: string }) {
  return <ExtendedPlatformIcon platform={platformKey} size={22} />;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SocialAccounts() {
  const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [accounts, setAccounts] = useState<SocialAccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<DisconnectState | null>(null);
  const [billingOverlay, setBillingOverlay] = useState<BillingOverlayState>({
    isOpen: false,
    reason: '',
    dashboardUrl: '',
  });
  // Track if we are about to redirect to OAuth provider
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { success: showSuccess, error: showError } = useToast();

  const showLoading = isLoading || workspaceLoading || !activeWorkspace;

  // ─ Fetch connected accounts ─────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const response = await api.get<SocialAccountDto[]>('social-accounts', {
        headers: {
          'X-Workspace-Id': activeWorkspace.id
        }
      });
      setAccounts(response.data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load connected accounts';
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [showError, activeWorkspace]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchAccounts();
    }
  }, [activeWorkspace, fetchAccounts]);

  // ─ Billing gate helper ───────────────────────────────────────────────────

  const handleBillingError = (err: unknown) => {
    const resp = (err as { response?: { status?: number; data?: BillingErrorBody } })?.response;
    if (resp?.status === 402) {
      setBillingOverlay({
        isOpen: true,
        reason: resp.data?.reason ?? 'free_tier_exceeded',
        dashboardUrl: resp.data?.dashboardUrl ?? '',
      });
      return true;
    }
    return false;
  };

  // ─ Connect flow ──────────────────────────────────────────────────────────

  const handleConnect = async (platform: string) => {
    if (!activeWorkspace) return;
    setConnectingPlatform(platform);
    let isRedirecting = false;
    try {
      const callbackUrl = `${window.location.origin}${import.meta.env.BASE_URL}social-accounts/select`;
      const response = await api.get<{ connectUrl: string }>(
        `social-accounts/connect-url/${platform}`,
        {
          params: { redirectUrl: callbackUrl },
          headers: { 'X-Workspace-Id': activeWorkspace.id },
        }
      );
      isRedirecting = true;
      setIsRedirecting(true);
      window.location.href = response.data.connectUrl;
    } catch (err) {
      if (!handleBillingError(err)) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          `Failed to start ${platform} connection`;
        showError(msg);
      }
    } finally {
      if (!isRedirecting) {
        setConnectingPlatform(null);
        setIsRedirecting(false);
      }
    }
  };

  // ─ Disconnect flow ───────────────────────────────────────────────────────

  const openDisconnectDialog = (account: SocialAccountDto) => {
    setPendingDisconnect({
      accountId: account.id,
      platform: account.platform,
      displayName: account.displayName,
    });
  };

  const confirmDisconnect = async () => {
    if (!pendingDisconnect || !activeWorkspace) return;
    setDisconnecting(pendingDisconnect.accountId);
    setPendingDisconnect(null);
    try {
      await api.delete(`social-accounts/${pendingDisconnect.accountId}`, {
        headers: {
          'X-Workspace-Id': activeWorkspace.id
        }
      });
      showSuccess(`${pendingDisconnect.displayName} disconnected successfully`);
      await fetchAccounts();
    } catch (err) {
      if (!handleBillingError(err)) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to disconnect account';
        showError(msg);
      }
    } finally {
      setDisconnecting(null);
    }
  };

  // ─ Lookup helper ─────────────────────────────────────────────────────────

  const getConnectedAccounts = (platformKey: string) =>
    accounts.filter(
      (a) => a.platform.toLowerCase() === platformKey.toLowerCase() && a.isActive
    );

  // ─ Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Platform grid */}
      <div className={styles.grid}>
        {PLATFORMS.map((platform) => {
          const connectedAccounts = getConnectedAccounts(platform.key);
          const hasConnected = connectedAccounts.length > 0;
          const isConnecting = connectingPlatform === platform.key;

          return (
            <div
              key={platform.key}
              className={`${styles.card} ${hasConnected ? styles.cardConnected : ''}`}
            >
              {/* Platform Header */}
              <div className={styles.cardHeader}>
                <div
                  className={styles.iconWrap}
                  style={{ background: `${platform.color}20`, borderColor: `${platform.color}30` }}
                >
                  <PlatformIcon platformKey={platform.key} color={platform.color} />
                </div>

                <div className={styles.cardHeaderMeta}>
                  <span className={styles.platformName}>{platform.label}</span>
                  <span className={styles.accountsCount}>
                    {hasConnected 
                      ? `${connectedAccounts.length} account${connectedAccounts.length > 1 ? 's' : ''}` 
                      : 'Not connected'}
                  </span>
                </div>

                {hasConnected && (
                  <button
                    className={styles.btnAddAccount}
                    onClick={() => handleConnect(platform.key)}
                    disabled={isConnecting || showLoading}
                    title={`Connect another ${platform.label} account`}
                    aria-label={`Connect another ${platform.label} account`}
                  >
                    {isConnecting ? (
                      <Loader2 size={14} className={styles.spinner} />
                    ) : (
                      <Plus size={14} />
                    )}
                  </button>
                )}
              </div>

              {/* Accounts list (if connected) */}
              {hasConnected ? (
                <div className={styles.accountsList} role="region" aria-label={`Connected ${platform.label} accounts`}>
                  {connectedAccounts.map((account) => {
                    const isDisconnecting = disconnecting === account.id;
                    return (
                      <div key={account.id} className={styles.accountRow}>
                        {getSocialAvatarUrl(account) ? (
                          <img
                            src={getSocialAvatarUrl(account)}
                            alt={account.displayName}
                            className={styles.avatar}
                          />
                        ) : (
                          <div className={styles.avatarFallback}>
                            {account.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={styles.accountMeta}>
                          <span className={styles.accountName} title={account.displayName}>
                            {account.displayName}
                          </span>
                          {account.handle && (
                            <span className={styles.accountHandle} title={account.handle}>
                              {account.handle}
                            </span>
                          )}
                        </div>
                        <button
                          className={styles.btnDisconnectIcon}
                          onClick={() => openDisconnectDialog(account)}
                          disabled={isDisconnecting}
                          title={`Disconnect ${account.displayName} (${platform.label})`}
                          aria-label={`Disconnect ${account.displayName} (${platform.label})`}
                        >
                          {isDisconnecting ? (
                            <Loader2 size={13} className={styles.spinner} />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Action button at bottom if not connected */
                <div className={styles.cardFooter}>
                  <button
                    className={styles.btnConnectFull}
                    onClick={() => handleConnect(platform.key)}
                    disabled={isConnecting || showLoading}
                    aria-label={`Connect ${platform.label}`}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={14} className={styles.spinner} />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink size={14} />
                        Connect {platform.label}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {showLoading && (
        <div className={styles.loadingOverlay}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading accounts...</span>
        </div>
      )}
      {isRedirecting && (
        <div className={styles.loadingOverlay}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Redirecting to provider...</span>
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      {pendingDisconnect && (
        <div className={styles.dialogBackdrop} role="dialog" aria-modal="true">
          <div className={styles.dialogCard}>
            <div className={styles.dialogIcon}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 className={styles.dialogTitle}>
              Disconnect {pendingDisconnect.platform}
            </h3>
            <p className={styles.dialogBody}>
              Are you sure you want to disconnect{' '}
              <strong>{pendingDisconnect.displayName}</strong> from this workspace?
              All pending posts scheduled for this account will be canceled.
              This action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.btnDanger} onClick={confirmDisconnect}>
                Yes, Disconnect
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => setPendingDisconnect(null)}
              >
                Keep Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing gate overlay */}
      <BillingGateOverlay
        isOpen={billingOverlay.isOpen}
        reason={billingOverlay.reason}
        dashboardUrl={billingOverlay.dashboardUrl}
        onClose={() =>
          setBillingOverlay((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Empty state */}
      {!showLoading && accounts.length === 0 && (
        <div className={styles.emptyState}>
          <Wifi size={32} className={styles.emptyIcon} />
          <h4>No Social Accounts Connected</h4>
          <p>
            Link your social channels to schedule posts, view performance analytics,
            and reply to messages from a single workspace dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
