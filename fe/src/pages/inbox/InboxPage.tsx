import { useState, useMemo } from 'react';
import { MessageSquare, MessageCircle, Star, Loader2, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useInboxBackfill } from '../../hooks/useInboxBackfill';
import { socialAccountsApi } from '../../api/socialAccounts';
import InboxSidebar from './components/InboxSidebar';
import DmTab from './DmTab';
import CommentsTab from './CommentsTab';
import ReviewsTab from './ReviewsTab';
import styles from './InboxPage.module.css';
import type { InboxFilters } from './types';

type InboxTab = 'dm' | 'comments' | 'reviews';

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
  
  const [filters, setFilters] = useState<InboxFilters>({
    platform: null,
    status: 'all',
    search: '',
    accountId: null,
    assigneeId: null,
  });

  const { data: socialAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['social-accounts-list', workspaceId],
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

  const handleTabChange = (tab: InboxTab) => {
    setActiveTab(tab);
    setFilters({ platform: null, status: 'all', search: '', accountId: null, assigneeId: null });
  };

  const supportedPlatforms = useMemo(() => {
    const keys = PLATFORMS_BY_TAB[activeTab];
    return PLATFORMS.filter((p) => keys.includes(p.key));
  }, [activeTab]);

  const filteredAccounts = useMemo(() => {
    const supportedKeys = PLATFORMS_BY_TAB[activeTab];
    const accountsArray = Array.isArray(socialAccounts)
      ? socialAccounts
      : (socialAccounts as any)?.items || [];
    return accountsArray.filter((acc: any) => {
      const matchTab = supportedKeys.includes(acc.platform);
      const matchPlatform = !filters.platform || acc.platform === filters.platform;
      return matchTab && matchPlatform;
    });
  }, [socialAccounts, activeTab, filters.platform]);

  const formatLastSync = (utc: string | null): string | null => {
    if (!utc) return null;
    return new Date(utc).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className={styles.page}>
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
          <button className={styles.syncBtn} onClick={triggerSync} title="Sync now"><RefreshCw size={13} /></button>
        </div>
      ) : (
        <div className={styles.syncBanner}>
          <span>Inbox not yet populated. Trigger a sync to get started.</span>
          <button className={styles.syncBtn} onClick={triggerSync} title="Sync now"><RefreshCw size={13} /></button>
        </div>
      )}

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

      <div className={styles.masterDetail}>
        <InboxSidebar 
          filters={filters}
          onChange={setFilters}
          accounts={filteredAccounts}
          accountsLoading={accountsLoading}
          supportedPlatforms={supportedPlatforms}
        />

        <div className={styles.panel} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {activeTab === 'dm' && (
            <DmTab workspaceId={workspaceId} filters={filters} />
          )}
          {activeTab === 'comments' && (
            <CommentsTab
              workspaceId={workspaceId}
              platform={filters.platform || undefined}
              accountId={filters.accountId || undefined}
              search={filters.search}
              unreadOnly={filters.status === 'unread'}
            />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              workspaceId={workspaceId}
              platform={filters.platform || undefined}
              accountId={filters.accountId || undefined}
              search={filters.search}
              unreadOnly={filters.status === 'unread'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
