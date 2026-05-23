# Phase 25: Account Connect - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to connect and manage social accounts via Zernio Connect OAuth, and establish the complete webhook infrastructure (endpoint, HMAC verification, idempotency) that all subsequent phases depend on. Includes the Connected Accounts settings page and selection UI.

</domain>

<decisions>
## Implementation Decisions

### OAuth Connection Strategy & Syncing
- **D-01:** Implement **Headless Mode** for Zernio Connect. Syncra will build a custom page/component for secondary selection (selecting Facebook Pages, LinkedIn Organization Pages, Pinterest Boards, Google Business Locations, Snapchat Public Profiles). Standard mode is not used.
- **D-02:** When the user completes OAuth authorization, Zernio redirects them back to a **Dedicated Selection Page** (`/social-accounts/select` in the React SPA) with a temporary token.
- **D-03:** **Lazy Profile Provisioning:** If a Syncra workspace has no Zernio profile (the `ZernioProfile` record) when a user attempts to connect their first account, the backend will auto-provision a profile via `IZernioClient.ProvisionProfileAsync` and store it in `zernio_profiles`.
- **D-04:** **Redis State Correlation:** Use a short-lived temporary state in Redis to correlate and validate connection callback requests, keeping track of the target platform and workspace ID.
- **D-05:** **Anti-Corruption Layer:** Downstream controllers and handlers must use the `IZernioClient` abstraction, mapping Zernio SDK models to local application DTOs before returning them to controllers.

### Billing Gate Handling (402 PAYMENT_REQUIRED)
- **D-06:** Return HTTP **402 Payment Required** for Zernio billing gate errors (PAYMENT_REQUIRED code), enclosing the reason (`twitter_passthrough`, `free_tier_exceeded`, `enterprise_required`) and the redirect `dashboard_url` deep-link.
- **D-07:** Throw a custom `ZernioBillingRequiredException` from application services/handlers, which is caught and mapped in the global middleware to HTTP 402 with structured billing metadata.
- **D-08:** Log billing gate triggers as **Warnings in Serilog** (`LogWarning`) for tracing, with no DB persistence.
- **D-09:** **Unified Error UI Overlay:** Display a premium, actionable modal overlay on the frontend settings page when receiving HTTP 402. This modal explains the billing constraint and offers a button to deep-link to Zernio billing or contact page. This overlay is reused during both initial connect redirects and secondary selection billing gates.

### Webhook Processing Flow
- **D-10:** Process webhooks **Asynchronously via Hangfire** background jobs. The controller validates the signature, writes a pending `ZernioWebhookEvent` (idempotency key), enqueues the processing job to Hangfire, and returns HTTP 200 immediately to Zernio to prevent timeouts.
- **D-11:** Validate HMAC-SHA256 signatures using the `X-Zernio-Signature` header via a reusable **Action Filter** (`ZernioWebhookSignatureFilter`) on the webhook controller.
- **D-12:** Webhook deduplication uses a **Redis distributed lock combined with a unique index** on the database `ZernioWebhookEvent.ZernioEventId`. Duplicate events return 200 OK immediately.
- **D-13:** **Automatic Retries + Status updates** in Hangfire. If a background job fails, it automatically retries. If all retries fail, mark the event's status as `Failed` in the DB and save the exception/error details.

### Connected Accounts UX & Deletion
- **D-14:** Query the **Local Database Only** (`social_accounts` table) to display connected social accounts in the settings page for fast page load performance.
- **D-15:** Perform a **Soft Delete/Deactivation** of the local `SocialAccount` record (mark `IsActive = false`) when a user disconnects an account, preserving history.
- **D-16:** **Cancel pending posts** for the disconnected account on deletion and show a clear warning modal to the user before they confirm deletion.
- **D-17:** Display a premium **Grid of Platform Cards** showing connected accounts and platform-specific connect buttons in a 14-platform grid layout.

### The Agent's Discretion
- The exact key schema and TTL (suggested 15 mins) for OAuth state correlation in Redis.
- The styling, icons, and micro-animations of the social account card grid and selection layouts.
- The structure of the Hangfire background job parameters and error logging schema.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Zernio Connect & Webhook APIs
- [zernio-api-documentation.md](file:///D:/Code/Syncra/zernio-api-documentation.md) — Section: Connecting Accounts, Section: Profiles, Section: Webhooks
- [zernio-api-openapi.yaml](file:///D:/Code/Syncra/zernio-api-openapi.yaml) — OpenAPI Schema specs for OAuth callback, WebhookPayloadAccountConnected, and WebhookPayloadAccountDisconnected

### Exception Mapping
- [GlobalExceptionMiddleware.cs](file:///D:/Code/Syncra/be/src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs) — Standard mapping patterns for custom domain exceptions

### Idempotency & Webhook Processing
- [PaymentWebhookOrchestrator.cs](file:///D:/Code/Syncra/be/src/Syncra.Api/Controllers/PaymentWebhookOrchestrator.cs) — Reference for signature verification, Redis distributed locking, and idempotency logic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IZernioClient` and `ZernioClient` — Interfaces and clients established in Phase 24.
- `ZernioProfile` and `SocialAccount` — EF Core domain entities created in Phase 24.
- `RedisDistributedLockService` — Used to orchestrate atomic locks during idempotency checks.
- `GlobalExceptionMiddleware` — Global middleware for intercepting exceptions and mapping them to HTTP status codes.

### Established Patterns
- **Clean Architecture dependency direction:** Domain and Application remain free of the Zernio SDK dependencies; `ZernioClient` acts as the Anti-Corruption Layer in Infrastructure.
- **Hangfire Job Dispatching:** Standard pattern of defining background jobs and enqueuing them synchronously in the HTTP thread for async processing.

### Integration Points
- `be/src/Syncra.Api/Controllers/SocialAccountsController.cs` — [NEW] Controller exposing `/api/social-accounts` endpoints.
- `be/src/Syncra.Api/Controllers/ZernioWebhookController.cs` — [NEW] Controller exposing `/api/zernio/webhook` endpoint.
- `fe/src/pages/Settings/SocialAccounts.tsx` — [NEW] Settings page for listing and managing accounts.
- `fe/src/pages/Settings/SocialAccountsSelect.tsx` — [NEW] Selection page for headless page/org selection.

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-account-connect*
*Context gathered: 2026-05-23*
