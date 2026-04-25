# Requirements: Stability & Tech Debt (Syncra.NET)

## 1. Security & Reliability

### 1.1 Stripe Webhook Idempotency
- **Requirement:** Ensure Stripe webhooks are processed exactly once.
- **Details:** Implement an `IdempotencyRecord` entity and a service to track `Stripe-Event-Id`. Check this log before processing any webhook event in `StripeWebhookController`.

### 1.2 Global Stripe Configuration Removal
- **Requirement:** Eliminate global state in Stripe service.
- **Details:** Use `RequestOptions` for all Stripe API calls. Inject `StripeOptions` via `IOptions` and use them locally within service methods.

### 1.3 Tenant Resolution Optimization
- **Requirement:** Reduce database load for tenant resolution.
- **Details:** Cache `WorkspaceMember` lookup results in Redis. Implement cache invalidation when workspace membership changes.

## 2. Performance & Architecture

### 2.1 Database-Level Post Filtering
- **Requirement:** Filter posts at the database level.
- **Details:** Refactor `PostRepository.GetFilteredAsync` to use EF Core queryable filtering for `ScheduledAt`. May require mapping the Value Object to a primitive column or using Shadow Properties.

### 2.2 Analytics Error Handling Refactor
- **Requirement:** Improve observability in analytics data fetching.
- **Details:** Replace empty list returns with a `Result<T>` pattern or domain-specific exceptions. Ensure the API returns appropriate HTTP status codes for system vs. data errors.

### 2.3 Environment Logic Decoupling
- **Requirement:** Remove direct dependencies on `ASPNETCORE_ENVIRONMENT`.
- **Details:** Move logic (like Redis TTLs) into the `Options` pattern. Inject `IOptions<RedisOptions>` into `IntegrationAnalyticsService`.

### 2.4 Subscription Plan Lookup
- **Requirement:** Decouple subscription logic from hardcoded GUIDs.
- **Details:** Create an `IPlanService` or repository lookup to map Stripe Price IDs to internal `Plan` entities.

## 3. Observability & Quality

### 3.1 OAuth Refresh Audit
- **Requirement:** Ensure OAuth token health is transparent.
- **Details:** Add health status tracking to `Integration` entity. Log and audit all refresh attempts. Mark integrations as "Broken/NeedsReauth" on persistent failure.

### 3.2 Critical Service Testing
- **Requirement:** Reach >80% coverage for core logic.
- **Details:** Implement unit and integration tests for:
  - `IntegrationAnalyticsService`
  - `StripeWebhookController`
  - `TenantResolutionMiddleware`
  - `PostRepository` (specifically filtering logic)
