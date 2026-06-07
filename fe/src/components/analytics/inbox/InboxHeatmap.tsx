import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { Separator } from '../../ui/separator';
import type { ZernioInboxHeatmapBucketDto } from '../../../types/inbox-analytics';

interface InboxHeatmapProps {
  buckets: ZernioInboxHeatmapBucketDto[];
  isLoading: boolean;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getHeatColor = (count: number, max: number) => {
  if (count === 0) return 'rgba(241, 245, 249, 1)'; // slate-100
  const opacity = Math.max(0.1, count / max);
  return `rgba(59, 130, 246, ${opacity})`; // blue-500
};

export const InboxHeatmap = ({ buckets, isLoading }: InboxHeatmapProps) => {
  const { grid, max } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    let m = 0;
    
    buckets.forEach((b) => {
      // Zernio dow is 1=Mon, 7=Sun. Map to 0=Mon, 6=Sun.
      const dayIdx = b.dow - 1;
      const hourIdx = b.hour;
      const count = b.received + b.sent + b.read;
      if (dayIdx >= 0 && dayIdx < 7 && hourIdx >= 0 && hourIdx < 24) {
        g[dayIdx][hourIdx] = count;
        if (count > m) m = count;
      }
    });
    
    return { grid: g, max: m };
  }, [buckets]);

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="border-brand-border shadow-sm flex flex-col h-full">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-brand-ink">Message activity</CardTitle>
              <CardDescription className="text-[10px] text-brand-body-mid mt-0.5">
                Heatmap of message volume by hour and day
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-brand-body-mid font-semibold">
              Less
              <div className="flex gap-0.5">
                <div className="w-2 h-2 rounded-sm bg-slate-100" />
                <div className="w-2 h-2 rounded-sm bg-blue-500/30" />
                <div className="w-2 h-2 rounded-sm bg-blue-500/60" />
                <div className="w-2 h-2 rounded-sm bg-blue-500" />
              </div>
              More
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-center min-h-[220px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <div className="flex flex-col h-full mt-2">
              {/* Hour Labels */}
              <div className="flex mb-1 ml-8">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="flex-1 text-[8px] text-brand-body-mid text-center">
                    {h % 4 === 0 ? (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`) : ''}
                  </div>
                ))}
              </div>

              <div className="flex flex-1">
                {/* Day Labels */}
                <div className="w-8 flex flex-col">
                  {DAY_LABELS.map((day) => (
                    <div key={day} className="flex-1 flex items-center text-[8px] font-bold text-brand-body-mid pr-2 uppercase">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid Cells */}
                <div className="flex-1 flex flex-col gap-0.5">
                  {grid.map((row, dayIdx) => (
                    <div key={dayIdx} className="flex-1 flex gap-0.5">
                      {row.map((count, hourIdx) => (
                        <Tooltip key={`${dayIdx}-${hourIdx}`}>
                          <TooltipTrigger asChild>
                            <div
                              className="flex-1 rounded-[1px] transition-colors duration-200 cursor-help"
                              style={{ backgroundColor: getHeatColor(count, max) }}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="p-2 min-w-[120px]">
                            <div className="space-y-1">
                              <div className="font-bold text-[10px]">
                                {DAY_LABELS[dayIdx]} {hourIdx === 0 ? '12am' : hourIdx < 12 ? `${hourIdx}am` : hourIdx === 12 ? '12pm' : `${hourIdx-12}pm`}
                              </div>
                              <Separator className="bg-brand-border/40" />
                              <div className="text-[10px] text-brand-body">
                                Messages: <span className="font-bold text-brand-ink">{count.toLocaleString()}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
