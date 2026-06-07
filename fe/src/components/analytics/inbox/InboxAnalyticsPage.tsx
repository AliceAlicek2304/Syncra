import { useInboxAnalytics } from '../../../hooks/useInboxAnalytics';
import { InboxFilterBar, InboxBanner } from '../InboxFilterBar';
import { KpiStrip } from './KpiStrip';
import { MessagesOverTimeChart } from './MessagesOverTimeChart';
import { MessagesPerPlatformChart } from './MessagesPerPlatformChart';
import { ResponseTimeChart } from './ResponseTimeChart';
import { TopAccountsTable } from './TopAccountsTable';
import { OutboundBySourceChart } from './OutboundBySourceChart';
import { InboxHeatmap } from './InboxHeatmap';

export const InboxAnalyticsPage = () => {
  const {
    volume,
    topAccounts,
    sourceBreakdown,
    responseTime,
    heatmap,
    loadingFlags,
    presetDays,
  } = useInboxAnalytics();

  return (
    <div className="flex flex-col gap-6">
      <InboxFilterBar />
      <InboxBanner />
      
      <KpiStrip summary={volume?.summary ?? null} isLoading={loadingFlags.volume} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessagesOverTimeChart 
          data={volume?.timeseries ?? []} 
          isLoading={loadingFlags.volume} 
          presetDays={presetDays}
        />
        <MessagesPerPlatformChart 
          data={volume?.byPlatform ?? []} 
          isLoading={loadingFlags.volume} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopAccountsTable accounts={topAccounts} isLoading={loadingFlags.topAccounts} />
        </div>
        <ResponseTimeChart data={responseTime} isLoading={loadingFlags.responseTime} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutboundBySourceChart data={sourceBreakdown} isLoading={loadingFlags.sourceBreakdown} />
        <InboxHeatmap buckets={heatmap} isLoading={loadingFlags.heatmap} />
      </div>
    </div>
  );
};
