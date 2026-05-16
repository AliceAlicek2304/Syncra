# External Integrations

**Analysis Date:** 2026-05-14

## APIs & External Services

**Social Media Publishing:**
- **X (Twitter)** — OAuth flow + content publishing
  - SDK/Client: Custom `XOAuthProvider` (`be/src/Syncra.Infrastructure/Social/Providers/XOAuthProvider.cs`)
  - Publish adapter: `XPublishAdapter` (`be/src/Syncra.Infrastructure/Publishing/Adapters/XPublishAdapter.cs`)
  - Config: `appsettings.json` → `OAuth:X` (ClientId, ClientSecret, CallbackUrl, IsEnabled)

- **TikTok** — OAuth flow + content publishing
  - SDK/Client: Custom `TikTokOAuthProvider` + `TikTokApiClient` (`be/src/Syncra.Infrastructure/Social/Providers/TikTokOAuthProvider.cs`, `be/src/Syncra.Infrastructure/Publishing/Adapters/TikTok/`)
  - Publish adapter: `TikTokPublishAdapter` (`be/src/Syncra.Infrastructure/Publishing/Adapters/TikTokPublishAdapter.cs`)
  - Config: `appsettings.json` → `OAuth:TikTok`

- **YouTube** — OAuth flow + content publishing + analytics
  - SDK/Client: Custom `YouTubeProvider` (`be/src/Syncra.Infrastructure/Social/Providers/YouTubeProvider.cs`)
  - Publish adapter: `YouTubePublishAdapter` (`be/src/Syncra.Infrastructure/Publishing/Adapters/YouTube/YouTubePublishAdapter.cs`)
  - Analytics adapter: `YouTubeAnalyticsAdapter` (`be/src/Syncra.Infrastructure/Publishing/Adapters/YouTube/YouTubeAnalyticsAdapter.cs`)
  - Config: `appsettings.json` → `OAuth:YouTube`

- **Facebook / Instagram** — OAuth flow + content publishing + insights
  - SDK/Client: Custom `FacebookProvider` (`be/src/Syncra.Infrastructure/Social/Providers/FacebookProvider.cs`)
  - Publish adapter: `FacebookPublishAdapter` (`be/src/Syncra.Infrastructure/Publishing/Adapters/FacebookPublishAdapter.cs`)
  - Analytics adapter: `FacebookInsightsAdapter` (`be/src/Syncra.Infrastructure/Publishing/Adapters/Facebook/FacebookInsightsAdapter.cs`)
  - Config: `appsettings.json` → `OAuth:Facebook`

**All OAuth providers share these characteristics:**
  - Currently configured as disabled (`IsEnabled: false`) with empty ClientId/ClientSecret in config
  - All use retry policy: 3 retries with exponential backoff via Polly
  - All use timeout policy: 10s (except Facebook video uploads which use 60s)
  - Registered via `ISocialProvider`, `IPublishAdapter`, `IAnalyticsAdapter` interfaces in `be/src/Syncra.Infrastructure/Social/DependencyInjection.cs`
  - OAuth flow initiated via `POST /api/v1/workspaces/{workspaceId}/integrations/{providerId}/connect` and callback at `GET /api/v1/integrations/{providerId}/callback`
  - Token refresh handled by Hangfire recurring job (`IntegrationTokenRefreshJob`) in `be/src/Syncra.Infrastructure/Jobs/`

**Payment Processing:**
- **Stripe** — Subscription billing and payments
  - SDK/Client: `Stripe.net` 50.4 (`be/src/Syncra.Infrastructure/Services/StripePaymentProvider.cs`, `be/src/Syncra.Infrastructure/Services/StripeService.cs`)
  - Config: `appsettings.json` → `Stripe` (PublishableKey, SecretKey, WebhookSecret, IsTestMode)
  - Webhook endpoints: `POST /api/stripe/webhook` (`StripeWebhookController.cs`) and generic `POST /api/payments/webhook/{provider}` (`PaymentsWebhookController.cs`)
  - Webhook handlers: `StripeProductWebhookHandlers.cs`, `StripePriceWebhookHandlers.cs`, `StripeSubscriptionWebhookHandlers.cs` in `be/src/Syncra.Application/Payments/Handlers/`
  - Frontend integration: `BillingContext.tsx` uses `apiFetch` to create checkout sessions and portal sessions; redirects to Stripe-hosted checkout/portal URLs
  - Supported events: `checkout.session.completed`, `customer.subscription.deleted`, product/price webhooks
  - Current mode: test mode (`IsTestMode: true`)

**AI / Content Generation:**
- **AI Service** — Idea generation endpoint (implementation not public; likely custom AI service or API)
  - Frontend: `aiApi.generateIdeas()` → `POST /api/v1/workspaces/{workspaceId}/ai/ideas/generate` (`fe/src/api/ai.ts`)
  - Request: topic, niche, audience, goal, tone, reference asset IDs
  - Response: array of generated ideas with platform targeting
  - Cooldown: rate limiting via `cooldownSeconds` in response

**Real-time Notifications:**
- **SignalR Hub** — Real-time WebSocket notifications
  - Client: `@microsoft/signalr` 8.0 (`fe/src/hooks/useNotificationHub.ts`)
  - Server: `NotificationHub` at `/api/v1/hubs/notifications` (`be/src/Syncra.Api/Hubs/NotificationHub.cs`)
  - Uses JWT for auth (access token passed as query parameter)
  - Groups by workspaceId
  - Auto-reconnect enabled; polling fallback at 30s interval

