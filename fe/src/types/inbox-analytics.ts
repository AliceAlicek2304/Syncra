// Inbox Analytics DTOs — mirror of be/.../ZernioDtos.cs lines 815-983
// All date strings use YYYY-MM-DD (per Zernio's ClickHouse `toDate`).
// All counters are long; response-time is seconds (double).

export interface ZernioInboxVolumeResponseDto {
  success: boolean;
  from: string;
  to: string;
  summary: ZernioInboxVolumeSummaryDto;
  timeseries: ZernioInboxDailyTotalsDto[];
  byPlatform: ZernioInboxPlatformBreakdownDto[];
}

export interface ZernioInboxVolumeSummaryDto {
  received: number;
  sent: number;
  read: number;
  failed: number;
  uniqueConversations: number;
}

export interface ZernioInboxDailyTotalsDto {
  date: string;
  sent: number;
  received: number;
  read: number;
  failed: number;
}

export interface ZernioInboxPlatformBreakdownDto {
  platform: string;
  sent: number;
  received: number;
  read: number;
  failed: number;
}

export interface ZernioInboxTopAccountsResponseDto {
  success: boolean;
  from: string;
  to: string;
  accounts: ZernioInboxTopAccountDto[];
}

export interface ZernioInboxTopAccountDto {
  accountId: string;
  platform: string;
  displayName: string;
  username: string;
  received: number;
  sent: number;
  total: number;
  conversations: number;
  medianResponseSeconds: number;
  repliedCount: number;
}

export interface ZernioInboxSourceBreakdownResponseDto {
  success: boolean;
  from: string;
  to: string;
  sources: ZernioInboxSourceBreakdownRowDto[];
}

export type InboxMessageSource =
  | 'human'
  | 'workflow'
  | 'sequence'
  | 'broadcast'
  | 'comment_automation'
  | 'api'
  | 'contact'
  | 'platform';

export interface ZernioInboxSourceBreakdownRowDto {
  source: InboxMessageSource | string;
  received: number;
  sent: number;
  read: number;
  byPlatform: ZernioInboxSourcePlatformDto[];
}

export interface ZernioInboxSourcePlatformDto {
  platform: string;
  received: number;
  sent: number;
  read: number;
}

export interface ZernioInboxResponseTimeResponseDto {
  success: boolean;
  from: string;
  to: string;
  summary: ZernioInboxResponseTimeSummaryDto;
  histogram: ZernioInboxResponseHistogramBucketDto[];
}

export interface ZernioInboxResponseTimeSummaryDto {
  sampleSize: number;
  medianSeconds: number;
  p90Seconds: number;
  p99Seconds: number;
  meanSeconds: number;
  fastestSeconds: number;
  slowestSeconds: number;
}

export interface ZernioInboxResponseHistogramBucketDto {
  bucket: string;
  lowerSeconds: number;
  upperSeconds: number;
  count: number;
}

export type HeatmapAction = 'message.received' | 'message.sent' | 'message.read' | 'all';

export interface ZernioInboxHeatmapResponseDto {
  success: boolean;
  from: string;
  to: string;
  buckets: ZernioInboxHeatmapBucketDto[];
}

export interface ZernioInboxHeatmapBucketDto {
  dow: number; // 1=Mon..7=Sun (ClickHouse toDayOfWeek)
  hour: number; // 0..23
  received: number;
  sent: number;
  read: number;
}

export interface ZernioInboxConversationsListResponseDto {
  success: boolean;
  from: string;
  to: string;
  items: ZernioInboxConversationListItemDto[];
  pagination: ZernioInboxPaginationDto;
}

export interface ZernioInboxConversationListItemDto {
  conversationId: string;
  mongoid: string;
  accountId: string;
  platform: string;
  participantName: string;
  participantUsername: string;
  participantPicture: string;
  lastMessage: string;
  totalMessages: number;
  received: number;
  sent: number;
  read: number;
  failed: number;
  firstMessagedAt: string;
  lastMessagedAt: string;
}

export interface ZernioInboxPaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ZernioInboxConversationDetailDto {
  success: boolean;
  conversationId: string;
  mongoid: string;
  platform: string;
  from: string;
  to: string;
  summary: ZernioInboxConversationSummaryDto;
  timeseries: ZernioInboxDailyTotalsDto[];
  bySource: ZernioInboxBySourceRowDto[];
}

export interface ZernioInboxConversationSummaryDto {
  received: number;
  sent: number;
  read: number;
  failed: number;
  totalMessages: number;
  firstMessagedAt: string;
  lastMessagedAt: string;
}

export interface ZernioInboxBySourceRowDto {
  source: string;
  count: number;
}

export type InboxAnalyticsPresetDays = 7 | 30 | 90 | 365;

export interface InboxAnalyticsError {
  code: string;
  message: string;
  reason?: string;
  platform?: string;
  reauthorizeUrl?: string;
  dashboardUrl?: string;
  status: number;
}
