# Technology Stack: Zernio API Integration

**Project:** Syncra.NET v2.0 Zernio API Integration
**Researched:** 2026-05-23
**Confidence:** HIGH (NuGet + GitHub SDK source verified, existing codebase read directly)

---

## New NuGet Packages Required

### Syncra.Infrastructure — ONE new package

| Package | Version | Target Project | Purpose | Why |
|---------|---------|---------------|---------|-----|
| `Zernio` | `0.0.281` | `Syncra.Infrastructure` | Official .NET SDK for Zernio REST API | OpenAPI-generated typed client targeting net8.0. Provides `PostsApi`, `AnalyticsApi`, `MessagesApi`, `ConnectApi`, `WebhooksApi`, `BroadcastsApi`, `SequencesApi`, `ContactsApi`, and 50+ other API classes. Each class implements a typed interface (`IPostsApi`, `IAnalyticsApi`, etc.). |

**No other new packages are needed.** All other required capabilities already exist in the stack. See the "Do Not Add" section for details.

The `Zernio` package installs three transitive dependencies automatically — no direct reference needed:

| Transitive Package | Version | Note |
|-------------------|---------|------|
| `Newtonsoft.Json` | 13.0.3 | Used internally by the SDK for serialization. Syncra's own new code should continue to use `System.Text.Json`. |
| `JsonSubTypes` | 2.0.1 | Polymorphic model deserialization inside the SDK. Not used directly. |
| `Polly` | 8.1.0 | SDK's own retry primitives. Compatible with the existing Polly usage via `Microsoft.Extensions.Http.Polly`. |

---

## What the Zernio .NET SDK Provides vs What to Build Manually

### SDK Provides (HIGH confidence — verified from GitHub source at `github.com/zernio-dev/zernio-dotnet`)

The SDK is auto-generated from the OpenAPI spec. Each API tag becomes one typed class. The classes relevant to v2.0 requirements:

| SDK Class | Interface | Key Async Methods |
|-----------|-----------|-------------------|
| `PostsApi` | `IPostsApi` | `CreatePostAsync`, `ListPostsAsync`, `GetPostAsync`, `DeletePostAsync`, `RetryPostAsync`, `UpdatePostAsync`, `BulkUploadPostsAsync` |
| `AnalyticsApi` | `IAnalyticsApi` | `GetAnalyticsAsync`, `GetDailyMetricsAsync`, `GetBestTimeToPostAsync`, `GetFollowerStatsAsync`, `GetInstagramAccountInsightsAsync`, `GetTikTokAccountInsightsAsync`, `GetYouTubeChannelInsightsAsync`, `GetLinkedInAggregateAnalyticsAsync`, `GetFacebookPageInsightsAsync`, `GetGoogleBusinessPerformanceAsync` |
| `ConnectApi` | `IConnectApi` | `GetConnectUrlAsync`, `HandleOAuthCallbackAsync`, `ListFacebookPagesAsync`, `ListLinkedInOrganizationsAsync`, `ConnectBlueskyCredentialsAsync`, `ConnectWhatsAppCredentialsAsync` |
| `WebhooksApi` | `IWebhooksApi` | `CreateWebhookSettingsAsync`, `GetWebhookSettingsAsync`, `UpdateWebhookSettingsAsync`, `DeleteWebhookSettingsAsync`, `TestWebhookAsync` |
| `MessagesApi` | `IMessagesApi` | `ListInboxConversationsAsync`, `GetInboxConversationAsync`, `GetInboxConversationMessagesAsync`, `SendInboxMessageAsync`, `MarkConversationReadAsync`, `UploadMediaDirectAsync` |
| `CommentsApi` | `ICommentsApi` | List comments, reply to comments across platforms |
| `ReviewsApi` | `IReviewsApi` | List reviews, reply to reviews (Google Business + Facebook) |
| `BroadcastsApi` | `IBroadcastsApi` | `CreateBroadcastAsync`, `AddBroadcastRecipientsAsync`, `SendBroadcastAsync`, `ScheduleBroadcastAsync`, `CancelBroadcastAsync`, `ListBroadcastsAsync` |
| `SequencesApi` | `ISequencesApi` | `CreateSequenceAsync`, `ActivateSequenceAsync`, `EnrollContactsAsync`, `PauseSequenceAsync`, `ListEnrollmentsAsync` |
| `ContactsApi` | `IContactsApi` | `ListContactsAsync`, `CreateContactAsync`, `BulkCreateContactsAsync`, `UpdateContactAsync` |
| `AccountsApi` | `IAccountsApi` | `ListAccountsAsync`, `GetAccountAsync` |
| `ProfilesApi` | `IProfilesApi` | `CreateProfileAsync`, `ListProfilesAsync`, `GetProfileAsync`, `DeleteProfileAsync` |

