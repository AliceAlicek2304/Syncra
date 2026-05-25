<!-- refreshed: 2026-05-25 -->
# Architecture

**Analysis Date:** 2026-05-25

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT (React SPA)                            │
│  `fe/src/`                                                           │
│  Pages → Contexts → Hooks → API Layer (Axios) → HTTP                 │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP REST + SignalR
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (ASP.NET Core)                        │
│  `be/src/Syncra.Api/`                                                │
│  Controllers → MediatR → Middleware Stack                             │
└──────┬──────────────────────────────────┬────────────────────────────┘
       │                                  │
       ▼                                  ▼
┌─────────────────┐            ┌──────────────────────────┐
│  Application     │            │  Infrastructure           │
│  `Syncra.App/`  │            │  `Syncra.Infra/`          │
│  CQRS + Services │            │  EF Core, Repos, Jobs     │
│  Pipeline Behav. │            │  Social Providers, Redis   │
└────────┬─────────┘            └──────────┬────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐            ┌──────────────────────────┐
│  Domain          │            │  External                 │
│  `Syncra.Domain/`│            │  PostgreSQL, Redis,       │
│  Entities, VOs,  │            │  Stripe, Social APIs      │
│  Interfaces      │            │  Hangfire, Sentry, Files  │
└──────────────────┘            └──────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Syncra.Api | HTTP layer, controllers, middleware, SignalR hubs, Swagger | `be/src/Syncra.Api/` |
| Syncra.Application | CQRS handlers, service interfaces, DTOs, pipeline behaviors, options | `be/src/Syncra.Application/` |
| Syncra.Domain | Domain entities, value objects, enums, repository interfaces, domain exceptions | `be/src/Syncra.Domain/` |
| Syncra.Infrastructure | EF Core DbContext, repositories, social providers, Hangfire jobs, Redis, Stripe, file storage, Zernio service | `be/src/Syncra.Infrastructure/` |
| Syncra.Shared | Constants, extension methods, helpers | `be/src/Syncra.Shared/` |
| fe/src | React SPA: pages, components, contexts, API client, hooks | `fe/src/` |

## Pattern Overview

**Overall:** Clean Architecture (Domain-centric) with CQRS — backend; Context-driven React SPA with feature-based layouts — frontend.

**Key Characteristics:**
- **5-project .NET solution** with strict dependency direction: Api → Application → Domain ← Infrastructure (Dependency Inversion)
- **CQRS via MediatR**: Commands (mutations) and Queries (reads) are separate record types with dedicated handlers
- **Repository + Unit of Work** over EF Core for data access
- **Strategy pattern** for legacy/direct social platform providers (`ISocialProvider`) and payment providers (`IPaymentProvider`)
- **Zernio Client Abstraction** for unified multi-platform social connections, posting, inbox, and analytics
- **Middleware pipeline** for cross-cutting concerns (correlation IDs, tenant resolution, global error handling)
- **Background job scheduling** via Hangfire for token refresh and post publishing
- **Real-time notifications** via SignalR
- **Frontend: Context providers** layered from auth → workspace → feature → page
- **CSS Modules** co-located with components

## Layers

**API Layer (Syncra.Api):**
- Purpose: HTTP entry point, request routing, middleware, Swagger documentation, SignalR hubs
- Location: `be/src/Syncra.Api/`
- Contains: `Controllers/` (17 controllers), `Middleware/` (3 middlewares), `Hubs/` (NotificationHub), `Filters/` (IdempotencyFilter), `Services/` (NotificationDispatcher), `SwaggerFilters/`, `Common/`
- Depends on: Syncra.Application (for MediatR), Syncra.Infrastructure (for DI registration)
- Used by: HTTP clients (React SPA, mobile, third-party)

**Application Layer (Syncra.Application):**
- Purpose: Orchestration, CQRS handlers, service abstractions, validation, pipeline behaviors
- Location: `be/src/Syncra.Application/`
- Contains: `Features/{Feature}/Queries/`, `Features/{Feature}/Commands/`, `Services/`, `Interfaces/`, `DTOs/`, `Options/`, `Payments/`, `Common/Behaviors/`
- Depends on: Syncra.Domain (for entities, interfaces)
- Pipeline behaviors: `LoggingBehavior<>`, `ValidationBehavior<>`, `PerformanceBehavior<>`

