# Codebase Concerns

**Analysis Date:** 2025-03-20

## Tech Debt

**Analytics Service Error Handling:**
- Issue: `IntegrationAnalyticsService` returns empty lists `new List<AnalyticsData>()` for almost all error conditions (missing integration, adapter not found, token refresh failure, API exceptions). This masks errors from the UI and makes debugging difficult.
- Files: `src/Syncra.Application/Services/IntegrationAnalyticsService.cs`
- Impact: Poor observability; UI cannot distinguish between "no data" and "system failure".
- Fix approach: Throw specific domain exceptions or return a Result object that includes error details.

**In-Memory Filtering in Repository:**
- Issue: `PostRepository.GetFilteredAsync` loads all posts for a workspace into memory before filtering by `ScheduledAt` date range because it's a Value Object.
- Files: `src/Syncra.Infrastructure/Repositories/PostRepository.cs`
- Impact: Potential memory exhaustion and high latency as the number of posts grows.
- Fix approach: Map the Value Object to a database column that EF Core can query directly, or use raw SQL/Computed columns for the filter.

**Hardcoded Plan IDs:**
- Issue: Subscription update logic hardcodes the PRO plan GUID instead of resolving it from Stripe Price IDs.
- Files: `src/Syncra.Application/Features/Subscriptions/Commands/UpdateSubscriptionCommandHandler.cs`
- Impact: Fragile subscription logic; fails if the database seeds different IDs; prevents multiple plan support.
- Fix approach: Implement a lookup service that maps Stripe Price IDs to internal Plan entities.

**Environment Variable Logic in Code:**
- Issue: Cache TTL logic is determined by reading `ASPNETCORE_ENVIRONMENT` directly in the service constructor.
- Files: `src/Syncra.Application/Services/IntegrationAnalyticsService.cs`
- Impact: Violates Clean Architecture by depending on environment details; makes testing harder.
- Fix approach: Move TTL settings to `RedisOptions` and use `IOptions<RedisOptions>`.

## Performance Bottlenecks

**Tenant Resolution Database Hits:**
- Issue: `TenantResolutionMiddleware` performs a database query to `WorkspaceMembers` on every request that includes a workspace header.
- Files: `src/Syncra.Api/Middleware/TenantResolutionMiddleware.cs`
- Impact: Increased latency and database load on every API call.
- Cause: Lack of caching for workspace membership.
- Improvement path: Cache validated user-workspace pairs in Redis with a reasonable TTL.

**Bulk Integration Refresh:**
- Issue: When a single integration token expires during an analytics check, the service triggers a refresh for ALL expiring integrations in the system.
- Files: `src/Syncra.Application/Services/IntegrationAnalyticsService.cs`, `src/Syncra.Application/Interfaces/IIntegrationTokenRefreshService.cs`
- Cause: Coarse-grained refresh logic.
- Improvement path: Implement targeted refresh for a specific integration.

## Security Considerations

**Stripe Webhook Idempotency:**
- Risk: Stripe webhooks may be delivered more than once. The current implementation does not track processed event IDs.
- Files: `src/Syncra.Api/Controllers/StripeWebhookController.cs`
- Current mitigation: None.
- Recommendations: Implement an idempotency log for Stripe event IDs to ensure each event is processed exactly once.

**Global Stripe Configuration:**
- Risk: `StripeConfiguration.ApiKey` is set globally in a service constructor.
- Files: `src/Syncra.Infrastructure/Services/StripeService.cs`
- Current mitigation: None.
- Recommendations: Use `RequestOptions` for each Stripe API call to avoid global state side effects.

## Fragile Areas

**OAuth Refresh Flow:**
- Files: `src/Syncra.Infrastructure/Services/IntegrationTokenRefreshService.cs`, `src/Syncra.Application/Services/IntegrationAnalyticsService.cs`
- Why fragile: Complex retry logic and dependency on external providers. If a refresh fails silently, integrations stay broken until manual intervention.
- Safe modification: Ensure all refresh attempts are audited and failed refreshes mark the integration with a "Needs Re-auth" status.

## Test Coverage Gaps

**Untested Critical Services:**
- What's not tested: `IntegrationAnalyticsService`, `AnalyticsController`, `StripeWebhookController`, `TenantResolutionMiddleware`.
- Files: `src/Syncra.Application/Services/IntegrationAnalyticsService.cs`, `src/Syncra.Api/Controllers/AnalyticsController.cs`, `src/Syncra.Api/Controllers/StripeWebhookController.cs`, `src/Syncra.Api/Middleware/TenantResolutionMiddleware.cs`
- Risk: Regressions in multi-tenancy validation, billing logic, or analytics data fetching may go unnoticed.
- Priority: High

---

*Concerns audit: 2025-03-20*