All methods have both sync and async variants. All methods also have `WithHttpInfo` variants that return `ApiResponse<T>`, which exposes response headers including `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `X-Zernio-Event-Id`.

**Constructor pattern** (same for all API classes):

```csharp
// Best constructor for DI — takes HttpClient from IHttpClientFactory
PostsApi(HttpClient client, Zernio.Client.Configuration configuration, HttpClientHandler? handler = null)
```

The SDK does NOT register itself into the ASP.NET Core DI container. It must be wrapped.

### Must Build Manually

| Requirement | Why the SDK Does Not Provide It | Build Plan |
|-------------|--------------------------------|------------|
| `IZernioClient` abstraction facade | SDK exposes 60+ separate API classes with no unified entry point. A facade prevents leaking SDK types into application/domain layers. | Interface in `Syncra.Application/Interfaces/`, implementation in `Syncra.Infrastructure/Social/Zernio/` |
| Webhook signature verification | `WebhooksApi` only manages webhook configuration (CRUD). Incoming webhook request verification must be implemented server-side. | New `ZernioWebhookController` + `ZernioWebhookVerifier` using `HMACSHA256` (see pattern below) |
| Webhook payload dispatch + Hangfire enqueue | The SDK has no concept of inbound webhook handling. | `ZernioWebhookOrchestrator` class, following existing `PaymentWebhookOrchestrator` pattern |
| Multi-tenant profileId/accountId scoping | SDK is single-key; multi-tenant scoping is done by passing `profileId` and `accountId` per call. | Store Zernio `profileId` and `accountId` values in the existing `Integration` entity or a new `ZernioAccount` entity in EF Core |
| Idempotency on inbound webhook events | SDK has no dedup logic. | Reuse `IDistributedLockService` + `RedisDistributedLockService` with `X-Zernio-Event-Id` as the dedup key — identical to the Stripe idempotency pattern |
| Rate limit header tracking | Available in `ApiResponse<T>.Headers` but not surfaced automatically. | Read headers selectively in service methods; log warnings when `X-RateLimit-Remaining` < 50 |
| Feature flag for gradual migration | Parallel-run old providers and Zernio during transition. | `ZernioOptions.UseZernio` boolean (or per-platform list). Remove after all platforms validated. |

---

## Configuration

### New Options Class

Add to `Syncra.Application/Options/ZernioOptions.cs`:

```csharp
namespace Syncra.Application.Options;

public class ZernioOptions
{
    public const string SectionName = "Zernio";

    /// <summary>Zernio API key (sk_ prefix). Store in User Secrets or env var, not appsettings.json.</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>HMAC-SHA256 secret configured on the Zernio webhook endpoint. Used to verify X-Zernio-Signature.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>Override only for local testing via a proxy. Default: https://zernio.com/api</summary>
    public string BaseUrl { get; set; } = "https://zernio.com/api";

