# Plan 13-01 Summary: Export DTOs & Repository Extension

## What was built

- **PostExportData.cs** (Domain model) — record with Id, TitlePreview, ContentPreview, PublishedAtUtc, Platform, Status
- **PostExportDto.cs** (Application DTOs) — PostExportDto, ExportSummaryRowDto, ExportHeatmapRowDto, AnalyticsExportDocument
- **IPostRepository.cs** — extended with `GetPublishedPostsForExportAsync`
- **PostRepository.cs** — EF Core implementation with `Include(p => p.Integration)`, filtered by workspace + Published status + date range, ordered descending

## Key decisions

- Used Domain model (`PostExportData`) on the interface to avoid Application→Domain circular dependency
- Title truncated to 100 chars, Content to 150 chars using `Substring` (EF-compatible)
- Platform falls back to "unknown" when Integration is null
- Fully-qualified type names in Domain interface to avoid adding Application references to Domain project

## Build status

`Build succeeded` — 0 errors

## Files changed

| File | Action |
|------|--------|
| `be/src/Syncra.Application/DTOs/Analytics/PostExportDto.cs` | Created |
| `be/src/Syncra.Domain/Models/Analytics/PostExportData.cs` | Created |
| `be/src/Syncra.Domain/Interfaces/IPostRepository.cs` | Modified |
| `be/src/Syncra.Infrastructure/Repositories/PostRepository.cs` | Modified |
