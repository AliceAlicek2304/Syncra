import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { ZERNIO_PLATFORMS } from '../../../data/platforms';
import { ExtendedPlatformIcon } from '../../create-post/platformIcons';
import type { ZernioInboxPlatformBreakdownDto } from '../../../types/inbox-analytics';

interface MessagesPerPlatformChartProps {
  data: ZernioInboxPlatformBreakdownDto[];
  isLoading: boolean;
}

const PlatformTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-25} y={-10} width={20} height={20}>
        <ExtendedPlatformIcon platform={payload.value} size={14} />
      </foreignObject>
    </g>
  );
};

export const MessagesPerPlatformChart = ({ data, isLoading }: MessagesPerPlatformChartProps) => {
  const chartData = useMemo(() => {
    return data
      .map((d) => ({
        platform: d.platform,
        total: d.received + d.sent,
        label: ZERNIO_PLATFORMS.find((p) => p.id === d.platform)?.label ?? d.platform,
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <Card className="border-brand-border shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-bold text-brand-ink">Messages per platform</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1 h-[240px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-brand-body-mid">
            No platform data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="platform"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={<PlatformTick />}
                width={30}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-brand-md border border-brand-border bg-white p-2 shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <ExtendedPlatformIcon platform={data.platform} size={12} />
                          <span className="text-[10px] font-bold text-brand-ink">{data.label}</span>
                        </div>
                        <p className="text-[10px] text-brand-body">
                          Total messages: <span className="font-bold">{data.total.toLocaleString()}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="#3B82F6" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
