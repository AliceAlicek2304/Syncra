# Phase 12: Query Optimization & Caching SPEC

## Goal
Optimize analytics performance and reduce database load through targeted indexing, query projections, and Redis caching.

## Context
Current analytics queries fetch entire entities (including large Media lists) and filter in-memory. Heatmap and Summary data are recalculated on every request, hitting external social APIs and the local DB simultaneously.

## Requirements

### 12.01: Database Indexing
- **Index: `Posts_Workspace_Status_PublishedAt`**
  - Columns: `WorkspaceId`, `Status`, `PublishedAtUtc`
  - Purpose: Accelerate `GetHeatmapAsync` and `GetSummaryAsync` (post count).
- **Index: `AuditLogs_Workspace_Created`**
  - Columns: `WorkspaceId`, `CreatedAtUtc`
  - Purpose: Support future audit-based analytics and history tracking.

### 12.02: Query Projection & Tuning
- **Projections in `WorkspaceAnalyticsService`**:
  - Replace `_postRepository.GetByWorkspaceIdAsync(workspaceId)` (which uses `Include(Media)`) with projected queries.
  - Fetch only required fields: `Status`, `PublishedAtUtc`.
- **AsNoTracking**:
  - Ensure all analytics queries use `.AsNoTracking()` to reduce memory overhead.

### 12.03: Redis Caching
- **Service: `AnalyticsCacheService`**:
  - Implement `IAnalyticsCache`.
  - Keys: `analytics:summary:{workspaceId}:{days}`, `analytics:heatmap:{workspaceId}:{days}`.
  - TTL: 60 minutes.
- **Integration**:
  - Decorate or update `WorkspaceAnalyticsService` to check cache before processing.

### 12.04: Cache Invalidation
- **Trigger**:
  - Invalidate workspace analytics cache when a post is successfully published.
  - Invalidate when integration status changes.

## Success Criteria
- [ ] EF Core Migrations created for indexes.
- [ ] `WorkspaceAnalyticsService` no longer fetches `Media` for summary/heatmap.
- [ ] Redis keys are populated after first request.
- [ ] Integration tests verify cache hit/miss behavior.
- [ ] Response time for cached analytics < 100ms.

## Ambiguity Score: 0.15
- **Technical**: 0.1 (Redis/EF Core patterns well established in repo)
- **Requirements**: 0.2 (Cache invalidation triggers might need refining)
- **Dependencies**: 0.1 (Redis already in stack)
- **Scope**: 0.2 (Avoid scope creep into Phase 13 reporting)
