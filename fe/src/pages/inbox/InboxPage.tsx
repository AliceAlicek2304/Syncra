import { useState } from 'react';
import { MessageSquare, MessageCircle, Star, Loader2, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useInboxBackfill } from '../../hooks/useInboxBackfill';
import DmTab from './DmTab';
import CommentsTab from './CommentsTab';
import ReviewsTab from './ReviewsTab';
import styles from './InboxPage.module.css';

type InboxTab = 'dm' | 'comments' | 'reviews';

const TABS: { key: InboxTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dm', label: 'Messages', icon: <MessageSquare size={16} /> },
  { key: 'comments', label: 'Comments', icon: <MessageCircle size={16} /> },
  { key: 'reviews', label: 'Reviews', icon: <Star size={16} /> },
];

export default function InboxPage() {
  const { workspaceId } = useWorkspace();
  const [activeTab, setActiveTab] = useState<InboxTab>('dm');
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const [accountFilter, setAccountFilter] = useState<string | undefined>();

  const {
    isSyncing,
    lastSyncedAtUtc,
    isLoading: syncLoading,
    triggerSync,
  } = useInboxBackfill({ workspaceId });

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
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {/* Filter dropdown placeholder (future: multi-select platform/account) */}
        <div className={styles.filterArea} />
      </div>

      {/* ── Tab panels ────────────────────────────────────────────── */}
      <div className={styles.panel}>
        {activeTab === 'dm' && (
          <DmTab
            workspaceId={workspaceId}
            platform={platformFilter}
            accountId={accountFilter}
          />
        )}
        {activeTab === 'comments' && (
          <CommentsTab
            workspaceId={workspaceId}
            platform={platformFilter}
            accountId={accountFilter}
          />
        )}
        {activeTab === 'reviews' && (
          <ReviewsTab
            workspaceId={workspaceId}
            platform={platformFilter}
            accountId={accountFilter}
          />
        )}
      </div>
    </div>
  );
}
