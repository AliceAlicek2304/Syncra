# Architecture: Zernio Integration into Syncra.NET

**Project:** Syncra.NET v2.0 — Zernio API Integration
**Researched:** 2026-05-23
**Confidence:** HIGH (full codebase audit + Zernio OpenAPI spec + SDK research)

---

## 1. Decision: Zernio Profile-to-Workspace Mapping

**Decision: 1:1 — one Zernio Profile per Syncra Workspace.**

A Zernio Profile is a "brand container" that groups social accounts. A Syncra Workspace already serves this identical role — it is the multi-tenant boundary for all posts, integrations, and billing.

Creating one Zernio Profile per workspace preserves tenant isolation: no Workspace can ever see or affect another Workspace's Zernio accounts or posts. The alternative (one global Zernio Profile for all of Syncra) would collapse multi-tenancy — querying posts or accounts would require client-side filtering against Zernio's ID space rather than relying on Syncra's own WorkspaceId foreign key.

Sub-profiles per workspace member is unnecessary complexity — Zernio Profiles are for grouping accounts, not users.

**Implementation:** `Workspace` gets a nullable `ZernioProfileId` column. On first Zernio operation for a workspace, Syncra auto-provisions a Zernio Profile via `POST /v1/profiles` and stores the returned `_id`. All subsequent account and post operations for that workspace pass this Profile ID.

---

## 2. New and Modified Entities

### 2.1 Modified: `Workspace`

Add one column:

| Column | Type | Notes |
|--------|------|-------|
| `zernio_profile_id` | `varchar(100)` nullable | Zernio `_id` for the provisioned Profile. Null until first Zernio operation. |

No foreign key to Zernio — this is an opaque external ID. No index needed at this scale; simple column lookup per workspace is sufficient.

### 2.2 New Entity: `SocialAccount`

Replaces the existing `Integration` entity for social platform connections. `Integration` currently stores per-workspace platform OAuth tokens directly. Under Zernio, Syncra no longer manages OAuth tokens for social platforms — Zernio owns the token lifecycle via its Connect flow. Syncra only needs to store the Zernio Account ID and display metadata.

```
Table: social_accounts
  id                  uuid PRIMARY KEY
  workspace_id        uuid NOT NULL FK -> workspaces (cascade delete)
  zernio_account_id   varchar(100) NOT NULL   -- Zernio acc_xxx ID
  platform            varchar(50)  NOT NULL   -- twitter, instagram, linkedin, etc.
  username            varchar(200)
  display_name        varchar(200)
  profile_picture_url varchar(2000)
  is_active           bool NOT NULL default true
  connected_at_utc    timestamptz
  disconnected_at_utc timestamptz             -- set on account.disconnected webhook
  created_at_utc      timestamptz NOT NULL
  updated_at_utc      timestamptz
  deleted_at_utc      timestamptz             -- soft delete

  UNIQUE (workspace_id, zernio_account_id)
  INDEX  (workspace_id, platform, is_active)
```

`SocialAccount` does NOT store OAuth tokens — Zernio owns those. The `zernio_account_id` is the only handle needed to call any Zernio API operation on behalf of that account.

**Migration note:** The existing `Integration` entity and `integrations` table are NOT deleted in v2.0. Legacy posts with `IntegrationId != null` continue using the old publish path. New posts use the Zernio path. Full removal of `Integration` is a post-v2.0 cleanup once the Zernio path is validated in production.

### 2.3 New Entity: `PostPlatformTarget`

The current `Post` entity models single-platform posting (`Post.IntegrationId`). Zernio posts target multiple accounts in one API call and fire per-platform events as each platform terminates. Syncra needs normalized per-platform tracking.

```
Table: post_platform_targets
  id                  uuid PRIMARY KEY
  post_id             uuid NOT NULL FK -> posts (cascade delete)
  social_account_id   uuid NOT NULL FK -> social_accounts
  platform            varchar(50)  NOT NULL
  zernio_account_id   varchar(100) NOT NULL
  status              varchar(50)  NOT NULL default 'pending'
    -- pending | published | failed
  platform_post_id    varchar(200)           -- platform-native post ID after publish
  published_url       varchar(2000)
  error               varchar(500)
  published_at_utc    timestamptz
  created_at_utc      timestamptz NOT NULL
  updated_at_utc      timestamptz

  INDEX (post_id, platform)
  INDEX (social_account_id, status)
```

