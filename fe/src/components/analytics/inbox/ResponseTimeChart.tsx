import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import type { ZernioInboxResponseTimeResponseDto } from '../../../types/inbox-analytics';

interface ResponseTimeChartProps {
  data: ZernioInboxResponseTimeResponseDto | null;
  isLoading: boolean;
}

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

export const ResponseTimeChart = ({ data, isLoading }: ResponseTimeChartProps) => {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.histogram.map((h) => ({
      name: h.bucket,
      count: h.count,
    }));
  }, [data]);

  const summary = data?.summary;

  return (
    <Card className="border-brand-border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2 space-y-0">
        <div>
          <CardTitle className="text-xs font-bold text-brand-ink">Response time</CardTitle>
          <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
            Distribution of response times
          </CardDescription>
        </div>
        {!isLoading && summary && summary.sampleSize > 0 && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Clock className="h-3 w-3" />
              <span className="text-sm font-extrabold">{formatDuration(summary.medianSeconds)}</span>
            </div>
            <span className="text-[9px] font-medium text-brand-body-mid uppercase tracking-wider">Median</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-1 h-[240px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : !data || data.histogram.length === 0 || summary?.sampleSize === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-brand-body-mid text-center px-8">
            No response time data yet. Data appears once you reply to incoming messages.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#6B7280' }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6B7280' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-brand-md border border-brand-border bg-white p-2 shadow-lg text-[10px]">
                            <p className="font-bold text-brand-ink mb-1">{payload[0].payload.name}</p>
                            <p className="text-brand-body">
                              Conversations: <span className="font-bold">{payload[0].value.toLocaleString()}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-brand-border/40 pt-3">
              <div className="text-center">
                <div className="text-[10px] font-bold text-brand-ink">{formatDuration(summary?.p90Seconds ?? 0)}</div>
                <div className="text-[9px] text-brand-body-mid uppercase tracking-wider">P90</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-brand-ink">{formatDuration(summary?.meanSeconds ?? 0)}</div>
                <div className="text-[9px] text-brand-body-mid uppercase tracking-wider">Mean</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-brand-ink">{formatDuration(summary?.fastestSeconds ?? 0)}</div>
                <div className="text-[9px] text-brand-body-mid uppercase tracking-wider">Fastest</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