**Domain Layer (Syncra.Domain):**
- Purpose: Enterprise business rules, entities, value objects, repository contracts
- Location: `be/src/Syncra.Domain/`
- Contains: `Entities/` (19 entities), `ValueObjects/` (8 VOs), `Enums/` (10 enums), `Interfaces/` (16 repository interfaces), `Exceptions/`, `Models/Social/` and `Models/Analytics/`
- Depends on: Nothing (outer layer has zero dependencies)

**Infrastructure Layer (Syncra.Infrastructure):**
- Purpose: Data access, external service integration, background jobs, file storage
- Location: `be/src/Syncra.Infrastructure/`
- Contains: `Persistence/` (AppDbContext + Configurations + Interceptors + Seed), `Repositories/` (14 repos), `Social/` (4 providers + registry + adapters), `Services/` (6 services), `Jobs/` (4 job files), `Storage/`, `Publishing/`
- Depends on: Syncra.Application (service interfaces), Syncra.Domain (entity interfaces)

**Shared Layer (Syncra.Shared):**
- Purpose: Common utilities shared across layers
- Location: `be/src/Syncra.Shared/`
- Contains: `Constants/`, `Extensions/`, `Helpers/`

## Data Flow

### Primary Request Path (REST)

1. **HTTP Request** → Middleware pipeline: `CorrelationIdMiddleware` (adds X-Correlation-ID) → `GlobalExceptionMiddleware` (catch-all error handler) → Authentication (JWT Bearer) → Authorization → `TenantResolutionMiddleware` (validates X-Workspace-Id header)
2. **Controller** (`be/src/Syncra.Api/Controllers/*.cs`) handles routing, extracts user identity via `User.GetUserId()` extension method, and dispatches MediatR command/query
3. **MediatR Pipeline** runs behaviors in order: `LoggingBehavior` → `ValidationBehavior` (FluentValidation) → `PerformanceBehavior`
4. **Handler** (`be/src/Syncra.Application/Features/{Feature}/{Command|Query}Handler.cs`) executes business logic, calls repository interfaces
5. **Repository** (`be/src/Syncra.Infrastructure/Repositories/*.cs`) executes EF Core queries against PostgreSQL
6. **Response** flows back through the pipeline → Controller → serialized JSON → HTTP response with correlation header

### Social Publishing Flow

1. Publish endpoint invoked → `PostsController` → MediatR command → `PublishService` (`be/src/Syncra.Application/Services/PublishService.cs`)
2. `IPublishAdapterRegistry` resolves the correct adapter for the target platform
3. Adapter delegates to `ISocialProvider` implementation (or `IZernioClient` for unified posting backend)
4. Publish result persisted back via `Post` domain entity state machine (`Post.cs` methods: `MarkPublishSuccess`, `MarkPublishFailure`)
5. Real-time notification dispatched via SignalR `NotificationHub` (`be/src/Syncra.Api/Hubs/NotificationHub.cs`)

### Background Job Flow

1. `Program.cs` schedules recurring jobs at startup via `IIntegrationTokenRefreshJobScheduler` and `IDuePostPublishJobScheduler`
2. Hangfire executes `IntegrationTokenRefreshJob` and `DuePostPublishJob` on schedule (both in `be/src/Syncra.Infrastructure/Jobs/`)
3. Jobs use Infrastructure services (Redis distributed lock for webhook concurrency via `RedisDistributedLockService`)

**State Management:**
- Backend: Stateless (JWT tokens), request-scoped DbContext via DI, Redis for distributed caching/locking, PostgreSQL for persistence
- Frontend: React Context providers (Auth, Workspace, Calendar, Repurpose, Billing, Toast, CreatePostModal), TanStack React Query for server state caching

## Key Abstractions

