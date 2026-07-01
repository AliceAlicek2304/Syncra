import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronDown, ChevronUp, Check, X, Info, Loader2, Key, Lock, ShieldCheck, Trash2, Link2, ChevronRight, Pencil, HelpCircle, AlertCircle
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { workspacesApi } from '../../api/workspaces';
import type { SocialAccountDto } from '../../api/socialAccounts';
import type { Profile } from '../../api/types';
import { socialAccountsApi } from '../../api/socialAccounts';
import { getSocialAvatarUrl, getFbPageAvatarUrl } from '../../utils/social';
import { postsApi } from '../../api/posts';
import api from '../../lib/axios';
import { useBilling } from '../../context/BillingContext';
import { useNavigate } from 'react-router-dom';
import SubscriptionUpgradeModal from '../../components/SubscriptionUpgradeModal';
import styles from './ConnectionsPage.module.css';
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons';

// ── Platform Metadata ────────────────────────────────────────────────────────
interface PlatformConfig {
  id: string;
  label: string;
  color: string;
  isSupported: boolean;
}

const ALL_PLATFORMS: PlatformConfig[] = [
  { id: 'tiktok', label: 'TikTok', color: '#ff0050', isSupported: true },
  { id: 'instagram', label: 'Instagram', color: '#e4405f', isSupported: true },
  { id: 'facebook', label: 'Facebook', color: '#1877f2', isSupported: true },
  { id: 'youtube', label: 'YouTube', color: '#ff0000', isSupported: true },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', isSupported: true },
  { id: 'twitter', label: 'Twitter / X', color: '#211329', isSupported: false },
  { id: 'threads', label: 'Threads', color: '#211329', isSupported: true },
  { id: 'bluesky', label: 'Bluesky', color: '#0085ff', isSupported: true },
  { id: 'pinterest', label: 'Pinterest', color: '#e60023', isSupported: true },
  { id: 'reddit', label: 'Reddit', color: '#ff4500', isSupported: true },
  { id: 'googlebusiness', label: 'Google Business', color: '#4285f4', isSupported: true },
  { id: 'telegram', label: 'Telegram', color: '#0088cc', isSupported: false },
  { id: 'discord', label: 'Discord', color: '#5865f2', isSupported: false },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25d366', isSupported: true },
  { id: 'snapchat', label: 'Snapchat', color: '#fffc00', isSupported: true },
];

const SUB_ENTITY_PLATFORMS = ['facebook', 'linkedin', 'pinterest', 'googlebusiness', 'whatsapp', 'snapchat'];

const getManageButtonLabel = (platform: string): string => {
  const p = platform.toLowerCase();
  switch (p) {
    case 'facebook':
      return 'Manage Pages';
    case 'linkedin':
      return 'Manage Orgs';
    case 'pinterest':
      return 'Manage Boards';
    case 'googlebusiness':
      return 'Manage Locations';
    case 'whatsapp':
      return 'Manage Phones';
    case 'snapchat':
      return 'Manage Profiles';
    default:
      return 'Manage Pages';
  }
};

const getSubEntityName = (platform: string): string => {
  const p = platform.toLowerCase();
  switch (p) {
    case 'facebook':
      return 'page';
    case 'linkedin':
      return 'organization';
    case 'pinterest':
      return 'board';
    case 'googlebusiness':
      return 'location';
    case 'whatsapp':
      return 'phone number';
    case 'snapchat':
      return 'profile';
    default:
      return 'page';
  }
};

const PLATFORM_GROUPS: { title: string; platformIds: string[] }[] = [
  {
    title: 'Social',
    platformIds: [
      'tiktok',
      'instagram',
      'facebook',
      'youtube',
      'linkedin',
      'twitter',
      'threads',
      'bluesky',
      'pinterest',
      'reddit',
      'googlebusiness',
      'snapchat',
    ],
  },
  {
    title: 'Communication',
    platformIds: [
      'telegram',
      'discord',
      'whatsapp',
    ],
  },
];

function PlatformIcon({ platform, size = 20 }: { platform: string; size?: number }) {
  const p = platform.toLowerCase();
  const mapped: Record<string, string> = {
    'twitter/x': 'twitter',
  };
  return <ExtendedPlatformIcon platform={mapped[p] || p} size={size} />;
}



// ── Account Health Modal ─────────────────────────────────────────────────────

