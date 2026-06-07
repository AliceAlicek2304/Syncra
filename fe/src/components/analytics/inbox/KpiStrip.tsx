import { MessageCircle, Send, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { Card } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import CountingNumber from '../../CountingNumber';
import type { ZernioInboxVolumeSummaryDto } from '../../../types/inbox-analytics';

interface KpiStripProps {
  summary: ZernioInboxVolumeSummaryDto | null;
  isLoading: boolean;
}

export const KpiStrip = ({ summary, isLoading }: KpiStripProps) => {
  const kpis = [
    {
      label: 'Received',
      value: summary?.received ?? 0,
      icon: MessageCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'before:bg-blue-600',
    },
    {
      label: 'Sent',
      value: summary?.sent ?? 0,
      icon: Send,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'before:bg-emerald-600',
    },
    {
      label: 'Read',
      value: summary?.read ?? 0,
      icon: CheckCircle2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'before:bg-indigo-600',
    },
    {
      label: 'Failed',
      value: summary?.failed ?? 0,
      icon: AlertCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'before:bg-rose-600',
    },
    {
      label: 'Unique Conversations',
      value: summary?.uniqueConversations ?? 0,
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'before:bg-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className={`relative overflow-hidden p-4 shadow-sm before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] ${kpi.borderColor}`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-body">
              {kpi.label}
            </div>
            <div className={`${kpi.bgColor} rounded-full p-1.5`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-brand-ink">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <CountingNumber value={kpi.value} format={(v) => v.toLocaleString()} />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
