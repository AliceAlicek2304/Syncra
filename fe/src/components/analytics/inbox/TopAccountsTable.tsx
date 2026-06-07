import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ExtendedPlatformIcon } from '../../create-post/platformIcons';
import type { ZernioInboxTopAccountDto } from '../../../types/inbox-analytics';

interface TopAccountsTableProps {
  accounts: ZernioInboxTopAccountDto[];
  isLoading: boolean;
}

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

export const TopAccountsTable = ({ accounts, isLoading }: TopAccountsTableProps) => {
  return (
    <Card className="border-brand-border shadow-sm overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-bold text-brand-ink">Top Accounts</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-brand-body text-xs font-semibold">
            No account interactions yet.
          </div>
        ) : (
          <Table className="text-[11px]">
            <TableHeader className="bg-brand-canvas-soft border-b border-brand-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-brand-ink h-8 px-3 uppercase tracking-wider">Account</TableHead>
                <TableHead className="font-bold text-brand-ink h-8 px-3 uppercase tracking-wider text-right">Received</TableHead>
                <TableHead className="font-bold text-brand-ink h-8 px-3 uppercase tracking-wider text-right">Sent</TableHead>
                <TableHead className="font-bold text-brand-ink h-8 px-3 uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="font-bold text-brand-ink h-8 px-3 uppercase tracking-wider text-right">Conversations</TableHead>
                <TableHead className="font-bold text-brand-ink h-8 px-3 uppercase tracking-wider text-right whitespace-nowrap">Avg Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => (
                <TableRow key={acc.accountId} className="hover:bg-brand-canvas-soft/40 border-b border-brand-border/60">
                  <TableCell className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://unavatar.io/${acc.platform}/${acc.username}`} />
                          <AvatarFallback className="text-[10px] bg-brand-canvas-soft">{acc.displayName?.[0] ?? '?'}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                          <ExtendedPlatformIcon platform={acc.platform} size={8} />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-brand-ink truncate leading-tight">{acc.displayName || acc.username}</span>
                        <span className="text-[9px] text-brand-body-mid truncate">@{acc.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-2 px-3 text-brand-body font-medium">{acc.received.toLocaleString()}</TableCell>
                  <TableCell className="text-right py-2 px-3 text-brand-body font-medium">{acc.sent.toLocaleString()}</TableCell>
                  <TableCell className="text-right py-2 px-3 text-brand-ink font-bold">{acc.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right py-2 px-3 text-brand-body">{acc.conversations.toLocaleString()}</TableCell>
                  <TableCell className="text-right py-2 px-3">
                    {acc.medianResponseSeconds > 0 ? (
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm font-bold">
                        {formatDuration(acc.medianResponseSeconds)}
                      </span>
                    ) : (
                      <span className="text-brand-body-mid/40">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
