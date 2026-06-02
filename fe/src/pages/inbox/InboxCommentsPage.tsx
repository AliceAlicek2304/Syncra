import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { socialAccountsApi } from '../../api/socialAccounts';
import InboxSidebar from './components/InboxSidebar';
import CommentsTab from './CommentsTab';
import { PLATFORMS, PLATFORMS_BY_TAB } from './constants';
import styles from './InboxPage.module.css';
import type { InboxFilters } from './types';

export default function InboxCommentsPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const [filters, setFilters] = useState<InboxFilters>({
    platform: null,
    status: 'all',
    search: '',
    accountId: null,
  });

  const { data: socialAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['social-accounts-list', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => {
      if (!workspaceId) return [];
      return socialAccountsApi.listSocialAccounts(workspaceId);
    },
  });

  const supportedPlatforms = useMemo(
    () => PLATFORMS.filter((p) => (PLATFORMS_BY_TAB.comments as readonly string[]).includes(p.key)),
    [],
  );

  const filteredAccounts = useMemo(() => {
    const supportedKeys = PLATFORMS_BY_TAB.comments;
    const accountsArray = Array.isArray(socialAccounts)
      ? socialAccounts
      : (socialAccounts as any)?.items || [];
    return accountsArray.filter((acc: any) => {
      const matchTab = supportedKeys.includes(acc.platform as any);
      const matchPlatform = !filters.platform || acc.platform === filters.platform;
      return matchTab && matchPlatform;
    });
  }, [socialAccounts, filters.platform]);

  return (
    <div className={styles.page}>
      <div className={styles.masterDetail}>
        <InboxSidebar
          filters={filters}
          onChange={setFilters}
          accounts={filteredAccounts}
          accountsLoading={accountsLoading}
          supportedPlatforms={supportedPlatforms}
        />
        <div className={styles.panel} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <CommentsTab
            workspaceId={workspaceId}
            platform={filters.platform || undefined}
            accountId={filters.accountId || undefined}
            search={filters.search}
            unreadOnly={filters.status === 'unread'}
          />
        </div>
      </div>
    </div>
  );
}
