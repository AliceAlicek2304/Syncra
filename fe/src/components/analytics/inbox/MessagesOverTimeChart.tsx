import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import type { ZernioInboxDailyTotalsDto } from '../../../types/inbox-analytics';

interface MessagesOverTimeChartProps {
  data: ZernioInboxDailyTotalsDto[];
  isLoading: boolean;
  presetDays: number;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-brand-md border border-brand-border bg-white p-2 shadow-lg">
        <p className="mb-1 text-[10px] font-bold text-brand-ink">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any) => (
            <div key={item.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-brand-body">{item.name}</span>
              </div>
              <span className="text-[10px] font-bold text-brand-ink">
                {item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const MessagesOverTimeChart = ({ data, isLoading, presetDays }: MessagesOverTimeChartProps) => {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      name: d.date,
      received: d.received,
      sent: d.sent,
    }));
  }, [data]);

  return (
    <Card className="border-brand-border shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-bold text-brand-ink">Messages over time</CardTitle>
        <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
          Daily sent and received messages · last {presetDays} days
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1 h-[240px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-brand-body-mid">
            No message data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#6B7280' }}
                minTickGap={30}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#6B7280' }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, paddingBottom: 10 }}
              />
              <Bar
                name="Received"
                dataKey="received"
                fill="url(#receivedGrad)"
                radius={[2, 2, 0, 0]}
                barSize={presetDays > 30 ? 4 : 12}
              />
              <Bar
                name="Sent"
                dataKey="sent"
                fill="url(#sentGrad)"
                radius={[2, 2, 0, 0]}
                barSize={presetDays > 30 ? 4 : 12}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
