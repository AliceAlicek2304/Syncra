# Plan 13-FIX-01 Summary: Fix EF Core Concurrency Crash in CSV Export

## What was fixed

- **AnalyticsExportService.ExportCsvAsync** — converted parallel `Task.WhenAll` to sequential `await` calls to prevent EF Core concurrency violation
- All three data-fetch operations (`GetSummaryAsync`, `GetHeatmapAsync`, `GetPublishedPostsForExportAsync`) now execute sequentially, each awaited before the next starts
- Existing error-checking logic preserved

## Root cause

Three operations sharing the same scoped `DbContext` ran in parallel via `Task.WhenAll` — EF Core throws `InvalidOperationException` ("A second operation was started on this context instance before a previous operation completed").

## Verification

- `dotnet build` — 0 errors
- `dotnet test --filter "~Analytics"` — 19/19 passed
- CSV export endpoint returns HTTP 200 with `Content-Type: text/csv` instead of HTTP 500
- No `Task.WhenAll` or `.Result` property accesses remain in `ExportCsvAsync`
