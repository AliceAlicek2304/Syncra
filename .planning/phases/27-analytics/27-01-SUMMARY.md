---
phase: 27-analytics
plan: 01
subsystem: api
tags: [zernio, analytics, caching, mediator, csharp, dotnet]
requires:
  - phase: 26-zernio-posts
    provides: Zernio client interface, ZernioPostId on Post entity, Zernio SDK integration patterns
provides:
  - Zernio-sourced workspace daily analytics summary with 60-min cache-aside
  - Zernio-sourced post-level metrics with 10-min cache-aside
  - POST /api/v1/workspaces/{id}/analytics/refresh with explicit cache key invalidation
  - Dual-path handlers (Zernio when profile exists, legacy otherwise)
affects: [27-02-status-code, frontend-analytics-integration]
tech-stack:
  added: []
  patterns:
    - Cache-aside with workspace-scoped Redis keys (zernio:analytics:summary:{wsId}:{days})
    - Dual-path handlers: Zernio profile check → Zernio path or legacy path
    - IDOR guard on post analytics via SocialAccountRepository workspace scoping
key-files:
  created:
    - be/src/Syncra.Application/Services/ZernioWorkspaceAnalyticsService.cs
    - be/src/Syncra.Application/Interfaces/IZernioWorkspaceAnalyticsService.cs
    - be/src/Syncra.Application/Features/Analytics/Queries/RefreshAnalyticsCommand.cs
    - be/src/Syncra.Application/Features/Analytics/Queries/RefreshAnalyticsCommandHandler.cs
    - be/src/Syncra.Domain/Exceptions/ZernioAnalyticsScopeException.cs
    - be/tests/Syncra.UnitTests/Application/Services/AnalyticsRefreshTests.cs
  modified:
    - be/src/Syncra.Application/DTOs/Zernio/ZernioDtos.cs
    - be/src/Syncra.Application/DTOs/Analytics/WorkspaceAnalyticsSummaryDto.cs
    - be/src/Syncra.Application/DTOs/Analytics/PostMetricsDto.cs
    - be/src/Syncra.Application/Interfaces/IZernioClient.cs
    - be/src/Syncra.Infrastructure/Services/ZernioClient.cs
    - be/src/Syncra.Application/Features/Analytics/Queries/GetWorkspaceSummaryQueryHandler.cs
    - be/src/Syncra.Application/Features/Analytics/Queries/GetPostAnalyticsQuery.cs
    - be/src/Syncra.Application/Features/Analytics/Queries/GetPostAnalyticsQueryHandler.cs
    - be/src/Syncra.Application/DependencyInjection.cs
    - be/src/Syncra.Application/Services/PublishService.cs
    - be/src/Syncra.Domain/Interfaces/ISocialAccountRepository.cs
    - be/src/Syncra.Infrastructure/Repositories/SocialAccountRepository.cs
    - be/src/Syncra.Api/Controllers/AnalyticsController.cs
    - be/tests/Syncra.UnitTests/Api/AnalyticsControllerTests.cs
key-decisions:
  - "Used Zernio SDK AnalyticsApi (available in 0.0.281) instead of typed HttpClient for analytics endpoints"
  - "Cache keys: zernio:analytics:summary:{wsId}:{days} (60min TTL), zernio:analytics:post:{wsId}:{postId} (10min TTL)"
  - "Dual-path handlers: check ZernioProfileRepository first; route to Zernio path or legacy"
  - "Refresh deletes both zernio:analytics:* and legacy analytics:* keys for 7/30/90 presets"
  - "D-07 412 scope enrichment: exception defined; RequiresReauth enrichment deferred to plan 27-02"
patterns-established:
  - "Cache-aside: check Redis → miss → fetch from Zernio → set cache with TTL → return"
  - "IDOR guard: load SocialAccount by workspace+platformAccountId before Zernio call"
  - "All analytics tests pass together at plan level (mock-based, no real Zernio API calls)"
requirements-completed: [ANLYT-01, ANLYT-02]
duration: 21min
completed: 2026-05-23
---

# Phase 27: Analytics Summary

**Zernio-sourced workspace daily analytics and post-level metrics with cache-aside, dual-path handlers, and explicit cache invalidation via POST refresh**

## Performance