**EntityBase:**
- Purpose: Base class for all domain entities, provides Id (Guid), audit timestamps, soft-delete, optimistic concurrency versioning
- Files: `be/src/Syncra.Domain/Entities/EntityBase.cs`, `be/src/Syncra.Domain/Entities/WorkspaceEntityBase.cs`
- Pattern: Abstract base class with factory methods

**Value Objects:**
- Purpose: Immutable, self-validating value types with factory methods (e.g., `PostTitle.Create(...)`)
- Files: `be/src/Syncra.Domain/ValueObjects/*.cs` (8 VOs: Email, PostContent, PostTitle, ScheduledTime, WorkspaceName, WorkspaceSlug, etc.)
- Pattern: Sealed class with private constructor, static Create factory, implicit string operator

**Repository Pattern:**
- Purpose: Abstracts data access behind domain interfaces
- Files: `be/src/Syncra.Domain/Interfaces/I{Entity}Repository.cs` (12 repos) → implementations in `be/src/Syncra.Infrastructure/Repositories/`
- Pattern: Generic `Repository<T>` base class plus specific repositories; all scoped via `AddScoped<I{Repo}, {Repo}>()` in DI
- Base class: `be/src/Syncra.Infrastructure/Repositories/Repository.cs`

**CQRS with MediatR:**
- Purpose: Separates read and write operations; each is a record + handler pair
- Files: `be/src/Syncra.Application/Features/{Feature}/Queries/*`, `be/src/Syncra.Application/Features/{Feature}/Commands/*`
- Pattern: Record implements `IRequest<TResponse>`, handler implements `IRequestHandler<TOperation, TResult>`

**Zernio Client Abstraction:**
- Purpose: Interface-based abstraction layer over the raw Zernio SDK client APIs, transforming SDK models into clean application DTOs and managing error translations
- Files: `be/src/Syncra.Application/Interfaces/IZernioClient.cs` (interface), `be/src/Syncra.Infrastructure/Services/ZernioClient.cs` (implementation)
- Pattern: Adapter/Facade layer wraps Zernio API endpoints (`ConnectApi`, `AccountsApi`, `ProfilesApi`, `PostsApi`, `AnalyticsApi`, `MessagesApi`, `CommentsApi`, `ReviewsApi`) and catches billing-related or scope-related API exceptions.

**Social Provider Strategy:**
- Purpose: Pluggable social platform integration via `ISocialProvider` interface
- Files: `be/src/Syncra.Domain/Interfaces/ISocialProvider.cs` → implementations in `be/src/Syncra.Infrastructure/Social/Providers/{Facebook,XOAuth,TikTokOAuth,YouTube}Provider.cs`
- Pattern: `ProviderRegistry` resolves provider by string ID, adapters for publish and analytics

**Payment Provider Strategy:**
- Purpose: Pluggable payment provider with `IPaymentProvider` interface (Stripe implementation)
- Files: `be/src/Syncra.Application/Interfaces/IPaymentProvider.cs`, `be/src/Syncra.Infrastructure/Services/StripePaymentProvider.cs`
- Decoupled webhook handling: `IPaymentWebhookHandler` implementations dispatched via `PaymentWebhookEventDispatcher`

**Idempotency:**
- Purpose: Ensures mutating endpoints are safe to retry with the same `Idempotency-Key` header
- Files: `be/src/Syncra.Api/Filters/IdempotencyFilter.cs`
- Pattern: Action filter backed by `IdempotencyRecord` entity in PostgreSQL; returns cached response on replay

## Entry Points

**Backend HTTP API:**
- Location: `be/src/Syncra.Api/Program.cs`
- Triggers: HTTP requests on ASP.NET Core Kestrel
- Responsibilities: Configures middleware pipeline, registers DI modules (Application, Infrastructure, Api, Auth, Hangfire), maps controllers + SignalR hub + health checks, schedules recurring jobs

**Backend Background Jobs:**
- Location: Scheduled from `Program.cs` lines 57-64, executed by Hangfire server
- Triggers: Hangfire cron schedule
- Responsibilities: Refresh expiring OAuth tokens (`IntegrationTokenRefreshJob`), publish due posts (`DuePostPublishJob`)