Each `post.platform.published` or `post.platform.failed` webhook event updates exactly one row in this table. This avoids read-modify-write on a jsonb blob under concurrent webhook delivery and supports per-platform analytics queries.

`Post` gets two new columns:

| Column | Type | Notes |
|--------|------|-------|
| `zernio_post_id` | `varchar(100)` nullable | Zernio post `_id`. Null for legacy posts using old adapters. |
| `target_count` | `int` nullable | Number of platform targets (denormalized for quick status display). |

### 2.4 New Entity: `ZernioWebhookEvent`

Idempotency for Zernio webhooks, following the `IdempotencyRecord` pattern proven for Stripe:

```
Table: zernio_webhook_events
  id               uuid PRIMARY KEY
  zernio_event_id  varchar(200) NOT NULL  -- payload.id (stable across retries)
  event_type       varchar(100) NOT NULL  -- post.published, account.connected, etc.
  status           varchar(50)  NOT NULL  -- pending, success, failure, permanent_failure
  attempt_count    int NOT NULL default 0
  last_error       text
  processed_at_utc timestamptz
  created_at_utc   timestamptz NOT NULL

  UNIQUE (zernio_event_id)
```

A dedicated table (rather than reusing `IdempotencyRecord`) keeps social and payment concerns separate and allows independent retention policies (Zernio's webhook docs show logs are deleted after 7 days; Syncra's record can survive longer for audit).

---

## 3. IZernioClient: Abstraction Pattern

The Zernio .NET SDK (`dotnet add package Zernio`) is auto-generated from the OpenAPI spec and provides individual API classes: `PostsApi`, `AccountsApi`, `ProfilesApi`, `ConnectApi`, `AnalyticsApi`, `WebhooksApi`, `MessagesApi`, etc. There is no built-in unified interface — each class takes a `Configuration { AccessToken, BasePath }` object.

**Pattern: Define `IZernioClient` in `Syncra.Application.Interfaces` and wrap the SDK classes in a concrete `ZernioClient` in Infrastructure.** This mirrors `IPaymentProvider` / `StripePaymentProvider`.

```csharp
// Syncra.Application/Interfaces/IZernioClient.cs
public interface IZernioClient
{
    // Profiles
    Task<ZernioProfileResult> CreateProfileAsync(string name, CancellationToken ct = default);
    Task<ZernioProfileResult> GetProfileAsync(string profileId, CancellationToken ct = default);

    // Accounts
    Task<IReadOnlyList<ZernioAccountResult>> ListAccountsAsync(string profileId, CancellationToken ct = default);

    // Connect (OAuth delegation)
    Task<string> GetConnectUrlAsync(string platform, string profileId, string callbackUrl, CancellationToken ct = default);

    // Posts
    Task<ZernioPostResult> CreatePostAsync(ZernioCreatePostRequest request, CancellationToken ct = default);
    Task<ZernioPostResult> GetPostAsync(string postId, CancellationToken ct = default);
    Task DeletePostAsync(string postId, CancellationToken ct = default);

    // Analytics
    Task<ZernioPostAnalyticsResult> GetPostAnalyticsAsync(string postId, CancellationToken ct = default);
    Task<ZernioAccountAnalyticsResult> GetAccountAnalyticsAsync(string accountId, string platform, DateOnly since, DateOnly until, CancellationToken ct = default);

    // Webhooks management
    Task<ZernioWebhookResult> RegisterWebhookAsync(string url, IReadOnlyList<string> events, string secret, CancellationToken ct = default);
    Task DeleteWebhookAsync(string webhookId, CancellationToken ct = default);
}
```

**DI registration in `Syncra.Infrastructure.Zernio`:**