    /// <summary>Per-request timeout in seconds for Zernio API calls.</summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>Temporary feature flag. Set true to route through Zernio instead of direct platform providers.</summary>
    public bool UseZernio { get; set; } = false;
}
```

### appsettings.json Additions (skeleton only — real values go in User Secrets)

```json
{
  "Zernio": {
    "ApiKey": "",
    "WebhookSecret": "",
    "BaseUrl": "https://zernio.com/api",
    "TimeoutSeconds": 30,
    "UseZernio": false
  }
}
```

Populate real values using the same User Secrets pattern already in use for Stripe and Postmark (`UserSecretsId: 8d72eb31-6552-47d8-90f7-a398e0dee443` is already set in `Syncra.Api.csproj`).

---

## DI Registration

Add a new extension method in `Syncra.Infrastructure/Social/Zernio/DependencyInjection.cs` (follow the same file structure as `Syncra.Infrastructure/Social/DependencyInjection.cs`). Call it from the main `AddInfrastructureServices` next to `AddSocialIntegrations`.

```csharp
// In Syncra.Infrastructure/Social/Zernio/DependencyInjection.cs
public static IServiceCollection AddZernioServices(this IServiceCollection services, IConfiguration configuration)
{
    services.Configure<ZernioOptions>(configuration.GetSection(ZernioOptions.SectionName));
    var opts = configuration.GetSection(ZernioOptions.SectionName).Get<ZernioOptions>() ?? new ZernioOptions();

    // Resilience policies — same pattern as the existing social provider registrations
    var retryPolicy = HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));

    var timeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(opts.TimeoutSeconds));

    // Named HttpClient — used to construct SDK instances via IHttpClientFactory
    services.AddHttpClient("Zernio", client =>
    {
        client.BaseAddress = new Uri(opts.BaseUrl);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", opts.ApiKey);
        client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds + 10);
    })
    .AddPolicyHandler(retryPolicy)
    .AddPolicyHandler(timeoutPolicy);

    // Application-level abstractions
    services.AddScoped<IZernioPostService, ZernioPostService>();
    services.AddScoped<IZernioAnalyticsService, ZernioAnalyticsService>();
    services.AddScoped<IZernioInboxService, ZernioInboxService>();
    services.AddScoped<IZernioConnectService, ZernioConnectService>();
    services.AddScoped<IZernioBroadcastService, ZernioBroadcastService>();
    services.AddScoped<IZernioWebhookSettingsService, ZernioWebhookSettingsService>();

    return services;
}
```

### SDK Instance Construction Inside Service Classes

Each service class constructs the SDK API class using the named HttpClient from `IHttpClientFactory`. This follows how `GoogleAuthProvider` is constructed today:

```csharp
// Example: ZernioPostService constructor
public ZernioPostService(IHttpClientFactory httpClientFactory, IOptions<ZernioOptions> options, ILogger<ZernioPostService> logger)
{
    var httpClient = httpClientFactory.CreateClient("Zernio");
    var config = new Zernio.Client.Configuration
    {
        BasePath = options.Value.BaseUrl,
        AccessToken = options.Value.ApiKey
    };
    _api = new PostsApi(httpClient, config);
    _logger = logger;
}
```

---

## Webhook Verification Pattern

Zernio uses HMAC-SHA256 of the raw request body keyed by the webhook secret, delivered as lowercase hex in `X-Zernio-Signature`. This is structurally identical to the Stripe webhook signature pattern already in the codebase.

Build `ZernioWebhookController` following the same pattern as `StripeWebhookController`:

```csharp
[ApiController]
[Route("api/zernio/webhook")]
public class ZernioWebhookController : ControllerBase
{
    private readonly ZernioWebhookOrchestrator _orchestrator;
    public ZernioWebhookController(ZernioWebhookOrchestrator orchestrator) => _orchestrator = orchestrator;

    [HttpPost]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        using var reader = new StreamReader(HttpContext.Request.Body);
        var rawBody = await reader.ReadToEndAsync(ct);

        // Primary header; fall back to legacy alias X-Late-Signature
        var signature = Request.Headers["X-Zernio-Signature"].FirstOrDefault()
                     ?? Request.Headers["X-Late-Signature"].FirstOrDefault();
        var eventId = Request.Headers["X-Zernio-Event-Id"].FirstOrDefault()
                   ?? Request.Headers["X-Late-Event-Id"].FirstOrDefault();