**Monitoring:**
- **Sentry** — Error tracking
  - SDK: `Sentry.AspNetCore` 6.1 (`be/src/Syncra.Api/Program.cs` → `builder.WebHost.UseSentry()`)
  - Config: `appsettings.json` → `Sentry` (Dsn, Environment, TracesSampleRate, EnableTracing)
  - Current DSN: empty (not configured)

**Logging:**
- **Serilog** — Structured logging
  - Sink: Console (`Serilog.Sinks.Console`)
  - With `RedactingEnricher` for sensitive data handling (`be/src/Syncra.Api/Logging/`)
  - Config: `appsettings.json` → `Serilog`

## Data Storage

**Databases:**
- **PostgreSQL 15 (via Docker)** — Primary database
  - Connection: `Host=localhost;Port=5432;Database=syncra_db;Username=postgres;Password=1234567890`
  - ORM: Entity Framework Core 8.0 with Npgsql provider
  - Migrations: EF Core code-first migrations (`be/src/Syncra.Infrastructure/Migrations/`, 20+ migration files)
  - Docker: `docker-compose.yml` defines `postgres:15-alpine` container on port 5432

**File Storage:**
- **Local Filesystem** (current) — Media file storage
  - Implementation: `LocalMediaStorage.cs` (`be/src/Syncra.Infrastructure/Storage/LocalMediaStorage.cs`)
  - Config: `Storage:LocalRootPath` and `Storage:PublicBaseUrl` in `appsettings.json` (currently empty)
- **Cloudflare R2** (planned / partially integrated) — Presigned URL upload flow
  - Frontend: `useR2Upload` hook (`fe/src/hooks/useR2Upload.ts`) implements presign → PUT → confirm flow
  - API: `POST /workspaces/{workspaceId}/media/presign` returns `presignedUrl` + `assetId` + `publicUrl`
  - Client PUTs directly to presigned URL (plain axios, no auth headers — R2 rejects them)
  - Backend confirm step finalizes the `MediaAsset` record
  - File deduplication handled at backend level (D-11)

**Caching:**
- **Redis 7 (via Docker)** — Distributed cache
  - Docker: `redis:7-alpine` container on port 6379 (`docker-compose.yml`)
  - Client: `StackExchange.Redis` via `Microsoft.Extensions.Caching.StackExchangeRedis` 8.0
  - Purpose: Analytics query results cache, distributed locking for webhook concurrency (`RedisDistributedLockService`)
  - Fallback: In-memory distributed cache when Redis connection string is empty (`AddDistributedMemoryCache()`)
  - Instance name: `syncra:`

## Authentication & Identity

**Auth Provider:**
- **Custom JWT-based authentication** (no external identity provider)
  - Implementation: `TokenService` in `be/src/Syncra.Infrastructure/Services/TokenService.cs`
  - Bearer token auth via `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0
  - Config: `Jwt:Secret`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpirationMinutes` (60), `Jwt:RefreshTokenExpirationDays` (7)
  - Refresh tokens stored in `RefreshTokens` DB table
  - Frontend stores token in `localStorage` under `syncra_access_token`
  - Endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`
  - Password hashing: BCrypt.Net-Next 4.1

## CI/CD & Deployment

**Hosting:**
- Not explicitly detected — no Dockerfile for API deployment, no cloud provider config evident
- API serves static files via `app.UseStaticFiles()` and `wwwroot/` directory
- Frontend builds to `fe/dist/`

**CI Pipeline:**
- **GitHub Actions** — `.github/` directory exists; no specific workflow files explored

## Environment Configuration

**Required env vars:**
- **Backend** `appsettings.json` sections:
  - `Jwt:Secret` — JWT signing key
  - `Postgres:ConnectionString` or individual host/port/db/user/password fields
  - `Redis:ConnectionString` or individual host/port fields
  - `Stripe:SecretKey` / `Stripe:PublishableKey` / `Stripe:WebhookSecret`
  - `Sentry:Dsn` (optional, currently empty)
  - `OAuth:*:ClientId` / `OAuth:*:ClientSecret` (currently empty, providers disabled)

- **Frontend** Vite env vars:
  - `VITE_API_BASE_URL` — API base URL (dev default: proxied through Vite to `http://localhost:5260`)

**Secrets location:**
- `be/src/Syncra.Api/appsettings.json` — Contains Stripe test keys, JWT secret, Postgres credentials (DEV ONLY — should be externalized for production)
- `be/src/Syncra.Api/appsettings.Development.json` — Development overrides (Stripe webhook secret differs from base)
- Docker Compose defines Postgres password inline (`1234567890`)
- No `.env` files detected, no Azure Key Vault / HashiCorp Vault / GitHub Secrets reference

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` — Stripe payment events (`StripeWebhookController.cs`)
- `POST /api/payments/webhook/{provider}` — Generic payment provider webhooks (`PaymentsWebhookController.cs`)
- Both use `PaymentWebhookOrchestrator.cs` for processing with distributed locking (Redis-based)
- Webhook event dispatching to MediatR handlers in `be/src/Syncra.Application/Payments/`
- Idempotency support via `IdempotencyFilter` and `IdempotencyRecord` DB table

**OAuth Callbacks:**
- `GET /api/v1/integrations/{providerId}/callback` — Social platform OAuth callbacks (`IntegrationsController.cs`)
  - Accepts `code`, `state`, `redirectUri` query params
  - State includes `workspaceId` for workspace association
  - Returns integration metadata (external user ID, username, channel/page info)

**Outgoing:**
- OAuth redirect flows to X, TikTok, YouTube, Facebook
- Stripe Checkout / Customer Portal redirects from frontend

---

*Integration audit: 2026-05-14*