function HealthModal({ account, workspaceId, onClose }: {
  account: SocialAccountDto;
  workspaceId: string;
  onClose: () => void;
}) {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['account-health', account.id],
    queryFn: () => socialAccountsApi.getAccountHealth(workspaceId, account.id),
    enabled: !!workspaceId,
  });

  const s = health?.status.toLowerCase() ?? '';

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Account Health</h2>
              <p className={styles.modalSubtitle}>
                @{account.displayName || account.externalAccountId} · {account.platform}
              </p>
            </div>
            <button className={styles.modalCloseBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.modalBody}>
            {isLoading ? (
              <div className={styles.healthLoading}>
                <Loader2 size={24} className={styles.spinner} />
                <p>Loading health data...</p>
              </div>
            ) : error ? (
              <div className={styles.healthBadgeError}>
                <X size={18} />
                <span>Failed to load health data</span>
              </div>
            ) : health ? (
              <>
                <div className={`${styles.healthBadge} ${s === 'healthy' ? styles.healthBadgeOk : s === 'warning' ? styles.healthBadgeWarn : styles.healthBadgeError}`}>
                  {s === 'healthy' ? <Check size={18} /> : <X size={18} />}
                  <span className={styles.healthBadgeLabel}>{health.status}</span>
                </div>

                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>
                    <Key size={14} />
                    <span>Token Status</span>
                  </h3>
                  <div className={styles.metaList}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Valid</span>
                      <span className={health.tokenStatus.valid ? styles.metaValueOk : styles.metaValueBad}>
                        {health.tokenStatus.valid ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Expires in</span>
                      <span className={styles.metaValue}>
                        {health.tokenStatus.expiresIn ?? (health.tokenStatus.expiresAt
                          ? `${Math.max(0, Math.ceil((new Date(health.tokenStatus.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days`
                          : 'Unknown')}
                      </span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Expires at</span>
                      <span className={styles.metaValue}>
                        {health.tokenStatus.expiresAt
                          ? new Date(health.tokenStatus.expiresAt).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>
                    <ShieldCheck size={14} />
                    <span>Permissions</span>
                  </h3>
                  <div className={styles.permGrid}>
                    <div className={health.permissions.canPost ? styles.permBadgeOk : styles.permBadgeFail}>
                      {health.permissions.canPost ? '✓' : '✗'} Can Post
                    </div>
                    <div className={health.permissions.canFetchAnalytics ? styles.permBadgeOk : styles.permBadgeFail}>
                      {health.permissions.canFetchAnalytics ? '✓' : '✗'} Analytics
                    </div>
                  </div>

                  {health.permissions.posting.length > 0 && (
                    <div className={styles.permSubSection}>
                      <p className={styles.permSubTitle}>Required for posting:</p>
                      <div className={styles.permTagsList}>
                        {health.permissions.posting.map(s => (
                          <span key={s.scope} className={s.granted ? styles.permTagOk : styles.permTagFail}>
                            {s.granted ? '✓' : '✗'} {s.scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {health.permissions.analytics.length > 0 && (
                    <div className={styles.permSubSection}>
                      <p className={styles.permSubTitle}>For analytics:</p>
                      <div className={styles.permTagsList}>
                        {health.permissions.analytics.map(s => (
                          <span key={s.scope} className={s.granted ? styles.permTagOk : styles.permTagFail}>
                            {s.granted ? '✓' : '✗'} {s.scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {health.permissions.optional.length > 0 && (
                    <div className={styles.permSubSection}>
                      <p className={styles.permSubTitle}>Optional:</p>
                      <div className={styles.permTagsList}>
                        {health.permissions.optional.map(s => (
                          <span key={s.scope} className={s.granted ? styles.permTagOk : styles.permTagMuted}>
                            {s.granted ? '✓' : '✗'} {s.scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {health.issues.length > 0 && (
                  <div className={styles.issuesBox}>
                    <h3 className={styles.issuesBoxTitle}>
                      <X size={14} />
                      <span>Issues</span>
                    </h3>
                    <ul className={styles.issuesList}>
                      {health.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {health.recommendations.length > 0 && (
                  <div className={styles.recsBox}>
                    <h3 className={styles.recsBoxTitle}>
                      <HelpCircle size={14} />
                      <span>Recommendations</span>
                    </h3>
                    <ul className={styles.recsList}>
                      {health.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.modalCloseActionBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Disconnect Confirm Modal ─────────────────────────────────────────────────
function DisconnectConfirmModal({ account: _account, onClose, onConfirm, isPending, scheduledPostsCount, isCheckingScheduledPosts }: {
  account: SocialAccountDto & { workspace: { name: string } };
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  scheduledPostsCount?: number;
  isCheckingScheduledPosts: boolean;
}) {
  const scheduledPostsText = typeof scheduledPostsCount === 'number' && scheduledPostsCount > 0
    ? `You have ${scheduledPostsCount} scheduled ${scheduledPostsCount === 1 ? 'post' : 'posts'} for this account. Your posts will be preserved for 1 hour. Reconnect the same account within that time to keep them, otherwise they will be cancelled.`
    : null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.disconnectModalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.disconnectModalContent}>
          <div className={styles.disconnectModalHeader}>
            <div className={styles.disconnectHeaderLeft}>
              <Trash2 size={20} className={styles.disconnectIcon} />
              <h2 className={styles.disconnectModalTitle}>Disconnect account</h2>
            </div>
            <button className={styles.modalCloseBtn} onClick={onClose} disabled={isPending}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.disconnectModalBody}>
            <p className={styles.disconnectText}>Are you sure you want to disconnect this account?</p>
            {isCheckingScheduledPosts ? (
              <p className={styles.disconnectScheduledCheck}>Checking scheduled posts…</p>
            ) : scheduledPostsText ? (
              <p className={styles.disconnectScheduledText}>{scheduledPostsText}</p>
            ) : null}
          </div>
          <div className={styles.disconnectModalFooter}>
            <button className={styles.disconnectCancelBtn} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button className={styles.disconnectConfirmBtn} onClick={onConfirm} disabled={isPending || isCheckingScheduledPosts}>
              {isPending ? (
                <span className={styles.btnLoadingWrap}>
                  <Loader2 size={13} className={styles.btnSpinner} />
                  <span>Disconnecting...</span>
                </span>
              ) : (
                'Disconnect'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { workspaces, activeWorkspace, profiles, activeProfile, isLoading: isWorkspaceLoading } = useWorkspace();
  const { success: showSuccess, error: showError } = useToast();
  const { subscription, loading: billingLoading, loadCurrentSubscription } = useBilling();
  const navigate = useNavigate();

  const [selectedHealthAccount, setSelectedHealthAccount] = useState<(SocialAccountDto & { workspace: typeof workspaces[0] }) | null>(null);
  const [selectedManagePagesAccount, setSelectedManagePagesAccount] = useState<(SocialAccountDto & { workspace: typeof workspaces[0] }) | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] = useState<(SocialAccountDto & { workspace: typeof workspaces[0] }) | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectPreCheckLoad, setDisconnectPreCheckLoad] = useState<string | null>(null);
  const [expandedPlatformId, setExpandedPlatformId] = useState<string | null>(null);

  // Drawers open state
  const [isNewProfileOpen, setIsNewProfileOpen] = useState(false);
  const [isNewConnectionOpen, setIsNewConnectionOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Form states
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileColor, setNewProfileColor] = useState('#fda4af');

  // Edit Profile state
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileColor, setEditProfileColor] = useState('');
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);



  const closeProfileDrawer = () => {
    setIsNewProfileOpen(false);
    setNewProfileName('');
    setNewProfileColor('#fda4af');
  };

  const closeEditProfileDrawer = () => {
    setEditingProfile(null);
    setEditProfileName('');
    setEditProfileColor('');
  };

  const closeDeleteProfileModal = () => {
    setProfileToDelete(null);
  };

  // New Connection selection states
  const [selectedProfileForConnection, setSelectedProfileForConnection] = useState<string>('');
  const [isProfileConnDropdownOpen, setIsProfileConnWorkspaceDropdownOpen] = useState(false);

  // Filters state
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<string>('all');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const platformsById = ALL_PLATFORMS.reduce<Record<string, PlatformConfig>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  // Filter dropdown visibility
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
        setIsPlatformDropdownOpen(false);
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync selectedProfileForConnection with active profile when drawer opens
  useEffect(() => {
    if (activeProfile) {
      setSelectedProfileForConnection(activeProfile.id);
    } else if (profiles.length > 0) {
      setSelectedProfileForConnection(profiles[0].id);
    }
    setConnectionError(null);
  }, [activeProfile, profiles, isNewConnectionOpen]);

  // Load subscription on mount
  useEffect(() => {
    if (!subscription && !billingLoading) {
      loadCurrentSubscription();
    }
  }, []);

  // Reset expanded platform when drawer closes or profile changes
  useEffect(() => {
    setExpandedPlatformId(null);
  }, [isNewConnectionOpen, selectedProfileForConnection]);

  // Fetch connections for selected profile or all profiles
  const { data: connections = [], isLoading: isConnectionsLoading } = useQuery<
    (SocialAccountDto & { workspace: typeof workspaces[0] })[]
  >({
    queryKey: ['connections-list'],
    queryFn: async () => {
      // Fetch all accounts for the current workspace. 
      // Note: We still pass workspace ID to the underlying API but we filter by Profile in the UI/BE.
      const ws = activeWorkspace || workspaces[0];
      if (!ws) return [];
      
      try {
        const result = await socialAccountsApi.getSocialAccounts(ws.id);
        return result.items.map(acc => ({ ...acc, workspace: ws }));
      } catch (err) {
        console.error(`Error loading social accounts`, err);
        return [];
      }
    },
    staleTime: 30_000,
    enabled: workspaces.length > 0,
  });

  // Create Profile Mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      return workspacesApi.createProfile(data);
    },
    onSuccess: (newProfile) => {
      showSuccess(`Profile "${newProfile.name}" created successfully`);
      void queryClient.invalidateQueries({ queryKey: ['profiles', activeWorkspace?.id] });
      closeProfileDrawer();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create profile';
      showError(msg);
    }
  });

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      showError('Please enter a profile name');
      return;
    }

    createProfileMutation.mutate({
      name: newProfileName,
      color: newProfileColor === '#fda4af' ? undefined : newProfileColor,
    });
  };

  // Edit Profile Mutation
  const editProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color?: string } }) => {
      return workspacesApi.updateProfile(id, data);
    },
    onSuccess: () => {
      showSuccess('Profile updated successfully');
      closeEditProfileDrawer();
      void queryClient.invalidateQueries({ queryKey: ['profiles', activeWorkspace?.id] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update profile';
      showError(msg);
    }
  });

  // Delete Profile Mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      return workspacesApi.deleteProfile(id);
    },
    onSuccess: () => {
      showSuccess('Profile deleted');
      closeDeleteProfileModal();
      void queryClient.invalidateQueries({ queryKey: ['profiles', activeWorkspace?.id] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete profile';
      showError(msg);
    }
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    if (!editProfileName.trim()) {
      showError('Profile name is required');
      return;
    }
    editProfileMutation.mutate({
      id: editingProfile.id,
      data: {
        name: editProfileName.trim(),
        color: editProfileColor === editingProfile.color || editProfileColor === '#fda4af' ? undefined : editProfileColor,
      },
    });
  };

  // Disconnect Connection Mutation
  const disconnectMutation = useMutation({
    mutationFn: async ({ accountId, workspaceId }: { accountId: string; workspaceId: string }) => {
      await api.delete(`social-accounts/${accountId}`, {
        headers: {
          'X-Workspace-Id': workspaceId
        }
      });
    },
    onSuccess: () => {
      showSuccess("Disconnected successfully");
      setAccountToDisconnect(null);
      void queryClient.invalidateQueries({ queryKey: ['connections-list'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-integrations'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to disconnect social account';
      showError(msg);
      setAccountToDisconnect(null);
    }
  });

  const [scheduledPostsCount, setScheduledPostsCount] = useState<number | undefined>(undefined);
  const [isCheckingScheduledPosts, setIsCheckingScheduledPosts] = useState(false);

  // Facebook pages query (only for Facebook accounts in manage pages drawer)
  const fbAccountId = selectedManagePagesAccount?.platform?.toLowerCase() === 'facebook'
    ? selectedManagePagesAccount.id
    : null;

  const { data: fbPagesData, isLoading: isFbPagesLoading } = useQuery({
    queryKey: ['facebook-pages', fbAccountId],
    queryFn: () => socialAccountsApi.getFacebookPages(
      selectedManagePagesAccount!.workspace.id,
      fbAccountId!
    ),
    enabled: fbAccountId !== null,
  });

  // Switch Facebook page mutation
  const switchFbPageMutation = useMutation({
    mutationFn: async ({ accountId, workspaceId, selectedPageId }: { accountId: string; workspaceId: string; selectedPageId: string }) => {
      await socialAccountsApi.updateFacebookPage(workspaceId, accountId, selectedPageId);
    },
    onSuccess: (_, variables) => {
      showSuccess('Facebook page switched successfully');
      setSelectedManagePagesAccount(null);
      void queryClient.invalidateQueries({ queryKey: ['connections-list'] });
      void queryClient.invalidateQueries({ queryKey: ['facebook-pages', variables.accountId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to switch Facebook page';
      showError(msg);
    }
  });

  // LinkedIn organizations query (only for LinkedIn accounts in manage pages drawer)
  const liAccountId = selectedManagePagesAccount?.platform?.toLowerCase() === 'linkedin'
    ? selectedManagePagesAccount.id
    : null;

  const { data: liOrgsData, isLoading: isLiOrgsLoading } = useQuery({
    queryKey: ['linkedin-organizations', liAccountId],
    queryFn: () => socialAccountsApi.getLinkedInOrganizations(
      selectedManagePagesAccount!.workspace.id,
      liAccountId!
    ),
    enabled: liAccountId !== null,
  });

  // Switch LinkedIn organization mutation
  const switchLiOrgMutation = useMutation({
    mutationFn: async ({ accountId, workspaceId, selectedOrgUrn }: { accountId: string; workspaceId: string; selectedOrgUrn: string }) => {
      await socialAccountsApi.updateLinkedInOrganization(workspaceId, accountId, selectedOrgUrn);
    },
    onSuccess: (_, variables) => {
      showSuccess('LinkedIn organization switched successfully');
      setSelectedManagePagesAccount(null);
      void queryClient.invalidateQueries({ queryKey: ['connections-list'] });
      void queryClient.invalidateQueries({ queryKey: ['linkedin-organizations', variables.accountId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to switch LinkedIn organization';
      showError(msg);
    }
  });

  const handleDisconnectInit = async (account: SocialAccountDto & { workspace: typeof workspaces[0] }) => {
    setDisconnectPreCheckLoad(account.id);
    setIsCheckingScheduledPosts(true);
    try {
      const result = await postsApi.getScheduledPostsCount(account.workspace.id, account.id);
      setScheduledPostsCount(result.count);
    } catch {
      setScheduledPostsCount(undefined);
    } finally {
      setIsCheckingScheduledPosts(false);
      setDisconnectPreCheckLoad(null);
      setAccountToDisconnect(account);
    }
  };

  // Handle platform connection
  const handleConnectPlatform = async (platformId: string, overrideProfileId?: string) => {
    setConnectionError(null);
    const config = ALL_PLATFORMS.find(p => p.id === platformId);
    if (!config?.isSupported) {
      setConnectionError(`${config?.label || platformId} integration is coming soon! Under development.`);
      return;
    }
    
    if (!activeWorkspace) {
      setConnectionError("Please select a workspace first.");
      return;
    }

    const profileId = overrideProfileId || selectedProfileForConnection;
    if (!profileId || profileId === 'all') {
      setConnectionError("Please select a profile first.");
      return;
    }

    setConnectingPlatform(platformId);
    try {
      const callbackUrl = `${window.location.origin}${import.meta.env.BASE_URL}social-accounts/select?syncraProfileId=${profileId}`;
      const response = await api.get<{ connectUrl: string }>(
        `social-accounts/connect-url/${platformId}`,
        {
          params: { redirectUrl: callbackUrl },
          headers: { 
            'X-Workspace-Id': activeWorkspace.id,
            'X-Profile-Id': profileId
          },
        }
      );
      setIsNewConnectionOpen(false);
      window.location.href = response.data.connectUrl;
    } catch (err: any) {
      setConnectingPlatform(null);
      const msg = err?.response?.data?.message || `Failed to connect ${platformId}`;
      setConnectionError(msg);
    }
  };

  // Filter connections
  const filteredConnections = connections.filter(conn => {
    const matchesProfile = selectedProfileFilter === 'all' || conn.zernioProfileId === selectedProfileFilter;
    const matchesPlatform = selectedPlatformFilter === 'all' || conn.platform.toLowerCase() === selectedPlatformFilter.toLowerCase();
    const matchesStatus = selectedStatusFilter === 'all' || (selectedStatusFilter === 'connected' ? conn.isActive : !conn.isActive);
    return matchesProfile && matchesPlatform && matchesStatus;
  });

  const hasValidSubscription = subscription?.status === 'Active' || subscription?.status === 'Trialing';
  const isSubscriptionKnown = subscription !== null;

  const renderedCards = ALL_PLATFORMS.flatMap((platform) => {
    if (selectedPlatformFilter !== 'all' && selectedPlatformFilter !== platform.id) return [];

    const platformConnections = filteredConnections.filter(c => c.platform.toLowerCase() === platform.id);

    if (platformConnections.length === 0) {
      if (selectedStatusFilter === 'connected') return [];
      if (selectedProfileFilter === 'all') return [];

      return [(
        <div key={`empty-${platform.id}`} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.cardAvatarWrap}>
                <div
                  className={styles.platformIconWrap}
                  style={{
                    backgroundColor: `${platform.color}15`,
                    color: platform.color,
                    borderColor: `${platform.color}30`
                  }}
                >
                  <PlatformIcon platform={platform.id} size={18} />
                </div>
              </div>
              <div>
                <h3 className={styles.cardPlatformName}>{platform.label}</h3>
                <div className={styles.statusBadge} style={{ backgroundColor: platform.isSupported ? '#f8f1fb' : '#fffbe8', color: platform.isSupported ? '#9a82a7' : '#b45309' }}>
                  <span className={styles.statusDot} style={{ backgroundColor: platform.isSupported ? '#9a82a7' : '#eab308' }} />
                  <span>{platform.isSupported ? 'Not connected' : 'Coming soon'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardBody} style={{ flex: 1 }}>
          </div>

          <div className={styles.cardActions} style={{ gridTemplateColumns: '1fr' }}>
            <button
              className={styles.disconnectBtn}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={connectingPlatform === platform.id}
              onClick={() => {
                if (selectedProfileFilter !== 'all') {
                  handleConnectPlatform(platform.id, selectedProfileFilter);
                } else {
                  setIsNewConnectionOpen(true);
                }
              }}
            >
              {connectingPlatform === platform.id ? (
                <span className={styles.btnLoadingWrap}>
                  <Loader2 size={13} className={styles.btnSpinner} />
                  <span>Connecting...</span>
                </span>
              ) : (
                <><Plus size={14} /> Connect</>
              )}
            </button>
          </div>
        </div>
      )];
    }

    return platformConnections.map((account) => {
      const displayDate = account.connectedAtUtc
        ? new Date(account.connectedAtUtc).toLocaleDateString()
        : 'Unknown';

      return (
        <div key={account.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.cardAvatarWrap}>
                {getSocialAvatarUrl(account) ? (
                  <>
                    <img
                      src={getSocialAvatarUrl(account)}
                      alt=""
                      className={styles.cardAvatar}
                      referrerPolicy="no-referrer"
                    />
                    <div
                      className={styles.cardPlatformBadge}
                      style={{ color: platform.color }}
                    >
                      <PlatformIcon platform={account.platform} size={17} />
                    </div>
                  </>
                ) : (
                  <div
                    className={styles.platformIconWrap}
                    style={{
                      backgroundColor: `${platform.color}15`,
                      color: platform.color,
                      borderColor: `${platform.color}30`
                    }}
                  >
                    {account.displayName?.charAt(0).toUpperCase() || <PlatformIcon platform={account.platform} size={18} />}
                  </div>
                )}
              </div>
              <div>
                <h3 className={styles.cardPlatformName}>{platform.label}</h3>
                <div className={styles.statusBadge}>
                  <span className={styles.statusDot} />
                  <span>connected</span>
                </div>
              </div>
            </div>
            <button
              className={styles.infoBtn}
              title="Connection details"
              onClick={() => setSelectedHealthAccount(account)}
            >
              <Info size={16} />
            </button>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.workspaceDisplay}>
              {account.displayName || account.externalAccountId}
            </div>
            <div className={styles.connectionMeta}>
              {account.displayName || account.externalAccountId} • {displayDate}
            </div>
            <div className={styles.handleBlock}>
              <span
                className={styles.handleDot}
                style={{ backgroundColor: profiles.find(p => p.id === account.zernioProfileId)?.color || '#c084fc' }}
              />
              <span className={styles.handleText}>
                {profiles.find(p => p.id === account.zernioProfileId)?.name || 'Default'}
              </span>
            </div>
          </div>

          <div className={styles.cardActions} style={SUB_ENTITY_PLATFORMS.includes(account.platform.toLowerCase()) ? {} : { gridTemplateColumns: '1fr' }}>
            {SUB_ENTITY_PLATFORMS.includes(account.platform.toLowerCase()) && (
              <button
                className={styles.managePagesBtn}
                onClick={() => setSelectedManagePagesAccount(account)}
              >
                {getManageButtonLabel(account.platform)}
              </button>
            )}
            <button
              className={styles.disconnectBtn}
              onClick={() => handleDisconnectInit(account)}
              disabled={disconnectMutation.isPending || disconnectPreCheckLoad === account.id}
            >
              {disconnectPreCheckLoad === account.id ? (
                <span className={styles.btnLoadingWrap}>
                  <Loader2 size={13} className={styles.btnSpinner} />
                  <span>Disconnecting...</span>
                </span>
              ) : (
                'Disconnect'
              )}
            </button>
          </div>
        </div>
      );
    });
  });

  const hasActiveFilters = selectedProfileFilter !== 'all' || selectedPlatformFilter !== 'all' || selectedStatusFilter !== 'all';

  const resetFilters = () => {
    setSelectedProfileFilter('all');
    setSelectedPlatformFilter('all');
    setSelectedStatusFilter('all');
  };

  const getProfileName = (id: string) => {
    if (id === 'all') return 'All profiles';
    return profiles.find(p => p.id === id)?.name || id;
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Connections</h1>
          <p className={styles.subtitle}>Manage profiles and platform integrations</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.newConnBtn}
            onClick={() => {
              if (isSubscriptionKnown && !hasValidSubscription) {
                setIsUpgradeModalOpen(true);
              } else {
                setIsNewConnectionOpen(true);
              }
            }}
          >
            <Plus size={16} />
            <span>New Connection</span>
          </button>
          <button
            className={styles.newProfileBtn}
            onClick={() => setIsNewProfileOpen(true)}
          >
            New Profile
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={styles.filterBar} ref={dropdownRef}>
        <div className={styles.filterLeft}>
          <span className={styles.filterLabel}>Platforms</span>

          {/* Profile Filter Dropdown */}
          <div className={styles.dropdownContainer}>
            <button
              className={styles.dropdownTrigger}
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <span className={styles.workspaceOptRow}>
                {selectedProfileFilter !== 'all' ? (
                  <span className={styles.workspaceDot} style={{ backgroundColor: profiles.find(p => p.id === selectedProfileFilter)?.color || '#c084fc' }} />
                ) : null}
                <span>{getProfileName(selectedProfileFilter)}</span>
              </span>
              <ChevronDown size={14} />
            </button>
            {isProfileDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedProfileFilter === 'all' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedProfileFilter('all');
                    setIsProfileDropdownOpen(false);
                  }}
                >
                  <span>All profiles</span>
                  {selectedProfileFilter === 'all' && <Check size={14} />}
                </button>
                <div className={styles.dropdownDivider} />
                {profiles.map(profile => (
                  <div key={profile.id} className={styles.workspaceItem}>
                    <button
                      className={`${styles.workspaceItemBtn} ${selectedProfileFilter === profile.id ? styles.activeItem : ''}`}
                      onClick={() => {
                        setSelectedProfileFilter(profile.id);
                        setIsProfileDropdownOpen(false);
                      }}
                    >
                      <div className={styles.workspaceOptRow}>
                        <span className={styles.workspaceDot} style={{ backgroundColor: profile.color || '#818cf8' }} />
                        <span className={styles.workspaceOptName}>{profile.name}</span>
                      </div>
                      {selectedProfileFilter === profile.id && <Check size={14} className={styles.workspaceActionCheck} />}
                    </button>
                    <div className={styles.workspaceItemActions}>
                      <button
                        className={styles.workspaceActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsProfileDropdownOpen(false);
                          setEditingProfile(profile);
                          setEditProfileName(profile.name);
                          setEditProfileColor(profile.color || '#fda4af');
                        }}
                        title="Edit profile"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className={`${styles.workspaceActionBtn} ${styles.workspaceActionBtnDanger}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsProfileDropdownOpen(false);
                          setProfileToDelete(profile);
                        }}
                        title="Delete profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className={styles.dropdownAddBtn}
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setIsNewProfileOpen(true);
                  }}
                >
                  <Plus size={14} />
                  <span>Create new profile...</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.filterRight}>
          {/* Platform Filter Dropdown */}
          <div className={styles.dropdownContainer}>
            <button
              className={styles.dropdownTriggerSecondary}
              onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
            >
              <span>{selectedPlatformFilter === 'all' ? 'All platforms' : ALL_PLATFORMS.find(p => p.id === selectedPlatformFilter)?.label}</span>
              <ChevronDown size={14} />
            </button>
            {isPlatformDropdownOpen && (
              <div className={`${styles.dropdownMenu} ${styles.platformDropdownScroll}`}>
                <button
                  className={`${styles.dropdownItem} ${selectedPlatformFilter === 'all' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedPlatformFilter('all');
                    setIsPlatformDropdownOpen(false);
                  }}
                >
                  <span>All platforms</span>
                  {selectedPlatformFilter === 'all' && <Check size={14} />}
                </button>
                {ALL_PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    className={`${styles.dropdownItem} ${selectedPlatformFilter === p.id ? styles.activeItem : ''}`}
                    onClick={() => {
                      setSelectedPlatformFilter(p.id);
                      setIsPlatformDropdownOpen(false);
                    }}
                  >
                    <div className={styles.platformItemRow}>
                      <span className={styles.platformIconSpan} style={{ color: p.color }}>
                        <PlatformIcon platform={p.id} size={14} />
                      </span>
                      <span>{p.label}</span>
                    </div>
                    {selectedPlatformFilter === p.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className={styles.dropdownContainer}>
            <button
              className={styles.dropdownTriggerSecondary}
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            >
              <span>{selectedStatusFilter === 'all' ? 'All statuses' : selectedStatusFilter === 'connected' ? 'Connected' : 'Disconnected'}</span>
              <ChevronDown size={14} />
            </button>
            {isStatusDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${selectedStatusFilter === 'all' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter('all');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <span>All statuses</span>
                  {selectedStatusFilter === 'all' && <Check size={14} />}
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatusFilter === 'connected' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter('connected');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <span>Connected</span>
                  {selectedStatusFilter === 'connected' && <Check size={14} />}
                </button>
                <button
                  className={`${styles.dropdownItem} ${selectedStatusFilter === 'disconnected' ? styles.activeItem : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter('disconnected');
                    setIsStatusDropdownOpen(false);
                  }}
                >
                  <span>Disconnected</span>
                  {selectedStatusFilter === 'disconnected' && <Check size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button className={styles.resetBtn} onClick={resetFilters}>
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Cards Grid */}
      {isSubscriptionKnown && !hasValidSubscription ? (
        <div className={styles.emptyState}>
          <Lock size={48} className={styles.emptyIcon} />
          <h2>Social Account Connections</h2>
          <p>Connect TikTok, Instagram, Facebook and more.</p>
          <p style={{ margin: '4px 0 24px', color: '#9a82a7', fontSize: '13px' }}>
            Available on Pro and Business plans.
          </p>
          <button
            className={styles.newConnBtn}
            onClick={() => navigate('/app/billing')}
          >
            Upgrade Plan
          </button>
        </div>
      ) : isConnectionsLoading || isWorkspaceLoading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={32} />
          <p>Loading connections...</p>
        </div>
      ) : renderedCards.length === 0 ? (
        <div className={styles.emptyState}>
          <HelpCircle size={48} className={styles.emptyIcon} />
          <h2>No connections match your filters</h2>
          <p>Try adjusting your filters to see more results.</p>
          <button
            className={styles.newConnBtn}
            style={{ marginTop: '16px' }}
            onClick={resetFilters}
          >
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {renderedCards}
        </div>
      )}

      {/* DRAWER 1: Create New Profile Drawer */}
      {isNewProfileOpen && (
        <div className={styles.drawerBackdrop} onClick={() => closeProfileDrawer()}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>Create new profile</h2>
                <p className={styles.drawerSubtitle}>Add a new profile to manage your social accounts.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => closeProfileDrawer()}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className={styles.drawerForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Profile Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Personal, Business, Agency"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Color</label>
                <div className={styles.colorPickerContainer}>
                  <div className={styles.colorBox} style={{ backgroundColor: newProfileColor }} />
                  <div className={styles.colorPalette}>
                    {['#fda4af', '#f0abfc', '#c084fc', '#818cf8', '#93c5fd', '#86efac', '#fde047', '#fdba74'].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorPaletteBtn} ${newProfileColor === color ? styles.colorPaletteBtnActive : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewProfileColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button
                  type="submit"
                  className={styles.drawerSubmitBtn}
                  disabled={createProfileMutation.isPending}
                >
                  {createProfileMutation.isPending ? 'Creating...' : 'Create Profile'}
                </button>
                <button
                  type="button"
                  className={styles.drawerCancelBtn}
                  onClick={() => closeProfileDrawer()}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER 2: New Connection Drawer */}
      {isNewConnectionOpen && (
        <div className={styles.drawerBackdrop} onClick={() => setIsNewConnectionOpen(false)}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>New Connection</h2>
                <p className={styles.drawerSubtitle}>Choose a workspace and platform to connect.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setIsNewConnectionOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {connectionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Connection Error</AlertTitle>
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}
              {/* Profile Selection */}
              <div className={styles.formGroup} style={{ position: 'relative' }}>
                <label className={styles.formLabel}>Profile</label>
                <button
                  className={styles.drawerDropdownTrigger}
                  onClick={() => setIsProfileConnWorkspaceDropdownOpen(!isProfileConnDropdownOpen)}
                >
                  <span className={styles.workspaceOptRow}>
                    {selectedProfileForConnection ? (
                      <span className={styles.workspaceDot} style={{ backgroundColor: profiles.find(p => p.id === selectedProfileForConnection)?.color || '#c084fc' }} />
                    ) : null}
                    <span>
                      {selectedProfileForConnection
                        ? profiles.find(p => p.id === selectedProfileForConnection)?.name
                        : 'Select a profile'}
                    </span>
                  </span>
                  <ChevronDown size={14} />
                </button>

                {isProfileConnDropdownOpen && (
                  <div className={styles.drawerDropdownMenu}>
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        className={`${styles.dropdownItem} ${selectedProfileForConnection === p.id ? styles.activeItem : ''}`}
                        onClick={() => {
                          setSelectedProfileForConnection(p.id);
                          setIsProfileConnWorkspaceDropdownOpen(false);
                        }}
                      >
                        <div className={styles.workspaceOptRow}>
                          <span className={styles.workspaceDot} style={{ backgroundColor: p.color || '#c084fc' }} />
                          <span>{p.name}</span>
                        </div>
                        {selectedProfileForConnection === p.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Platforms List Section */}
              <div className={styles.platformsSection}>
                <div className={styles.platformsListContainer}>
                  {!selectedProfileForConnection && (
                    <div className={styles.platformsListBlurOverlay}>
                      <div className={styles.blurCard}>
                        <h4 className={styles.blurCardTitle}>Select a profile first</h4>
                        <p className={styles.blurCardText}>Pick a profile above to choose what to connect.</p>
                      </div>
                    </div>
                  )}

                  <div className={`${styles.platformsList} ${!selectedProfileForConnection ? styles.platformsListBlur : ''}`}>
                    {PLATFORM_GROUPS.map(group => {
                      const sortedIds = [...group.platformIds].sort((a, b) => {
                        const aConnected = selectedProfileForConnection && connections.some(
                          conn => conn.zernioProfileId === selectedProfileForConnection && conn.platform.toLowerCase() === a
                        );
                        const bConnected = selectedProfileForConnection && connections.some(
                          conn => conn.zernioProfileId === selectedProfileForConnection && conn.platform.toLowerCase() === b
                        );
                        if (aConnected && !bConnected) return 1;
                        if (!aConnected && bConnected) return -1;
                        return 0;
                      });

                      return (
                      <div key={group.title} className={styles.platformGroup}>
                        <div className={styles.platformGroupTitle}>{group.title.toUpperCase()}</div>
                        <div className={styles.platformGroupItems}>
                          {sortedIds.map((platformId) => {
                            const platform = platformsById[platformId];
                            if (!platform) return null;
                            const isDisabled = !selectedProfileForConnection || !platform.isSupported;
                            
                            const isConnected = selectedProfileForConnection && connections.some(
                              conn => conn.zernioProfileId === selectedProfileForConnection && conn.platform.toLowerCase() === platform.id
                            );

                            if (isConnected) {
                              const isExpanded = expandedPlatformId === platform.id;
                              const currentProfileName = profiles.find(p => p.id === selectedProfileForConnection)?.name || '';
                              
                              return (
                                <div key={platform.id} className={`${styles.platformListItemContainer} ${isExpanded ? styles.expanded : ''}`}>
                                  <button
                                    type="button"
                                    className={styles.platformListItemHeader}
                                    onClick={() => setExpandedPlatformId(isExpanded ? null : platform.id)}
                                  >
                                    <div className={styles.platformListLeft}>
                                      <div
                                        className={styles.platformListIconConnected}
                                      >
                                        <PlatformIcon platform={platform.id} size={18} />
                                      </div>
                                      <span className={styles.platformListLabelConnected}>{platform.label}</span>
                                    </div>
                                    <div className={styles.platformListRightConnected}>
                                      <span className={styles.connectedText}>Connected</span>
                                      {isExpanded ? <ChevronUp size={16} className={styles.platformListChevron} /> : <ChevronDown size={16} className={styles.platformListChevron} />}
                                    </div>
                                  </button>
                                  
                                  {isExpanded && (
                                    <div className={styles.platformListItemContent}>
                                      <p className={styles.connectedExplanation}>
                                        {platform.label} is connected to <strong>{currentProfileName}</strong>. Each profile holds one {platform.label} account.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <button
                                key={platform.id}
                                type="button"
                                className={styles.platformListItem}
                                onClick={() => handleConnectPlatform(platform.id, selectedProfileForConnection)}
                                disabled={isDisabled || connectingPlatform === platform.id}
                              >
                                <div className={styles.platformListLeft}>
                                  <div
                                    className={styles.platformListIcon}
                                    style={{ color: platform.color, backgroundColor: `${platform.color}12` }}
                                  >
                                    <PlatformIcon platform={platform.id} size={18} />
                                  </div>
                                  <span className={styles.platformListLabel}>{platform.label}</span>
                                </div>
                                <div className={styles.platformListRight}>
                                  {connectingPlatform === platform.id ? (
                                    <Loader2 size={14} className={styles.btnSpinner} />
                                  ) : !platform.isSupported ? (
                                    <span className={styles.platformListSoon}>Coming soon</span>
                                  ) : (
                                    <>
                                      <span className={styles.platformListAction}>
                                        <Link2 size={14} />
                                      </span>
                                      <ChevronRight size={16} className={styles.platformListChevron} />
                                    </>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 1.75: Edit Profile Drawer */}
      {editingProfile && (
        <div className={styles.drawerBackdrop} onClick={() => closeEditProfileDrawer()}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>Edit profile</h2>
                <p className={styles.drawerSubtitle}>Update the name or color of your profile.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => closeEditProfileDrawer()}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className={styles.drawerForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Profile Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Personal, Business, Agency"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  maxLength={50}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Color</label>
                <div className={styles.colorPickerContainer}>
                  <div className={styles.colorBox} style={{ backgroundColor: editProfileColor || '#fda4af' }} />
                  <div className={styles.colorPalette}>
                    {['#fda4af', '#f0abfc', '#c084fc', '#818cf8', '#93c5fd', '#86efac', '#fde047', '#fdba74'].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorPaletteBtn} ${editProfileColor === color ? styles.colorPaletteBtnActive : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditProfileColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button
                  type="submit"
                  className={styles.drawerSubmitBtn}
                  disabled={editProfileMutation.isPending}
                >
                  {editProfileMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className={styles.drawerCancelBtn}
                  onClick={() => closeEditProfileDrawer()}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Profile Confirm Modal */}
      {profileToDelete && (
        <div className={styles.modalBackdrop} onClick={() => closeDeleteProfileModal()}>
          <div className={styles.disconnectModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.disconnectModalContent}>
              <div className={styles.disconnectModalHeader}>
                <div className={styles.disconnectHeaderLeft}>
                  <Trash2 size={20} className={styles.disconnectIcon} />
                  <h2 className={styles.disconnectModalTitle}>Delete profile</h2>
                </div>
                <button className={styles.modalCloseBtn} onClick={() => closeDeleteProfileModal()} disabled={deleteProfileMutation.isPending}>
                  <X size={16} />
                </button>
              </div>
              <div className={styles.disconnectModalBody}>
                <p className={styles.disconnectText}>
                  Are you sure you want to delete{' '}
                  <strong>{profileToDelete.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className={styles.disconnectModalFooter}>
                <button className={styles.disconnectCancelBtn} onClick={() => closeDeleteProfileModal()} disabled={deleteProfileMutation.isPending}>
                  Cancel
                </button>
                <button className={styles.disconnectConfirmBtn} onClick={() => deleteProfileMutation.mutate(profileToDelete.id)} disabled={deleteProfileMutation.isPending}>
                  {deleteProfileMutation.isPending ? (
                    <span className={styles.btnLoadingWrap}>
                      <Loader2 size={13} className={styles.btnSpinner} />
                      <span>Deleting...</span>
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Health Modal */}
      {selectedHealthAccount && <HealthModal
        account={selectedHealthAccount}
        workspaceId={activeWorkspace?.id ?? ''}
        onClose={() => setSelectedHealthAccount(null)}
      />}

      {/* Manage Pages Drawer */}
      {selectedManagePagesAccount && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedManagePagesAccount(null)}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>
                  Switch {selectedManagePagesAccount.platform.charAt(0).toUpperCase() + selectedManagePagesAccount.platform.slice(1)} {getSubEntityName(selectedManagePagesAccount.platform)}
                </h2>
                <p className={styles.drawerSubtitle}>Pick a different {getSubEntityName(selectedManagePagesAccount.platform)} to publish from.</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setSelectedManagePagesAccount(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.pagesList}>
                {selectedManagePagesAccount.platform.toLowerCase() === 'facebook' ? (
                  isFbPagesLoading ? (
                    <div className={styles.pagesLoading}>
                      <Loader2 size={20} className={styles.spinner} />
                      <span>Loading pages...</span>
                    </div>
                  ) : fbPagesData?.pages && fbPagesData.pages.length > 0 ? (
                    fbPagesData.pages.map((page) => {
                      const isCurrent = page.id === fbPagesData.selectedPageId;
                      return (
                        <button
                          key={page.id}
                          type="button"
                          className={styles.pageSelectorBtn}
                          disabled={isCurrent || switchFbPageMutation.isPending}
                          onClick={() => {
                            switchFbPageMutation.mutate({
                              accountId: selectedManagePagesAccount.id,
                              workspaceId: selectedManagePagesAccount.workspace.id,
                              selectedPageId: page.id,
                            });
                          }}
                        >
                          {switchFbPageMutation.isPending && switchFbPageMutation.variables?.selectedPageId === page.id ? (
                            <div className={styles.pageLoadingWrap}>
                              <Loader2 size={18} className={styles.btnSpinner} />
                              <span>Switching...</span>
                            </div>
                          ) : (
                            <>
                              <div className={styles.pageAvatarWrap}>
                                {getFbPageAvatarUrl(selectedManagePagesAccount, page.id) ? (
                              <img
                                src={getFbPageAvatarUrl(selectedManagePagesAccount, page.id)}
                                alt={page.name}
                                className={styles.pageAvatar}
                              />
                                ) : (
                                  <div
                                    className={styles.pagePlatformFallback}
                                    style={{
                                      color: ALL_PLATFORMS.find(p => p.id === 'facebook')?.color || '#1877f2'
                                    }}
                                  >
                                    <PlatformIcon platform="facebook" size={18} />
                                  </div>
                                )}
                              </div>
                              <div className={styles.pageInfo}>
                                <div className={styles.pageNameRow}>
                                  <span className={styles.pageName}>{page.name}</span>
                                  {isCurrent && <span className={styles.currentBadge}>Current</span>}
                                </div>
                                <p className={styles.pageCategory}>{page.category || 'Facebook Page'}</p>
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className={styles.pagesEmpty}>No pages found for this account.</p>
                  )
                ) : selectedManagePagesAccount.platform.toLowerCase() === 'linkedin' ? (
                  isLiOrgsLoading ? (
                    <div className={styles.pagesLoading}>
                      <Loader2 size={20} className={styles.spinner} />
                      <span>Loading organizations...</span>
                    </div>
                  ) : liOrgsData?.organizations && liOrgsData.organizations.length > 0 ? (
                    liOrgsData.organizations.map((org) => {
                      const isCurrent = org.urn === liOrgsData.selectedOrganizationUrn;
                      return (
                        <button
                          key={org.urn}
                          type="button"
                          className={styles.pageSelectorBtn}
                          disabled={isCurrent || switchLiOrgMutation.isPending}
                          onClick={() => {
                            switchLiOrgMutation.mutate({
                              accountId: selectedManagePagesAccount.id,
                              workspaceId: selectedManagePagesAccount.workspace.id,
                              selectedOrgUrn: org.urn,
                            });
                          }}
                        >
                          {switchLiOrgMutation.isPending && switchLiOrgMutation.variables?.selectedOrgUrn === org.urn ? (
                            <div className={styles.pageLoadingWrap}>
                              <Loader2 size={18} className={styles.btnSpinner} />
                              <span>Switching...</span>
                            </div>
                          ) : (
                            <>
                              <div className={styles.pageAvatarWrap}>
                                {org.logoUrl ? (
                                  <img
                                    src={org.logoUrl}
                                    alt={org.name}
                                    className={styles.pageAvatar}
                                  />
                                ) : (
                                  <div
                                    className={styles.pagePlatformFallback}
                                    style={{
                                      color: ALL_PLATFORMS.find(p => p.id === 'linkedin')?.color || '#0a66c2'
                                    }}
                                  >
                                    <PlatformIcon platform="linkedin" size={18} />
                                  </div>
                                )}
                              </div>
                              <div className={styles.pageInfo}>
                                <div className={styles.pageNameRow}>
                                  <span className={styles.pageName}>{org.name}</span>
                                  {isCurrent && <span className={styles.currentBadge}>Current</span>}
                                </div>
                                <p className={styles.pageCategory}>LinkedIn Organization</p>
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className={styles.pagesEmpty}>No organizations found for this account.</p>
                  )
                ) : (
                  <p className={styles.pagesEmpty}>
                    Selecting options for {selectedManagePagesAccount.platform} is done during the connection setup. To change it, please reconnect the account.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirm Modal */}
      {accountToDisconnect && (
        <DisconnectConfirmModal
          account={accountToDisconnect}
          onClose={() => setAccountToDisconnect(null)}
          onConfirm={() => {
            disconnectMutation.mutate({
              accountId: accountToDisconnect.id,
              workspaceId: accountToDisconnect.workspace.id,
            });
          }}
          isPending={disconnectMutation.isPending}
          scheduledPostsCount={scheduledPostsCount}
          isCheckingScheduledPosts={isCheckingScheduledPosts}
        />
      )}

      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

    </div>
  );
}
