# Phase 12 Context: Query Optimization & Caching

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary
Focus on server-side performance for analytics endpoints.
- DB indexing for multi-tenant query acceleration.
- EF Core projection tuning (avoid full entity loads).
- Redis caching for expensive analytics aggregations.
</domain>

<decisions>
## Implementation Decisions

### DB Optimization
- **D-15:** Create composite index `(WorkspaceId, Status, PublishedAtUtc)` on `Posts`.
- **D-16:** Create index `(WorkspaceId, CreatedAtUtc)` on `AuditLogs`.
- **D-17:** Use manual `.Select()` projections in `WorkspaceAnalyticsService` to fetch only `Status` and `PublishedAtUtc` from `Posts`. 
- **D-18:** Apply `.AsNoTracking()` to all analytics read queries.

### Caching Strategy
- **D-19:** Implement `IAnalyticsCache` using `IDistributedCache` (Redis).
- **D-20:** Cache serialized DTOs (`WorkspaceAnalyticsSummaryDto`, `HeatmapDto`) rather than raw domain data.
- **D-21:** Set default TTL to **60 minutes**.
- **D-22:** Use cache keys prefixed by tenant and period: `syncra:analytics:{tenantId}:{period}:{type}`.

### Cache Invalidation
- **D-23:** Trigger invalidation of workspace analytics cache only when a post status transitions to `Published` or an `Integration` is deleted.
- **D-24:** Use a "fire-and-forget" approach for invalidation to avoid blocking the main publish flow.
</decisions>

<canonical_refs>
## Canonical References
- `be/src/Syncra.Application/Services/WorkspaceAnalyticsService.cs` (Primary target)
- `be/src/Syncra.Infrastructure/Persistence/AppDbContext.cs` (Index config)
- `be/src/Syncra.Infrastructure/DependencyInjection.cs` (Redis config)
</canonical_refs>

<specifics>
## Specific Notes
- Post table currently has `Include(Media)` in `GetByWorkspaceIdAsync`, which is the main bottleneck.
- Redis is already configured in the project for tenant resolution and idempotency.
</specifics>