```csharp
// In Syncra.Infrastructure/Zernio/DependencyInjection.cs
public static IServiceCollection AddZernioIntegration(
    this IServiceCollection services, IConfiguration configuration)
{
    services.Configure<ZernioOptions>(configuration.GetSection(ZernioOptions.SectionName));

    var retryPolicy = HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));
    var timeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(15));

    services.AddHttpClient<IZernioClient, ZernioClient>()
        .AddPolicyHandler(retryPolicy)
        .AddPolicyHandler(timeoutPolicy);

    return services;
}
```

**Options:**
```csharp
public class ZernioOptions
{
    public const string SectionName = "Zernio";
    public string ApiKey { get; set; } = string.Empty;          // sk_...
    public string BaseUrl { get; set; } = "https://zernio.com/api";
    public string WebhookSecret { get; set; } = string.Empty;   // HMAC key
}
```

`ApiKey` and `WebhookSecret` must be added to `SensitiveDataDestructuringPolicies` so they are redacted in all Serilog output. Both should be stored in `appsettings.{Environment}.json` (gitignored) or environment secrets — never in source control.

**Scope:** `IZernioClient` registered as `Scoped`. The SDK API classes are cheap to construct per-request and `Scoped` aligns with all other service registrations in this codebase.

---

## 4. Webhook Handling Architecture

### 4.1 Endpoint

New dedicated controller at `POST /api/zernio/webhook`. Must NOT be behind JWT authentication (Zernio cannot send a Syncra JWT).

```csharp
[ApiController]
[Route("api/zernio/webhook")]
public class ZernioWebhookController : ControllerBase
{
    private readonly ZernioWebhookOrchestrator _orchestrator;

    public ZernioWebhookController(ZernioWebhookOrchestrator orchestrator)
        => _orchestrator = orchestrator;

    [HttpPost]
    public async Task<IActionResult> Index(CancellationToken ct)
    {
        var payload = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(ct);
        var headers = Request.Headers
            .ToDictionary(h => h.Key, h => h.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        return await _orchestrator.ProcessAsync(payload, headers, ct);
    }
}
```

### 4.2 Signature Verification

HMAC-SHA256. Verify before any processing. Return `400` on failure (not `401` — Zernio treats 4xx as delivery failure and stops retrying; use `200` only when genuinely processed or skipped as duplicate).

```csharp
// IZernioWebhookSignatureVerifier.cs
public interface IZernioWebhookSignatureVerifier
{
    bool Verify(string payload, string signatureHeader);
}

// ZernioWebhookSignatureVerifier.cs
public sealed class ZernioWebhookSignatureVerifier : IZernioWebhookSignatureVerifier
{
    private readonly ZernioOptions _options;

    public bool Verify(string payload, string signatureHeader)
    {
        var key = Encoding.UTF8.GetBytes(_options.WebhookSecret);
        var data = Encoding.UTF8.GetBytes(payload);
        var expected = HMACSHA256.HashData(key, data);

        if (!Convert.TryFromBase64String(signatureHeader, new byte[64], out _))
            return false; // header is hex, not base64 — adjust as per Zernio spec

        var received = Convert.FromHexString(signatureHeader);
        return CryptographicOperations.FixedTimeEquals(expected, received);
    }
}
```

### 4.3 Orchestrator: ZernioWebhookOrchestrator

Modeled directly after `PaymentWebhookOrchestrator`. Same Redis lock + `ZernioWebhookEvent` idempotency pattern:

1. Verify signature → 400 on failure.
2. Deserialize `payload.id` (event ID) and `payload.event` (event type).
3. Acquire Redis distributed lock: `zernio_webhook_lock:{eventId}`.
4. Check `ZernioWebhookEvent` table for existing record by `zernio_event_id`.
   - `Success` → return 200 immediately (already processed).
   - `PermanentFailure` → return 200 (stop retries).
   - Not found → insert new `Pending` record.
5. Dispatch to `IZernioWebhookEventDispatcher`.
6. Update record to `Success` or `Failure`.
7. Return 200 (on success or permanent failure) or 500 (on transient failure, triggers Zernio retry).

### 4.4 Event Routing

