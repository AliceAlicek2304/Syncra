---
status: complete
phase: 13-advanced-analytics-reporting
source: 13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md
started: 2026-05-12T00:00:00Z
updated: 2026-05-12T14:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Export Endpoint Returns CSV
expected: GET /api/v1/workspaces/{workspaceId}/analytics/export?days=30 returns HTTP 200 with Content-Type: text/csv and Content-Disposition: attachment with filename
result: pass

### 2. Default Date Range (30 days)
expected: Calling export with no date params returns data for the last 30 days (end = now, start = now - 30d)
result: pass

### 3. YTD Date Range (days=-1)
expected: Calling export with days=-1 returns data from Jan 1 of current year to now
result: pass

### 4. Custom Date Range
expected: Calling export with start=2026-01-01&end=2026-03-31 returns data for that exact range
result: pass

### 5. Days Precedence Over Custom Dates
expected: When both days=90 and start/end are provided, days=90 takes precedence (last 90 days from now)
result: pass

### 6. CSV Contains 3 Sections
expected: Returned CSV body contains === SUMMARY ===, === HEATMAP ===, and === POSTS === section headers
result: pass

### 7. CSV Escaping of Special Characters
expected: Post titles with commas, quotes, or newlines are properly escaped (wrapped in double quotes, internal quotes doubled)
result: pass

### 8. Error Handling Returns Appropriate Response
expected: When the underlying service fails, endpoint returns HTTP 400 with error details in the response body
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Export endpoint returns CSV with proper content type and filename"
  status: failed
  reason: "User reported: HTTP 500 - InvalidOperationException: A second operation was started on this context instance before a previous operation completed."
  severity: blocker
  test: 1
  root_cause: "AnalyticsExportService.ExportCsvAsync runs GetSummaryAsync, GetHeatmapAsync, and GetPublishedPostsForExportAsync in parallel via Task.WhenAll. All three use IPostRepository which shares a scoped DbContext — EF Core throws concurrency exception."
  artifacts:
    - path: "be/src/Syncra.Application/Services/AnalyticsExportService.cs"
      issue: "Task.WhenAll on 3 operations all using same scoped DbContext via PostRepository"
  missing:
    - "Sequential execution instead of Task.WhenAll in AnalyticsExportService.ExportCsvAsync"
  debug_session: ""
