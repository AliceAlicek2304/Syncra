# 13-03: API Endpoint & Tests

## Summary

Created the REST API endpoint for CSV analytics export and comprehensive test coverage.

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `be/src/Syncra.Application/Features/Analytics/Queries/GetAnalyticsExportQuery.cs` | **NEW** | MediatR query record with `WorkspaceId`, `Days?`, `StartUtc?`, `EndUtc?` parameters |
| `be/src/Syncra.Application/Features/Analytics/Queries/GetAnalyticsExportQueryHandler.cs` | **NEW** | Handler with `ResolveDateRange` logic supporting presets (7/30/90), YTD (`days=-1`), custom dates, and 30-day default |
| `be/src/Syncra.Api/Controllers/AnalyticsController.cs` | **MOD** | Added `GET .../analytics/export?days=&start=&end=` endpoint returning `File(result.Value, "text/csv", fileName)` |
| `be/tests/Syncra.UnitTests/Application/Analytics/GetAnalyticsExportQueryHandlerTests.cs` | **NEW** | 6 handler unit tests: YTD, 7d preset, 30d default, custom dates, days-precedence, failure |
| `be/tests/Syncra.UnitTests/Api/AnalyticsControllerTests.cs` | **MOD** | 3 controller integration tests: days CSV, custom dates CSV, failure → bad request |

## Decisions Applied

- **D-02**: Presets (7/30/90) via `days`, YTD via `days=-1`, custom via `start`+`end`, days precedence over custom, 30-day default fallback
- **D-04**: Full analytics through the service pipeline

## Build & Test

- `Build succeeded` — 0 errors
- `dotnet test --filter "~Analytics"` → **19/19 passed** (0 failed, 0 skipped)

## API

```
GET /api/v1/workspaces/{workspaceId}/analytics/export?days=30
GET /api/v1/workspaces/{workspaceId}/analytics/export?days=-1           (YTD)
GET /api/v1/workspaces/{workspaceId}/analytics/export?start=2026-01-01&end=2026-03-31
```