- **Duration:** 21 min
- **Started:** 2026-05-23T20:46:00Z
- **Completed:** 2026-05-23T20:56:00Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments
- Zernio-sourced daily analytics summary with 60-min Redis cache-aside (D-03)
- Post-level metrics from Zernio analytics API with 10-min cache-aside (D-05)
- IDOR guard on post analytics: workspace-scoped access check before Zernio call (T-27-01)
- Refresh endpoint (POST refresh) deletes 12 cache keys per workspace (zernio + legacy, 3 presets, 2 key types)
- Dual-path handlers: Zernio path when profile exists, legacy analytics path otherwise
- PublishService cache invalidation aligned to new zernio:analytics:* key schema
- ZernioAnalyticsScopeException for 412 (scope enrichment) — defined for plan 27-02 use
- All 212 tests passing (including 15 new analytics tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED tests for DTOs, client, service** - `767984c` (test)
2. **Task 2: GREEN implementation of ZernioWorkspaceAnalyticsService** - `7e8b267` (feat)
3. **Task 3: Wire handlers, refresh, DI, cache alignment** - `7426d93` (feat)

## Files Created/Modified

### Created
- `be/src/Syncra.Application/DTOs/Analytics/PostMetricsDto.cs` - Headline metrics DTO with optional platform breakdown
- `be/src/Syncra.Application/DTOs/Zernio/ZernioDtos.cs` - Extended with ZernioDailyMetricsDto, ZernioPostAnalyticsDto (analytics DTOs)
- `be/src/Syncra.Application/Interfaces/IZernioWorkspaceAnalyticsService.cs` - Service interface for Zernio analytics
- `be/src/Syncra.Application/Services/ZernioWorkspaceAnalyticsService.cs` - Full cache-aside service implementation (~260 lines)
- `be/src/Syncra.Application/Features/Analytics/Queries/RefreshAnalyticsCommand.cs` - Command record
- `be/src/Syncra.Application/Features/Analytics/Queries/RefreshAnalyticsCommandHandler.cs` - 12-key cache invalidation handler
- `be/src/Syncra.Domain/Exceptions/ZernioAnalyticsScopeException.cs` - 412 scope enrichment exception
- `be/tests/Syncra.UnitTests/Application/Services/AnalyticsRefreshTests.cs` - Cache key deletion verification test
- `be/tests/Syncra.UnitTests/Application/Services/PostAnalyticsMapperTests.cs` - DTO mapping tests (6 tests)

### Modified
- `be/src/Syncra.Application/Interfaces/IZernioClient.cs` - Added GetDailyMetricsAsync, GetPostAnalyticsAsync
- `be/src/Syncra.Infrastructure/Services/ZernioClient.cs` - Analytics API implementation with analytics_addon_required
- `be/src/Syncra.Application/DTOs/Analytics/WorkspaceAnalyticsSummaryDto.cs` - Added PlatformBreakdown, PlatformBreakdownDto
- `be/src/Syncra.Application/DependencyInjection.cs` - Registered IZernioWorkspaceAnalyticsService
- `be/src/Syncra.Api/Controllers/AnalyticsController.cs` - Added POST refresh endpoint
- `be/src/Syncra.Application/Services/PublishService.cs` - Cache keys aligned to new schema

## Decisions Made
- Used Zernio SDK AnalyticsApi (available in 0.0.281) instead of typed HttpClient for analytics endpoints
- Cache keys: `zernio:analytics:summary:{wsId}:{days}` (60min TTL D-03), `zernio:analytics:post:{wsId}:{postId}` (10min TTL D-05)
- Dual-path handlers: check ZernioProfileRepository → route to Zernio or legacy path
- Refresh deletes both zernio:analytics:* and legacy analytics:* keys for 7/30/90 presets (12 keys total)
- D-07 412 scope enrichment: ZernioAnalyticsScopeException defined but RequiresReauth marking deferred to plan 27-02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test dates that fell in same ISO week**
- **Found during:** Task 2 (GREEN implementation verification)
- **Issue:** Two test data points (May 20 and May 21, 2026) were both in the same ISO week, causing `WeeklyReach.Count` to be 1 instead of expected 2
- **Fix:** Changed dates to May 11 (Monday, week 1) and May 18 (Monday, week 2)
- **Files modified:** `be/tests/Syncra.UnitTests/Application/Services/PostAnalyticsMapperTests.cs`
- **Verification:** Test now passes (Expected: 2, Actual: 2)
- **Committed in:** `7e8b267` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor — test data adjustment for correctness. No scope creep.

## Issues Encountered
- Test data needed different ISO weeks for weekly grouping verification — resolved by shifting dates
- Pre-existing Hangfire NRE logs in test output (mock JobStorage without proper setup) — unrelated, out of scope

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend Zernio analytics paths ready for plan 27-02 (HTTP 202/403/412 status code branching)
- PostMetricsDto JSON shape ready for frontend integration
- Refresh endpoint returns 204; frontend can call it before fetching new summary data
- ZernioAnalyticsScopeException defined for 412 scope enrichment in plan 27-02

---
*Phase: 27-analytics*
*Completed: 2026-05-23*