| Zernio Event | Domain Action |
|---|---|
| `post.published` | `Post.MarkPublishSuccess(...)`, update all `PostPlatformTarget` rows to `published` |
| `post.failed` | `Post.MarkPublishFailure(...)`, update all pending `PostPlatformTarget` rows to `failed` |
| `post.partial` | `Post.TransitionTo(Partial)` — add `Partial` to `PostStatus` enum — update individual rows |
| `post.platform.published` | Update single `PostPlatformTarget` row, fire SignalR notification to workspace |
| `post.platform.failed` | Update single `PostPlatformTarget` row, log structured error |
| `account.connected` | Upsert `SocialAccount` row with platform, username, displayName from webhook payload |
| `account.disconnected` | Set `SocialAccount.IsActive = false`, `DisconnectedAtUtc = now` |
| `message.received` | Forward to Inbox service (Phase E — ZERNIO-06) |
| `comment.received` | Forward to Inbox service (Phase E — ZERNIO-06) |

Implement `IZernioWebhookEventDispatcher` as an interface with concrete per-event handlers registered in DI. Event handlers are resolved by event type string at dispatch time.

### 4.5 Middleware Interaction

The `RequestBodyRedactionMiddleware` runs before the controller but does not consume `Request.Body` — it reads and logs a copy, then rewinds the stream. The webhook controller reads `Request.Body` directly. This is identical to how `StripeWebhookController` works.

`TenantResolutionMiddleware` resolves `WorkspaceId` from the `X-Workspace-Id` header. Zernio webhooks do not send this header. The middleware must skip tenant resolution for `/api/zernio/webhook` — or, since the middleware checks for the header's presence before resolving, it will simply leave `WorkspaceId` as default (which is acceptable for the webhook endpoint since the orchestrator resolves workspace via `zernio_account_id` or `zernio_post_id` lookups internally).

---

## 5. Component Boundaries and Layer Placement

```
Syncra.Domain
  Entities/
    SocialAccount.cs         — new
    PostPlatformTarget.cs    — new
    ZernioWebhookEvent.cs    — new
  Enums/
    PostPlatformStatus.cs    — pending | published | failed
    PostStatus.cs            — add Partial to existing enum
  Interfaces/
    IZernioClient.cs         — new (abstraction lives in Application, same as IPaymentProvider)

Syncra.Application
  Interfaces/
    IZernioClient.cs              — new interface
    IZernioWebhookEventDispatcher.cs — new
  Features/
    SocialAccounts/
      Commands/ConnectSocialAccountCommand.cs    — returns authUrl
      Commands/DisconnectSocialAccountCommand.cs
      Queries/ListSocialAccountsQuery.cs
    Posts/
      Commands/CreateZernioPostCommand.cs        — new, calls IZernioClient
      Commands/DeleteZernioPostCommand.cs
    Analytics/
      Queries/GetZernioPostAnalyticsQuery.cs     — extends existing pattern
    Webhooks/
      ZernioWebhookEventDispatcher.cs
      Handlers/
        PostPublishedHandler.cs
        PostFailedHandler.cs
        PostPlatformPublishedHandler.cs
        AccountConnectedHandler.cs
        AccountDisconnectedHandler.cs

Syncra.Infrastructure
  Zernio/
    ZernioClient.cs               — IZernioClient implementation (wraps SDK API classes)
    ZernioOptions.cs
    ZernioWebhookSignatureVerifier.cs
    DependencyInjection.cs        — AddZernioIntegration()
  Persistence/
    AppDbContext.cs               — add DbSet<SocialAccount>, DbSet<PostPlatformTarget>, DbSet<ZernioWebhookEvent>
    Configurations/
      SocialAccountConfiguration.cs
      PostPlatformTargetConfiguration.cs
      ZernioWebhookEventConfiguration.cs

Syncra.Api
  Controllers/
    ZernioWebhookController.cs    — new (unauthenticated)
    SocialAccountsController.cs   — new (JWT auth + X-Workspace-Id)
  Controllers/
    ZernioWebhookOrchestrator.cs  — new (mirrors PaymentWebhookOrchestrator)
```

---

## 6. Connect Flow (Zernio OAuth Delegation)

Zernio Connect replaces Syncra's direct OAuth providers (X, TikTok, YouTube, Facebook). The flow:

