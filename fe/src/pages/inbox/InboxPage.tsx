import { useState, useMemo } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Star,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Inbox,
  User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useInboxBackfill } from '../../hooks/useInboxBackfill';
import { socialAccountsApi } from '../../api/socialAccounts';
import DmTab from './DmTab';
import CommentsTab from './CommentsTab';
import ReviewsTab from './ReviewsTab';
import styles from './InboxPage.module.css';

type InboxTab = 'dm' | 'comments' | 'reviews';
type StatusFilter = 'all' | 'unread';

const TABS: { key: InboxTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dm', label: 'Messages', icon: <MessageSquare size={16} /> },
  { key: 'comments', label: 'Comments', icon: <MessageCircle size={16} /> },
  { key: 'reviews', label: 'Reviews', icon: <Star size={16} /> },
];

const PLATFORMS_BY_TAB: Record<InboxTab, string[]> = {
  dm: ['facebook', 'instagram', 'twitter', 'bluesky', 'reddit', 'telegram', 'whatsapp'],
  comments: ['facebook', 'instagram', 'twitter', 'bluesky', 'threads', 'reddit', 'youtube', 'linkedin'],
  reviews: ['facebook', 'google'],
};

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', bgClass: styles.bgFacebook },
  { key: 'instagram', label: 'Instagram', bgClass: styles.bgInstagram },
  { key: 'twitter', label: 'Twitter/X', bgClass: styles.bgTwitter },
  { key: 'bluesky', label: 'Bluesky', bgClass: styles.bgBluesky },
  { key: 'reddit', label: 'Reddit', bgClass: styles.bgReddit },
  { key: 'telegram', label: 'Telegram', bgClass: styles.bgTelegram },
  { key: 'whatsapp', label: 'WhatsApp', bgClass: styles.bgWhatsapp },
  { key: 'youtube', label: 'YouTube', bgClass: styles.bgYoutube },
  { key: 'linkedin', label: 'LinkedIn', bgClass: styles.bgLinkedin },
  { key: 'threads', label: 'Threads', bgClass: styles.bgThreads },
  { key: 'google', label: 'Google Business', bgClass: styles.bgGoogle },
];

