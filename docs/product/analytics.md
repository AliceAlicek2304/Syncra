# Syncra Analytics

Syncra gathers post-specific performance metrics (engagement rate, reach, comments, shares, views) and account-level growth metrics (follower counts) across all channels.

## Scoping Boundaries

Analytics query APIs do not carry `{workspaceId}` in the URL paths. Instead, they require developers to specify:
- **`X-Workspace-Id`** Header: Scopes queries to the active workspace.
- **`profileId`** Query Parameter: Scopes queries to a specific brand profile inside the workspace.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/analytics/summary` | Overall metrics (total reach, total followers, engagement rate changes) |
| GET | `/api/v1/analytics/heatmap` | Aggregated hourly posting engagements (best times to post) |
| GET | `/api/v1/analytics/daily-metrics` | Historical daily metrics list for line-chart rendering |
| GET | `/api/v1/analytics/accounts/follower-stats` | Historical growth data for follower counts |
| GET | `/api/v1/analytics/post/{postId}/debug` | Returns raw platform data payload for debugging |
| GET | `/api/analytics` | Search, query, or list post and account metrics |

## Query Filters

For endpoints supporting search/filtering:
- `date`: Simple lookback window (e.g. `30` representing past 30 days).
- `fromDate` / `toDate`: UTC ISO timestamps defining explicit windows.
- `profileId`: Specific brand filter.
- `platform`: Limit to specific networks (`x`, `tiktok`, `youtube`, `facebook`).
- `accountId`: Scope metrics to a specific connected account.