1. Frontend calls `POST /api/v1/social-accounts/connect` with `{ platform }` and `X-Workspace-Id` header.
2. Backend:
   a. Ensures `Workspace.ZernioProfileId` is populated — auto-provision via `IZernioClient.CreateProfileAsync(workspace.Name)` if null, persist immediately.
   b. Calls `IZernioClient.GetConnectUrlAsync(platform, profileId, callbackUrl)`.
   c. Returns `{ authUrl }` to frontend.
3. Frontend redirects user to `authUrl` (Zernio-hosted OAuth page).
4. Zernio completes OAuth with the platform and redirects to Syncra's `callbackUrl`.
5. Zernio fires `account.connected` webhook to Syncra's webhook endpoint.
6. Webhook handler upserts `SocialAccount` row in Syncra's database.
7. Frontend polls `GET /api/v1/social-accounts` (or SignalR notification) to confirm connection.

Syncra's existing `IOAuthProvider` and `ISocialProvider` implementations for X/TikTok/YouTube/Facebook are deprecated but not deleted — they handle legacy posts that still reference `Integration` rows.

---

## 7. Post Scheduling Flow (Zernio Path)

```
User → POST /api/v1/posts
  body: { content, scheduledAt, socialAccountIds: [uuid, uuid] }

PostsController → CreateZernioPostCommand
  1. Load SocialAccount entities for the provided workspace-scoped IDs
  2. Validate: all accounts are active, belong to workspace
  3. Create Post entity (Draft → Scheduled) — existing domain behavior
  4. Create PostPlatformTarget rows (status = pending)
  5. Call IZernioClient.CreatePostAsync({
       profileId: workspace.ZernioProfileId,
       content,
       scheduledFor,
       platforms: [{ platform, accountId: zernio_account_id }]
     })
  6. Store zernio_post_id on Post entity
  7. Commit via IUnitOfWork
  8. Return 201 Created

Zernio (async) → publishes at scheduled time
  → fires post.platform.published per account → handler updates PostPlatformTarget
  → fires post.published when all done → handler updates Post.Status = Published
  → fires post.failed if all fail → handler updates Post.Status = Failed
```

**Key invariant:** Syncra is the source of truth for schedule intent and post content. Zernio is the executor and the post-status notifier. Post status in Syncra is driven entirely by incoming webhooks — no polling.

The existing Hangfire `DuePostPublishJobScheduler` remains for legacy posts (those with `IntegrationId`) and can be deprecated once legacy posts age out.

---

## 8. Build Order for Phases

Dependencies are strict — each phase unlocks the next:

### Phase A: Foundation (ZERNIO-01)
**No user-facing features; required by everything else.**
- `dotnet add package Zernio` to Infrastructure project
- `ZernioOptions` + secrets setup
- `IZernioClient` interface + `ZernioClient` SDK wrapper
- `AddZernioIntegration()` DI extension
- `Workspace.ZernioProfileId` migration
- `SocialAccount` entity + migration
- Workspace profile auto-provision logic
- Sensitive data redaction for `ApiKey` + `WebhookSecret`

### Phase B: Account Connect (ZERNIO-04)
**Depends on: Phase A**
- `ZernioWebhookController` + `ZernioWebhookOrchestrator`
- `IZernioWebhookSignatureVerifier` implementation
- `ZernioWebhookEvent` entity + migration
- `account.connected` + `account.disconnected` webhook handlers
- `SocialAccountsController`: connect (returns authUrl), list, disconnect

### Phase C: Post Scheduling (ZERNIO-02)
**Depends on: Phase B** (need `SocialAccount` rows before creating posts)
- `PostPlatformTarget` entity + migration
- `Post.ZernioPostId` + `Post.TargetCount` columns migration
- `CreateZernioPostCommand` + handler
- `post.published` / `post.failed` / `post.partial` / `post.platform.*` webhook handlers
- Extend `PostsController` to accept `socialAccountIds[]` array

### Phase D: Analytics (ZERNIO-03)
**Depends on: Phase C** (posts must exist before metrics are meaningful)
- `IZernioClient` analytics methods
- Extend `GetPostAnalyticsQueryHandler` to call Zernio analytics
- Extend existing `AnalyticsCacheService` (Redis) with Zernio analytics cache keys
- Per-platform analytics from Zernio via `GetAccountAnalyticsAsync`

