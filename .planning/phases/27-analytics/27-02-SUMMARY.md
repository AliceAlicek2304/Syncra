---
phase: 27
plan: 02
subsystem: analytics
tags: ["zernio", "analytics", "heatmap", "best-time", "http-status", "frontend", "billing-gate"]
requires:
  - "27-01 (Zernio profile provisioning, workspace metrics, post analytics)"
provides:
  - "Heatmap endpoint with Zernio UTC best-time slots"
  - "HTTP status propagation (202/402/403/412)"
  - "Frontend analytics page with billing gate, reauth banner, refresh, platform filter"
affects:
  - "AnalyticsController (heatmap endpoint + platform query param)"
  - "ZernioClient (best-time, daily-metrics, post-analytics)"
  - "AnalyticsPage.tsx (frontend)"
tech-stack:
  added:
    - "AnalyticsResultExtensions.cs (ASP.NET Core extension)"
  patterns:
    - "TDD for heatmap mapper tests"
    - "Dual-path handler (Zernio vs legacy workspace analytics)"
    - "Structured error extraction from AxiosError"
key-files:
  created:
    - "be/src/Syncra.Api/Common/AnalyticsResultExtensions.cs"
    - "be/tests/Syncra.UnitTests/Application/Services/BestTimeMapperTests.cs"
    - "fe/src/pages/app/AnalyticsPage.test.tsx"
  modified:
    - "be/src/Syncra.Api/Controllers/AnalyticsController.cs"
    - "be/src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs"
    - "be/src/Syncra.Application/DTOs/Analytics/PostMetricsDto.cs"
    - "be/src/Syncra.Application/DTOs/Zernio/ZernioDtos.cs"
    - "be/src/Syncra.Application/Features/Analytics/Queries/GetPostAnalyticsQueryHandler.cs"
    - "be/src/Syncra.Application/Features/Analytics/Queries/GetWorkspaceHeatmapQuery.cs"
    - "be/src/Syncra.Application/Features/Analytics/Queries/GetWorkspaceHeatmapQueryHandler.cs"
    - "be/src/Syncra.Application/Features/Analytics/Queries/RefreshAnalyticsCommandHandler.cs"
    - "be/src/Syncra.Application/Interfaces/IZernioClient.cs"
    - "be/src/Syncra.Application/Interfaces/IZernioWorkspaceAnalyticsService.cs"
    - "be/src/Syncra.Application/Services/ZernioWorkspaceAnalyticsService.cs"
    - "be/src/Syncra.Infrastructure/Services/ZernioClient.cs"
    - "be/tests/Syncra.UnitTests/Api/AnalyticsControllerTests.cs"
    - "fe/src/api/analytics.ts"
    - "fe/src/hooks/useAnalyticsSummary.ts"
    - "fe/src/pages/app/AnalyticsPage.tsx"
    - "fe/src/pages/app/AnalyticsPage.module.css"
metrics:
  duration: "~2 hours"
  be-tests: 218 passing (0 failing)
  fe-tests: 132 passing (0 failing)
  commits: 4
completed-date: "2026-05-23"
---

# Phase 27 Plan 02: Heatmap Zernio Integration + HTTP Status Propagation + Frontend Analytics Summary

Heatmap endpoint sourcing from Zernio best-time API via cache-aside, HTTP status code propagation (202 sync-pending, 402/403 billing, 412 scope), and frontend analytics page with billing gate, reauthorization banner, refresh button, and heatmap platform filter.

## Task Execution

### Task 1 — Heatmap from Zernio best-time (TDD)
- **RED (9bfa452):** Created `BestTimeMapperTests.cs` with 3 failing tests:
  - UTC slot pass-through (slots should not be date-shifted)
  - Platform-filtered returns different results
  - Cache hit returns cached data
