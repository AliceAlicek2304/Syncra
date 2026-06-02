
import { Search, Inbox, Filter, User, Loader2 } from 'lucide-react';
import { getSocialAvatarUrl } from '../../../utils/social';
import { ExtendedPlatformIcon } from '../../../components/create-post/platformIcons';
import { mapPlatformToIconKey } from '../utils';
import styles from '../InboxPage.module.css';
import type { InboxFilters } from '../types';

interface PlatformDef {
  key: string;
  label: string;
}

export interface InboxSidebarProps {
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
  accounts: any[];
  accountsLoading: boolean;
  supportedPlatforms: PlatformDef[];
}

export default function InboxSidebar({
  filters,
  onChange,
  accounts,
  accountsLoading,
  supportedPlatforms,
}: InboxSidebarProps) {
  
  const handlePlatformChange = (platform: string | null) => {
    onChange({ ...filters, platform, accountId: null });
  };

  const handleAccountChange = (accountId: string | null) => {
    onChange({ ...filters, accountId });
  };

  const handleStatusChange = (status: InboxFilters['status']) => {
    onChange({ ...filters, status });
  };


  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search });
  };

  return (
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
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Status filter */}
      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>Status</span>
        <div className={styles.statusFilter}>
          <button
            className={`${styles.statusBtn} ${filters.status === 'all' || filters.status === null ? styles.statusBtnActive : ''}`}
            onClick={() => handleStatusChange('all')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={14} /> All Messages
            </span>
          </button>
          <button
            className={`${styles.statusBtn} ${filters.status === 'unread' ? styles.statusBtnActive : ''}`}
            onClick={() => handleStatusChange('unread')}
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
            className={`${styles.platformBtn} ${!filters.platform ? styles.platformBtnActive : ''}`}
            onClick={() => handlePlatformChange(null)}
            title="All Platforms"
          >
            All
          </button>
          {supportedPlatforms.map((plat) => (
            <button
              key={plat.key}
              className={`${styles.platformBtn} ${filters.platform === plat.key ? styles.platformBtnActive : ''}`}
              onClick={() => handlePlatformChange(plat.key)}
              title={plat.label}
            >
              <ExtendedPlatformIcon platform={mapPlatformToIconKey(plat.key)} size={20} />
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
        ) : accounts.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            No active accounts
          </div>
        ) : (
          <div className={styles.accountList}>
            <button
              className={`${styles.accountItem} ${!filters.accountId ? styles.accountItemActive : ''}`}
              onClick={() => handleAccountChange(null)}
            >
              All Accounts
            </button>
            {accounts.map((acc: any) => (
              <button
                key={acc.id}
                className={`${styles.accountItem} ${filters.accountId === acc.id ? styles.accountItemActive : ''}`}
                onClick={() => handleAccountChange(acc.id)}
              >
                {getSocialAvatarUrl(acc) ? (
                  <img src={getSocialAvatarUrl(acc)} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
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
  );
}