        return await _orchestrator.ProcessAsync(rawBody, signature, eventId, ct);
    }
}
```

`ZernioWebhookOrchestrator` verifies signature (constant-time compare via `CryptographicOperations.FixedTimeEquals`), deduplicates by `eventId` using `IDistributedLockService`, and enqueues a Hangfire background job. The controller returns `200 OK` immediately to satisfy Zernio's 5-second delivery window.

---

## Existing Code to Reuse vs Replace

### Reuse Without Modification

| Component | Location | How Zernio Integration Uses It |
|-----------|----------|-------------------------------|
| `IDistributedLockService` / `RedisDistributedLockService` | `Infrastructure/Services/` | Webhook event dedup — lock on `X-Zernio-Event-Id` |
| `IdempotencyFilter` | `Api/Filters/` | Idempotent mutations in Syncra's own API endpoints |
| Hangfire job infrastructure | `Api/DependencyInjection.cs` + `Infrastructure/Jobs/` | Background processing of webhook payloads |
| Polly retry policy pattern | `Infrastructure/Social/DependencyInjection.cs` | Identical policy for Zernio HTTP client |
| `IOptions<T>` config binding | All services | `ZernioOptions` binds the same way as `StripeOptions` |
| Serilog structured logging | Pervasive | All Zernio service classes inject `ILogger<T>` |
| `Result<T>` error handling pattern | Used in analytics services | Service methods return `Result<T>` for clean controller code |
| `IPaymentProvider` / `StripePaymentProvider` | `Application/Interfaces/` + `Infrastructure/Services/` | Template for the `IZernioXxxService` pattern (interface in Application, implementation in Infrastructure) |
| `StripeWebhookController` pattern | `Api/Controllers/` | Raw body read + signature verify + orchestrator dispatch — copy this pattern exactly |
| `PaymentWebhookOrchestrator` pattern | `Api/Controllers/` | Template for `ZernioWebhookOrchestrator` |

### Replace (Social Provider Layer — Graduated Migration)

The existing per-platform social provider layer will be superseded by Zernio. Do NOT remove until all platforms are validated through Zernio. Use `ZernioOptions.UseZernio` to gate routing.

| Obsolete Component | Location | Zernio Replacement |
|--------------------|----------|-------------------|
| `XOAuthProvider`, `TikTokOAuthProvider`, `YouTubeProvider`, `FacebookProvider` | `Infrastructure/Social/Providers/` | `IZernioConnectService` → `ConnectApi.GetConnectUrlAsync` |
| `XPublishAdapter`, `TikTokPublishAdapter`, `YouTubePublishAdapter`, `FacebookPublishAdapter` | `Infrastructure/Publishing/Adapters/` | `IZernioPostService` → `PostsApi.CreatePostAsync` |
| `YouTubeAnalyticsAdapter`, `FacebookInsightsAdapter` | `Infrastructure/Publishing/Adapters/` | `IZernioAnalyticsService` → `AnalyticsApi` |
| `IPublishAdapterRegistry`, `IAnalyticsAdapterRegistry`, `IProviderRegistry` | `Infrastructure/Social/` | Deleted — Zernio client replaces registry dispatch |
| Per-platform `OAuthOptions` keys (X, TikTok, YouTube, Facebook) | `appsettings.json` | Single `ZernioOptions.ApiKey` replaces 4 separate OAuth credential sets |

### Do NOT Add (Already Present — Would Be Redundant)

| Capability Needed | Already Provided By | Package Location |
|-------------------|--------------------|-|
| HTTP resilience (retry + timeout) | `Microsoft.Extensions.Http.Polly` 10.0.4 | `Syncra.Infrastructure.csproj` |
| Distributed cache | `Microsoft.Extensions.Caching.StackExchangeRedis` 8.0.0 | `Syncra.Infrastructure.csproj` |
| Redis connection multiplexer | `StackExchange.Redis` (transitive) | `Syncra.Infrastructure/DependencyInjection.cs` |
| Background jobs | `Hangfire.Core` 1.8.14 + `Hangfire.AspNetCore` 1.8.14 | Both `.csproj` files |
| Structured logging | `Serilog.AspNetCore` 10.0.0 | `Syncra.Api.csproj` |
| EF Core + PostgreSQL | `Microsoft.EntityFrameworkCore` 8.0.0 + `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.0 | `Syncra.Infrastructure.csproj` |
| JSON (System.Text.Json) | .NET 8 runtime | Built-in, use for all Syncra-owned serialization |
| HMAC-SHA256 signature verification | `System.Security.Cryptography` | .NET runtime BCL — no package needed |
| MediatR command/query bus | `MediatR` 14.1.0 | `Syncra.Application.csproj` |

**Note on `Microsoft.Extensions.Http.Polly` deprecation:** nuget.org shows this package is deprecated in favor of `Microsoft.Extensions.Resilience`. The project already uses it and it still works correctly. Do not migrate to the new resilience packages during v2.0 — that is a separate technical debt item. Continue using the existing `HttpPolicyExtensions.HandleTransientHttpError().WaitAndRetryAsync(...)` pattern.

---

## Installation

```bash
# Run from be/src/Syncra.Infrastructure/
dotnet add package Zernio --version 0.0.281
```

Before implementing, verify the latest version at https://www.nuget.org/packages/Zernio — version 0.0.281 was current at time of research (2026-05-23). The SDK is actively published and may have a higher version available.

---

## Sources

| Source | Confidence | What Was Verified |
|--------|------------|-------------------|
| https://www.nuget.org/packages/Zernio | HIGH | Package version 0.0.281, target framework net8.0, transitive dependencies |
| https://github.com/zernio-dev/zernio-dotnet | HIGH | SDK API class interfaces, constructor signatures, method names (PostsApi, AnalyticsApi, MessagesApi, ConnectApi, WebhooksApi, BroadcastsApi) |
| `zernio-api-documentation.md` (project root) | HIGH | Webhook signature format, event types, delivery retry schedule, auth header format |
| `zernio-api-openapi.yaml` (project root) | HIGH | API version 1.0.4, base URL, security scheme, all tags and endpoint structure |
| `be/src/Syncra.Infrastructure/DependencyInjection.cs` | HIGH | Existing Polly policy pattern, Redis registration, named HttpClient pattern (Google OAuth) |
| `be/src/Syncra.Infrastructure/Social/DependencyInjection.cs` | HIGH | Existing provider registration pattern |
| `be/src/Syncra.Api/Controllers/StripeWebhookController.cs` | HIGH | Raw body read + dispatch pattern to replicate for Zernio webhook |
| `be/src/Syncra.Application/Options/StripeOptions.cs` | HIGH | Options class pattern to follow for ZernioOptions |
| `be/src/Syncra.Infrastructure/Syncra.Infrastructure.csproj` | HIGH | Confirmed Microsoft.Extensions.Http.Polly 10.0.4 already present — no new package needed |