- **GREEN (76cb0f4):** Implementation:
  - `IZernioClient.GetBestTimeAsync(profileId, platform, ct)` → SDK call
  - `ZernioBestTimeDto`/`ZernioBestTimeSlotDto` DTOs
  - `IZernioWorkspaceAnalyticsService.GetHeatmapAsync(workspaceId, days, platform)` → cache-aside with 60-min TTL
  - `GetWorkspaceHeatmapQuery` + `platform` param
  - Dual-path handler: Zernio path when profile exists, legacy otherwise
  - Heatmap endpoint accepts `?platform=` query param
  - `RefreshAnalyticsCommandHandler` deletes platform-specific cache keys
- All 33 analytics tests pass (including 3 new)

### Task 2 — HTTP status propagation
- Added `IsSyncPending` field to `PostMetricsDto` (default `false`)
- `ZernioWorkspaceAnalyticsService` preserves sync-pending status; skips cache for pending results
- `AnalyticsResultExtensions.ToAnalyticsActionResult()` — maps 202/200/400
- Controller `GetPostAnalytics` uses `ToAnalyticsActionResult` (202 Accepted when sync-pending)
- `GlobalExceptionMiddleware`:
  - `analytics_addon_required` reason → 403 Forbidden
  - `ZernioAnalyticsScopeException` → 412 PreconditionFailed
- `ZernioClient` analytics methods throw `ZernioAnalyticsScopeException` on 412
- 3 new controller tests for 202 Accepted, 403 Forbidden, 412 PreconditionFailed

### Task 3 — Frontend analytics page
- `analyticsApi.getWorkspaceHeatmap` accepts optional `platform` param
- `useAnalyticsSummary` hook extended:
  - `analyticsError` (structured from AxiosError)
  - `isBillingGateError` (402 or 403 analytics_addon_required)
  - `isScopeError` (412)
  - `refresh()` for manual data reload
  - `heatmapPlatform`/`setHeatmapPlatform` for filter state
- `BillingGateBanner` component — shown on 402/403 with upgrade link
- `ReauthorizeBanner` component — shown on 412 with reauthorize link
- Refresh button with spinning indicator when fetching
- Heatmap platform filter dropdown (All/Instagram/Facebook/LinkedIn/TikTok/Twitter)
- Dismissible error banners
- 10 new frontend tests covering all states

## Deviations from Plan

None — plan executed as written.

## Key Decisions

1. **Cache skip for sync-pending results** — When post analytics return `syncPending: true`, the result is still returned to the controller (as 202 Accepted) but NOT cached, so the next request will fetch fresh data.
2. **ZernioAnalyticsScopeException from ZernioClient** — All three analytics methods (best-time, daily-metrics, post-analytics) throw `ZernioAnalyticsScopeException` on 412 from the Zernio API. The platform field is passed through when available.
3. **Error banner approach** — Used inline dismissible banners rather than modals for 402/403/412 errors. This is consistent with the existing pattern and avoids blocking the user from seeing other page content.

## Verification

| Check | Result |
|-------|--------|
| BE unit tests (analytics) | 36/36 passing |
| BE unit tests (all) | 218/218 passing |
| FE unit tests (all) | 132/132 passing |
| Controller tests (202/403/412) | 3/3 passing |
| AnalyticsPage tests | 10/10 passing |
| Build (BE) | Succeeds |
| Build (FE — tsc) | 0 errors |

## Self-Check: PASSED

- [x] All task files exist as listed in key-files
- [x] All commits exist in git log (9bfa452, 76cb0f4, e324e13, b16e249)
- [x] No unexpected deletions
- [x] No stubs — all data paths wired to real endpoints

## Commit Log

| Hash | Type | Description |
|------|------|-------------|
| `9bfa452` | test | Add failing tests for best-time UTC heatmap mapping |
| `76cb0f4` | feat | Implement best-time Zernio integration and UTC heatmap backend |
| `e324e13` | feat | Propagate HTTP status codes 202, 403, 412 from analytics endpoints |
| `b16e249` | feat | Frontend analytics page with billing gate, reauth banner, refresh, platform filter |
