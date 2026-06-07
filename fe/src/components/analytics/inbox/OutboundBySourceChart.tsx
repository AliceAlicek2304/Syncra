import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import type { ZernioInboxSourceBreakdownRowDto } from '../../../types/inbox-analytics';

interface OutboundBySourceChartProps {
  data: ZernioInboxSourceBreakdownRowDto[];
  isLoading: boolean;
}

const COLORS = [
  '#3B82F6', // blue (human)
  '#10B981', // emerald (workflow)
  '#8B5CF6', // violet (sequence)
  '#F59E0B', // amber (broadcast)
  '#EC4899', // pink (comment_automation)
  '#6366F1', // indigo (api)
  '#14B8A6', // teal (contact)
  '#6B7280', // gray (platform)
];

const SOURCE_LABELS: Record<string, string> = {
  human: 'Human',
  workflow: 'Workflow',
  sequence: 'Sequence',
  broadcast: 'Broadcast',
  comment_automation: 'Comment automation',
  api: 'API',
  contact: 'Contact',
  platform: 'Platform',
};

export const OutboundBySourceChart = ({ data, isLoading }: OutboundBySourceChartProps) => {
  const chartData = useMemo(() => {
    return data
      .map((d) => ({
        name: SOURCE_LABELS[d.source] ?? d.source,
        value: d.sent,
        id: d.source,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalSent = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);

  return (
    <Card className="border-brand-border shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-bold text-brand-ink">Outbound by source</CardTitle>
        <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
          Sent messages breakdown
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1 h-[240px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-brand-body-mid">
            No outbound data yet
          </div>
        ) : (
          <div className="flex h-full items-center">
            <div className="relative flex-1 h-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const pct = ((data.value / totalSent) * 100).toFixed(1);
                        return (
                          <div className="rounded-brand-md border border-brand-border bg-white p-2 shadow-lg text-[10px]">
                            <p className="font-bold text-brand-ink mb-1">{data.name}</p>
                            <p className="text-brand-body">
                              Sent: <span className="font-bold">{data.value.toLocaleString()}</span> ({pct}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                  </Pie>

                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-lg font-extrabold text-brand-ink leading-tight">{totalSent.toLocaleString()}</div>
                <div className="text-[8px] text-brand-body-mid uppercase font-bold">Total Sent</div>
              </div>
            </div>
            
            <div className="w-1/3 flex flex-col gap-2 overflow-y-auto max-h-full py-2">
              {chartData.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-brand-ink truncate">{d.name}</span>
                    <span className="text-[9px] text-brand-body-mid">{((d.value / totalSent) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