**Frontend SPA:**
- Location: `fe/src/main.tsx` → `fe/src/App.tsx`
- Triggers: Browser loading index.html → Vite dev/prod build
- Responsibilities: Mounts React app with providers: `QueryClientProvider` > `AuthProvider` > `ToastProvider` > `WorkspaceProvider` > `BrowserRouter` (basename "/Syncra/")

## Architectural Constraints

- **Dependency direction:** Domain has zero dependencies. Infrastructure depends on Application and Domain. Application depends only on Domain. Api depends on all lower layers. Violating this (e.g., Domain referencing Infrastructure) breaks Clean Architecture.
- **Threading:** ASP.NET Core uses the thread pool for requests. Hangfire jobs run on separate worker threads. SignalR connections are long-lived. Redis `ConnectionMultiplexer` is a singleton shared across requests.
- **Global state:** `AppDbContext` is scoped per request (no global state). Axios `globalErrorHandler` in `fe/src/lib/axios.ts` (line 40) is a module-level singleton that gets set by `ToastContext`.
- **Tenant isolation:** Multi-tenant via `X-Workspace-Id` header, validated by `TenantResolutionMiddleware` and cached in Redis for 1 hour. All workspace-scoped controllers read `context.Items["WorkspaceId"]`.
- **Circular imports:** Not detected. Backend has strict project references. Frontend uses standard ES module imports with no circular dependency indicators.

## Anti-Patterns

### Service Locator in ProviderRegistry

**What happens:** `ProviderRegistry` (`be/src/Syncra.Infrastructure/Social/ProviderRegistry.cs`) uses `IServiceProvider.GetServices<ISocialProvider>()` to resolve providers at runtime by string ID.
**Why it's wrong:** This is a Service Locator pattern — it hides dependencies and makes it impossible to reason about which providers are used by just looking at constructor injection.
**Do this instead:** Consider registering named provider instances via a factory pattern or using a `Dictionary<string, ISocialProvider>` populated during DI registration.

### Global Error Handler Singleton in Axios Module

**What happens:** `fe/src/lib/axios.ts` lines 40-44 defines a mutable module-level `globalErrorHandler` that gets set via `registerErrorHandler()`. This creates implicit global state.
**Why it's wrong:** Testing becomes fragile because the global handler persists between tests. The coupling is implicit — nothing in the type system enforces that `registerErrorHandler` is called before errors occur.
**Do this instead:** Use Axios response interceptors with a DI-provided callback, or wrap Axios in a service class that accepts an error handler via constructor.

## Error Handling

**Strategy:** Centralized exception handling via `GlobalExceptionMiddleware` (`be/src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs`) that maps exception types to HTTP status codes and structured JSON responses.

**Patterns:**
- **DomainException** → mapped to 400/401/404 based on `Code` property (`not_found`, `invalid_credentials`, `invalid_token`, or default 400)
- **FluentValidation ValidationException** → 400 with field-level error details
- **KeyNotFoundException** → 404
- **StripeException** → 502 Bad Gateway (upstream provider error)
- **Unhandled exceptions** → 500 Internal Server Error with Sentry logging
- **Frontend** → Axios interceptor catches 401 (redirects to login), other errors forwarded to `ToastContext` global handler

## Cross-Cutting Concerns

**Logging:** Serilog with structured logging setup in `Program.cs` line 13-15; `LoggingBehavior` for MediatR pipeline; `CorrelationIdMiddleware` pushes correlation ID into `LogContext` (`be/src/Syncra.Api/Middleware/CorrelationIdMiddleware.cs`)
**Validation:** FluentValidation with `ValidationBehavior` pipeline for MediatR — validators are auto-registered from assembly via `AddValidatorsFromAssembly()`
**Authentication:** JWT Bearer with configurable issuer/audience/secret via `JwtOptions`; SignalR supports token via query string for WebSocket connections
**Caching:** `IDistributedCache` abstraction — Redis cache when connection string present, otherwise in-memory fallback; 1-hour TTL for tenant membership cache
**Real-time:** SignalR hub at `/api/v1/hubs/notifications` for workspace-scoped notifications via `NotificationDispatcher`

---

*Architecture analysis: 2026-05-25*