export default function InboxPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const [activeTab, setActiveTab] = useState<InboxTab>('dm');
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const [accountFilter, setAccountFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch social accounts for filters
  const { data: socialAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['social-accounts', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => {
      if (!workspaceId) return [];
      return socialAccountsApi.listSocialAccounts(workspaceId);
    },
  });

  const {
    isSyncing,
    lastSyncedAtUtc,
    isLoading: syncLoading,
    triggerSync,
  } = useInboxBackfill({ workspaceId });

  // Reset sub-filters on tab change
  const handleTabChange = (tab: InboxTab) => {
    setActiveTab(tab);
    setPlatformFilter(undefined);
    setAccountFilter(undefined);
    setSearchQuery('');
  };

  // Filter platforms to show based on active tab
  const supportedPlatforms = useMemo(() => {
    const keys = PLATFORMS_BY_TAB[activeTab];
    return PLATFORMS.filter((p) => keys.includes(p.key));
  }, [activeTab]);

  // Filter social accounts based on active tab & selected platform
  const filteredAccounts = useMemo(() => {
    const supportedKeys = PLATFORMS_BY_TAB[activeTab];
    return socialAccounts.filter((acc) => {
      const matchTab = supportedKeys.includes(acc.platform);
      const matchPlatform = !platformFilter || acc.platform === platformFilter;
      return matchTab && matchPlatform;
    });
  }, [socialAccounts, activeTab, platformFilter]);

  const formatLastSync = (utc: string | null): string | null => {
    if (!utc) return null;
    const d = new Date(utc);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.page}>
      {/* ── Sync banner ───────────────────────────────────────────── */}
      {syncLoading ? (
        <div className={styles.syncBanner}>
          <Loader2 size={14} className={styles.spinner} />
          <span>Checking inbox status...</span>
        </div>
      ) : isSyncing ? (
        <div className={`${styles.syncBanner} ${styles.syncingBanner}`}>
          <Loader2 size={14} className={styles.spinner} />
          <span>Syncing your inbox from connected platforms…</span>
        </div>
      ) : lastSyncedAtUtc ? (
        <div className={styles.syncBanner}>
          <span>Last synced: {formatLastSync(lastSyncedAtUtc)}</span>
          <button className={styles.syncBtn} onClick={triggerSync} title="Sync now">
            <RefreshCw size={13} />
          </button>
        </div>
      ) : (
        <div className={styles.syncBanner}>
          <span>Inbox not yet populated. Trigger a sync to get started.</span>
          <button className={styles.syncBtn} onClick={triggerSync} title="Sync now">
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className={styles.tabBar} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className={styles.filterArea} />
      </div>

      {/* ── Master-detail layout ──────────────────────────────────── */}
      <div className={styles.masterDetail}>
        {/* 1. Sidebar Filters (Cột trái ngoài cùng) */}
        <div className={styles.filtersPanel}>
          {/* Search filter */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Search</span>
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search inbox..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Status</span>
            <div className={styles.statusFilter}>
              <button
                className={`${styles.statusBtn} ${statusFilter === 'all' ? styles.statusBtnActive : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={14} /> All Messages
                </span>
              </button>
              <button
                className={`${styles.statusBtn} ${statusFilter === 'unread' ? styles.statusBtnActive : ''}`}
                onClick={() => setStatusFilter('unread')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={14} /> Unread Only
                </span>
              </button>
            </div>
          </div>

          {/* Platform grid */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Platforms</span>
            <div className={styles.platformGrid}>
              <button
                className={`${styles.platformBtn} ${!platformFilter ? styles.platformBtnActive : ''}`}
                onClick={() => {
                  setPlatformFilter(undefined);
                  setAccountFilter(undefined);
                }}
                title="All Platforms"
              >
                All
              </button>
              {supportedPlatforms.map((plat) => (
                <button
                  key={plat.key}
                  className={`${styles.platformBtn} ${platformFilter === plat.key ? styles.platformBtnActive : ''}`}
                  onClick={() => {
                    setPlatformFilter(plat.key);
                    setAccountFilter(undefined);
                  }}
                  title={plat.label}
                >
                  <span className={`${styles.platformBadge} ${plat.bgClass}`} style={{ position: 'relative', border: 'none', bottom: 0, right: 0, width: 16, height: 16, fontSize: 8 }}>
                    {plat.label[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Social account list */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Accounts</span>
            {accountsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
                <Loader2 size={12} className={styles.spinner} /> Loading accounts...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                No active accounts
              </div>
            ) : (
              <div className={styles.accountList}>
                <button
                  className={`${styles.accountItem} ${!accountFilter ? styles.accountItemActive : ''}`}
                  onClick={() => setAccountFilter(undefined)}
                >
                  All Accounts
                </button>
                {filteredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    className={`${styles.accountItem} ${accountFilter === acc.id ? styles.accountItemActive : ''}`}
                    onClick={() => setAccountFilter(acc.id)}
                  >
                    {acc.avatarUrl ? (
                      <img src={acc.avatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <User size={12} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {acc.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2 & 3. Master List & Detail View panels */}
        <div className={styles.panel}>
          {activeTab === 'dm' && (
            <DmTab
              workspaceId={workspaceId}
              platform={platformFilter}
              accountId={accountFilter}
              search={searchQuery}
              unreadOnly={statusFilter === 'unread'}
            />
          )}
          {activeTab === 'comments' && (
            <CommentsTab
              workspaceId={workspaceId}
              platform={platformFilter}
              accountId={accountFilter}
              search={searchQuery}
              unreadOnly={statusFilter === 'unread'}
            />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              workspaceId={workspaceId}
              platform={platformFilter}
              accountId={accountFilter}
              search={searchQuery}
              unreadOnly={statusFilter === 'unread'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
