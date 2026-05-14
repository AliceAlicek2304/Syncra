---
phase: 13-advanced-analytics-reporting
plan: FIX-01
type: execute
wave: 1
depends_on: []
files_modified:
  - be/src/Syncra.Application/Services/AnalyticsExportService.cs
autonomous: true
requirements: [REQ-13.1]
user_setup: []
must_haves:
  truths:
    - "Export endpoint returns HTTP 200 with text/csv content type instead of HTTP 500"
    - "All three export sections (summary, heatmap, posts) are included in the CSV output"
    - "Error handling still works: if any service call fails, the method returns the error Result before building CSV"
  artifacts:
    - path: "be/src/Syncra.Application/Services/AnalyticsExportService.cs"
      provides: "Fixed CSV export service with sequential DbContext access"
      not_contains: "Task.WhenAll"
      not_contains: ".Result"
  key_links:
    - from: "AnalyticsExportService.ExportCsvAsync"
      to: "IWorkspaceAnalyticsService.GetSummaryAsync"
      via: "sequential await"
      pattern: "await.*GetSummaryAsync"
    - from: "AnalyticsExportService.ExportCsvAsync"
      to: "IWorkspaceAnalyticsService.GetHeatmapAsync"
      via: "sequential await"
      pattern: "await.*GetHeatmapAsync"
    - from: "AnalyticsExportService.ExportCsvAsync"
      to: "IPostRepository.GetPublishedPostsForExportAsync"
      via: "sequential await"
      pattern: "await.*GetPublishedPostsForExportAsync"
---

<objective>
Fix EF Core concurrency crash in AnalyticsExportService.ExportCsvAsync.

**Purpose:** Resolve the UAT blocker where parallel Task.WhenAll execution across three operations sharing the same scoped DbContext throws InvalidOperationException ("A second operation was started on this context instance before a previous operation completed").

**Output:** Modified `AnalyticsExportService.cs` — three operations run sequentially, each awaited before the next starts, preserving existing error-checking logic.
</objective>

<execution_context>
@C:/Users/hieu_tai/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/hieu_tai/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/13-advanced-analytics-reporting/13-UAT.md
@be/src/Syncra.Application/Services/AnalyticsExportService.cs
@be/src/Syncra.Application/Interfaces/IWorkspaceAnalyticsService.cs
@be/src/Syncra.Domain/Interfaces/IPostRepository.cs

<gap_context>
**Gap:** Export endpoint returns HTTP 500 — InvalidOperationException due to EF Core concurrency detector.

**Root cause (from UAT):** `AnalyticsExportService.ExportCsvAsync` runs `GetSummaryAsync`, `GetHeatmapAsync`, and `GetPublishedPostsForExportAsync` in parallel via `Task.WhenAll`. All three use `IPostRepository` which shares a scoped `DbContext` — EF Core throws when a second operation starts before the first completes.

**Fix scope:** Single file (`AnalyticsExportService.cs`). Only the `ExportCsvAsync` method body changes. No interface changes, no new files, no new logic.
</gap_context>

<interfaces>
From be/src/Syncra.Application/Interfaces/IWorkspaceAnalyticsService.cs:
```csharp
Task<Result<AnalyticsSummary>> GetSummaryAsync(Guid workspaceId, int days, CancellationToken ct);
Task<Result<List<HeatmapSlot>>> GetHeatmapAsync(Guid workspaceId, int days, CancellationToken ct);
```

From be/src/Syncra.Domain/Interfaces/IPostRepository.cs:
```csharp
Task<List<PostExportDto>> GetPublishedPostsForExportAsync(Guid workspaceId, DateTime startUtc, DateTime endUtc, CancellationToken ct);
```

