# External Integrations

**Analysis Date:** 2025-05-14

## APIs & External Services

**Social Media Publishing & Analytics:**
- **Facebook / Instagram** - Content publishing and insights.
  - SDK/Client: `System.Net.Http.HttpClient` (Custom implementation in `be/src/Syncra.Infrastructure/Publishing/Adapters/Facebook`)
  - Auth: OAuth2 (handled in `be/src/Syncra.Infrastructure/Social/Providers/FacebookProvider.cs`)
- **TikTok** - Video publishing and analytics.
  - SDK/Client: Custom `TikTokApiClient` (`be/src/Syncra.Infrastructure/Publishing/Adapters/TikTok/TikTokApiClient.cs`)
- **YouTube** - Video publishing and channel analytics.
  - SDK/Client: `System.Net.Http.HttpClient` (`be/src/Syncra.Infrastructure/Publishing/Adapters/YouTube`)
- **X (Twitter)** - Post publishing.
  - SDK/Client: `System.Net.Http.HttpClient` (`be/src/Syncra.Infrastructure/Publishing/Adapters/XPublishAdapter.cs`)

**Payments:**
- **Stripe** - Subscription billing and payment processing.
  - SDK/Client: `Stripe.net` NuGet package.
  - Implementation: `be/src/Syncra.Infrastructure/Services/StripeService.cs`
  - Webhooks: `be/src/Syncra.Api/Controllers/StripeWebhookController.cs`

## Data Storage

**Databases:**
- **PostgreSQL 15** - Primary relational data store.
  - Connection: `Postgres:ConnectionString` env var.
  - Client: Entity Framework Core 8.0 with Npgsql.

**File Storage:**
- **Local Filesystem** - Currently used for media uploads.
  - Implementation: `be/src/Syncra.Infrastructure/Storage/LocalMediaStorage.cs`
  - Storage path: Configured via `StorageOptions`.

**Caching:**
- **Redis 7** - Used for analytics result caching and distributed locking.
  - Connection: `Redis:ConnectionString` env var.
  - Client: `StackExchange.Redis` / `Microsoft.Extensions.Caching.StackExchangeRedis`.

## Authentication & Identity

**Auth Provider:**
- **Custom JWT-based Authentication**
  - Implementation: `be/src/Syncra.Infrastructure/Services/TokenService.cs`
  - Handling: ASP.NET Core Identity/Authentication middleware.
- **Social OAuth**
  - Used for linking social accounts (Integrations).
  - Implementation: `be/src/Syncra.Infrastructure/Social/Providers/`

## Monitoring & Observability

**Error Tracking:**
- **Sentry** - Error logging and performance tracing.
  - SDK: `Sentry.AspNetCore`.
  - Config: `Sentry:Dsn` env var.

**Logs:**
- **Serilog** - Structured logging to Console and File.
  - Implementation: `be/src/Syncra.Api/Logging/RedactingEnricher.cs`

## CI/CD & Deployment

**Hosting:**
- Containerized (Docker) - deployment target not explicitly specified but configured for Docker Compose.

**CI Pipeline:**
- **GitHub Actions** - Frontend CI (`.github/workflows/fe-ci.yml`).

## Environment Configuration

**Required env vars:**
- `Postgres:ConnectionString`
- `Redis:ConnectionString`
- `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`
- `Stripe:SecretKey`, `Stripe:WebhookSecret`
- `OAuth:X:ClientId`, `OAuth:X:ClientSecret`, etc. for each provider.

**Secrets location:**
- Managed via environment variables or `.env` files in local development.

## Webhooks & Callbacks

**Incoming:**
- `/api/webhooks/stripe` - Handles subscription events (invoice paid, subscription deleted).
- `/api/integrations/oauth/callback` - Handles OAuth2 redirect from social providers.

**Outgoing:**
- Requests to Social Provider APIs (Facebook, TikTok, YouTube, X).
- Requests to Stripe API for session creation and management.

---

*Integration audit: 2025-05-14*