### Phase E: Inbox (ZERNIO-06)
**Depends on: Phase B** (needs `SocialAccount`; no dependency on C or D)
- `message.received` + `comment.received` webhook handlers
- `InboxController` (conversations, messages, replies)
- Can be developed in parallel with Phase D

### Phase F: Broadcasts and Sequences (ZERNIO-07)
**Depends on: Phase E** (requires contacts/conversation model from Inbox)
- `BroadcastsController`, `SequencesController`
- Zernio Contacts sync

**Phase ordering rationale:**

- A before everything: `IZernioClient` is called in every subsequent phase.
- B before C: `CreatePostAsync` requires Zernio account IDs which only exist after `account.connected` webhook handling is in place.
- C before D: Analytics without published posts is a no-op; the webhook infrastructure from B is reused in C.
- D and E can run in parallel: analytics is read-only Zernio calls; inbox is a separate Zernio API surface.
- F after E: Broadcasts send messages to contacts; contacts are created/discovered by inbox webhooks.

---

## 9. Deprecation Path for Existing Adapters

Existing components to deprecate (not delete) in v2.0:

| Component | Status | Deprecation Trigger |
|-----------|--------|---------------------|
| `XPublishAdapter`, `TikTokPublishAdapter`, `YouTubePublishAdapter`, `FacebookPublishAdapter` | Deprecated in v2.0 | Remove when all workspaces migrated to Zernio path |
| `XOAuthProvider`, `TikTokOAuthProvider`, `YouTubeProvider`, `FacebookProvider` | Deprecated in v2.0 | Remove with adapters above |
| `Integration` entity + `integrations` table | Retained in v2.0 | Remove in v3.0 after migration window |
| `Post.IntegrationId` FK | Nullable, retained | Remove after all posts reference `ZernioPostId` |
| `DuePostPublishJobScheduler` (Hangfire) | Retained for legacy posts | Deprecate when legacy `Integration`-based posts age out |
| `IProviderRegistry`, `IPublishAdapterRegistry`, `IAnalyticsAdapterRegistry` | Retained | Remove with adapters |

Route in `IPublishService`: if `Post.ZernioPostId != null` → already published via Zernio. If `Post.IntegrationId != null` → use legacy adapter path. This dual-path exists only during transition.

---

## 10. Logging and Observability

- Add `ZernioOptions` to `SensitiveDataDestructuringPolicies` (log `[REDACTED]` for `ApiKey` and `WebhookSecret`).
- `IZernioClient` calls: `Debug` level with `{ZernioOperation}` property. Failures: `Warning` for 4xx (caller error), `Error` for 5xx or timeout.
- Webhook receipt: `Information` with `{ZernioEventId}` and `{ZernioEventType}` structured properties.
- Webhook processing: `Information` on success, `Warning` on duplicate, `Error` on handler exception.
- `ZernioWebhookEvent` table provides durable audit trail. Retention: keep at minimum 30 days (same as `IdempotencyRecord`).
- Rate limit headers (`X-RateLimit-Remaining`) from Zernio API responses should be logged at `Debug` level to catch approaching limits before they affect users.

---

## Sources

- Zernio OpenAPI spec v1.0.4: `D:\Code\Syncra\zernio-api-openapi.yaml`
- Zernio API documentation: `D:\Code\Syncra\zernio-api-documentation.md`
- Zernio .NET SDK: https://github.com/zernio-dev/zernio-dotnet (auto-generated via OpenAPI Generator, individual `*Api` classes, no built-in unified interface)
- Syncra codebase reviewed: `PaymentWebhookOrchestrator.cs`, `IPaymentProvider.cs`, `StripePaymentProvider.cs`, `Post.cs`, `Integration.cs`, `AppDbContext.cs`, `Social/DependencyInjection.cs`, `PostConfiguration.cs`, `IntegrationConfiguration.cs`, `WorkspaceConfigurations.cs`, `Program.cs`, `DependencyInjection.cs`