From be/src/Syncra.Application/Services/AnalyticsExportService.cs (current buggy flow, lines 32-55):
```
var summaryTask = _analyticsService.GetSummaryAsync(…)
var heatmapTask = _analyticsService.GetHeatmapAsync(…)
var postsTask = _postRepository.GetPublishedPostsForExportAsync(…)
await Task.WhenAll(summaryTask, heatmapTask, postsTask)  // ← BUG: parallel on same DbContext

if (summaryTask.Result.IsFailure) …
if (heatmapTask.Result.IsFailure) …

var summary = summaryTask.Result.Value;
var heatmap = heatmapTask.Result.Value;
var posts = postsTask.Result;  // List<PostExportDto>, not Result<T>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert parallel Task.WhenAll to sequential awaits</name>
  <files>
    be/src/Syncra.Application/Services/AnalyticsExportService.cs
  </files>
  <action>
    Modify `ExportCsvAsync` (starting after `var days = ...` line) to execute the three operations sequentially instead of in parallel.

    **Changes to make:**

    1. **Remove** lines 35-39 (the three `var ...Task = ...` declarations and the `await Task.WhenAll(...)` call).

    2. **Replace** with sequential await, in this order:
       - `var summaryResult = await _analyticsService.GetSummaryAsync(workspaceId, days, cancellationToken);`
       - Check failure (same pattern as existing): if `summaryResult.IsFailure` → log and return `Result.Failure<byte[]>(summaryResult.Error!)`.
       - `var heatmapResult = await _analyticsService.GetHeatmapAsync(workspaceId, days, cancellationToken);`
       - Check failure: if `heatmapResult.IsFailure` → log and return `Result.Failure<byte[]>(heatmapResult.Error!)`.
       - `var posts = await _postRepository.GetPublishedPostsForExportAsync(workspaceId, startUtc, endUtc, cancellationToken);`
         Note: `GetPublishedPostsForExportAsync` returns `List<PostExportDto>` (not `Result<T>`), so no `.Result` property access needed.

    3. **Update variable references** in the CSV building section (lines 53-55):
       - `summaryTask.Result.Value` → `summaryResult.Value`
       - `heatmapTask.Result.Value` → `heatmapResult.Value`
       - `postsTask.Result` → `posts` (already used in the foreach loop on line 92)

    4. **Delete** unused `using` directives if any become unused after removing `Task.WhenAll` (shouldn't, since `System.Threading.Tasks` is still used by `Task` in method signatures).

    **What NOT to change:**
    - Do NOT modify any error-handling logic — only change parallel→sequential.
    - Do NOT modify the CSV formatting/building code (lines 57-104).
    - Do NOT modify `CsvEscape`, constructor, field declarations, or class structure.
    - Do NOT modify any other file.
  </action>
  <verify>
    <automated>cd be && dotnet build src/Syncra.Api/Syncra.Api.csproj 2>&1 | Select-String -NotMatch "Warning(s)"</automated>
    <automated>cd be && dotnet test --no-build --filter "AnalyticsExport" 2>&1 | Select-String -Pattern "Failed|passed|skipped"</automated>
  </verify>
  <done>
    - The file compiles without errors
    - No `Task.WhenAll` or `.Result` property accesses remain in `ExportCsvAsync`
    - The three service/repository calls are chained with `await`, each before the next
    - Existing error-checking (`IsFailure` → log + return) is preserved for both summary and heatmap
    - The CSV output content is identical to before (functionally equivalent, just sequential)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| application→DbContext | In-process scoped service — operations must be sequenced to avoid concurrency violation |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-FIX-01 | {D} Denial of Service | AnalyticsExportService.ExportCsvAsync | mitigate | Sequential execution prevents EF Core concurrency exception that previously crashed the request |
| T-13-FIX-02 | {E} Elevation of Privilege | AnalyticsExportService | accept | No privilege boundary crossed — all three operations run under the same auth context already validated at the controller layer |
</threat_model>

<verification>
1. Build succeeds: `dotnet build` without errors
2. Existing analytics export tests pass (if any); otherwise manual curl test confirms HTTP 200 with CSV
3. Grep confirms no `Task.WhenAll` or `.Result` patterns remain in the modified method
</verification>

<success_criteria>
- UAT blocker resolved: `GET /api/v1/workspaces/{workspaceId}/analytics/export?days=30` returns HTTP 200 with `Content-Type: text/csv` instead of HTTP 500
- All 7 previously blocked UAT tests (2-8) now pass
</success_criteria>

<output>
After completion, create `.planning/phases/13-advanced-analytics-reporting/13-FIX-01-SUMMARY.md`
</output>
