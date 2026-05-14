# Phase 13: Advanced Analytics & Reporting - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend analytics with CSV export, custom date ranges, and full analytics (summary + heatmap + per-post). Builds on Phase 12's caching infrastructure (analytics:summary, analytics:heatmap keys with 60-min TTL).

</domain>

<decisions>
## Implementation Decisions

### Export Format
- **D-01:** CSV only — simple, universally opening, great for analysis in Excel/Sheets

### Custom Date Range
- **D-02:** Presets + custom — quick buttons for common ranges (7 days, 30 days, 90 days, Year to Date) plus calendar picker for custom range

### Platform Breakdown
- **D-03:** Aggregated only — one export with all platforms combined into totals

### Export Scope
- **D-04:** Full analytics — include summary metrics (reach, engagement rate, follower growth, post count), heatmap data (when posts are published), and per-post performance data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `be/src/Syncra.Application/Services/WorkspaceAnalyticsService.cs` — existing analytics service with caching
- `be/src/Syncra.Application/Interfaces/IAnalyticsCache.cs` — cache interface for invalidation
- `.planning/REQUIREMENTS.md` — REQ-13.1 defines export, custom date range, platform breakdown
- `.planning/phases/12-query-optimization-caching/12-SPEC.md` — Phase 12 spec (cache keys, TTL)

</canonical_refs>

  ece
## Existing Code Insights

### Reusable Assets
- `WorkspaceAnalyticsService.GetSummaryAsync()` — already aggregates per-integration data, returns summary DTO
- `WorkspaceAnalyticsService.GetHeatmapAsync()` — returns heatmap slots by day/hour
- `IAnalyticsCache` — existing cache interface, keys: `analytics:summary:{workspaceId}:{days}`, `analytics:heatmap:{workspaceId}:{days}`
- Redis infrastructure already configured in Phase 12

### Established Patterns
- Cache-aside pattern with 60-min TTL
- Result<T> pattern for explicit error handling
- Projection queries (no Include(Media)) for performance

### Integration Points
- AnalyticsController endpoints: `/api/analytics/summary`, `/api/analytics/heatmap`
- New export endpoint(s) needed: `/api/analytics/export?format=csv&start={date}&end={date}`
- Per-post data: existing Post entity has PublishedAt, Status, and can join with integration data

</code_context>

<specifics>
## Specific Ideas

- CSV export should open directly in Excel/Google Sheets without formatting issues
- Date range should default to last 30 days
- Per-post export should include: post content preview, publish date, platform, engagement metrics

</specifics>

<deferred>
## Deferred Ideas

- PDF export — user chose CSV only for this phase
- Per-platform separate exports — user chose aggregated only

</deferred>

---

*Phase: 13-advanced-analytics-reporting*
*Context gathered: 2026-05-12*