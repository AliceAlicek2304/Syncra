# External Integrations

**Analysis Date:** 2024-04-25

## APIs & External Services

**Social Media Publishing & Analytics:**
- X (Twitter) - Content publishing and analytics
  - SDK/Client: `Syncra.Infrastructure.Social.Providers.XOAuthProvider`
  - Auth: `OAuth:X:ClientId`, `OAuth:X:ClientSecret`
- TikTok - Video publishing and analytics
  - SDK/Client: `Syncra.Infrastructure.Social.Providers.TikTokOAuthProvider`
  - Auth: `OAuth:TikTok:ClientId`, `OAuth:TikTok:ClientSecret`
- YouTube - Video publishing and channel analytics
  - SDK/Client: `Syncra.Infrastructure.Social.Providers.YouTubeProvider`
  - Auth: `OAuth:YouTube:ClientId`, `OAuth:YouTube:ClientSecret`
- Facebook - Media publishing and page insights
  - SDK/Client: `Syncra.Infrastructure.Social.Providers.FacebookProvider`
  - Auth: `OAuth:Facebook:AppId`, `OAuth:Facebook:AppSecret`

**Payments & Subscriptions:**
- Stripe - Subscription management and billing
  - SDK/Client: `Stripe.net`
  - Auth: `Stripe:SecretKey`, `Stripe:WebhookSecret`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `Postgres:ConnectionString` (constructed from host, port, db, user, pass)
  - Client: Entity Framework Core with `Npgsql` provider

**File Storage:**
- Local filesystem only
  - Implementation: `src/Syncra.Infrastructure/Storage/LocalMediaStorage.cs`
  - Configuration: `Storage:LocalRootPath`

**Caching:**
- Redis
  - Connection: `Redis:ConnectionString`
  - Client: `StackExchange.Redis` (via `Microsoft.Extensions.Caching.StackExchangeRedis`)
  - Fallback: Distributed Memory Cache (`AddDistributedMemoryCache`)

## Authentication & Identity

**Auth Provider:**
- Custom JWT Implementation
  - Implementation: `src/Syncra.Infrastructure/Services/TokenService.cs`
  - Auth: `Jwt:Secret`, `Jwt:Issuer`, `Jwt:Audience`
  - Patterns: Refresh tokens stored in database (`src/Syncra.Domain/Entities/RefreshToken.cs`)

## Monitoring & Observability

**Error Tracking:**
- Sentry
  - SDK: `Sentry.AspNetCore`
  - Config: `Sentry:Dsn`

**Logs:**
- Structured logging using Serilog
  - Sinks: Console (standard), Sentry (via `Sentry.AspNetCore`)
  - Enrichment: `CorrelationIdMiddleware`, `RedactingEnricher`

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in codebase (likely standard ASP.NET Core deployment target)

**CI Pipeline:**
- Not detected (no GitHub Actions or GitLab CI files found)

## Environment Configuration

**Required env vars:**
- `Postgres__Password`
- `Jwt__Secret`
- `Stripe__SecretKey`
- `Stripe__WebhookSecret`
- `Sentry__Dsn`
- `OAuth__X__ClientSecret` (and others for each provider)

**Secrets location:**
- Environment variables or Secret Manager (standard .NET configuration)

## Webhooks & Callbacks

**Incoming:**
- `/api/stripe-webhook`: `src/Syncra.Api/Controllers/StripeWebhookController.cs` - Handles subscription events

**Outgoing:**
- Social media API requests for publishing and analytics (X, TikTok, YouTube, Facebook)

---

*Integration audit: 2024-04-25*
