# Codebase Structure

**Analysis Date:** 2026-05-14

## Directory Layout

```
Syncra/
├── .agents/                    # Agent skills & configuration
├── .gsd/                       # GSD workflow state & journals
├── .planning/                  # Planning artifacts (ROADMAP, STATE, PHASES)
├── be/                         # Backend (.NET 8 / C#)
│   ├── Syncra.sln              # Visual Studio solution file
│   ├── src/
│   │   ├── Syncra.Api/         # ASP.NET Core Web API
│   │   ├── Syncra.Application/ # CQRS + Service orchestration
│   │   ├── Syncra.Domain/      # Domain entities & interfaces
│   │   ├── Syncra.Infrastructure/ # Persistence, repos, external integrations
│   │   └── Syncra.Shared/      # Shared constants & helpers
│   ├── tests/                  # Backend tests (if any)
│   ├── docs/                   # Backend-specific docs
│   └── API_DOCS.md
├── fe/                         # Frontend (React + TypeScript + Vite)
│   ├── src/                    # Application source
│   ├── public/                 # Static assets
│   ├── tests/                  # E2E tests (Playwright)
│   ├── dist/                   # Build output (gitignored)
│   ├── vite.config.ts          # Vite bundler configuration
│   ├── vitest.config.ts        # Vitest test runner configuration
│   ├── playwright.config.ts    # Playwright E2E test configuration
│   ├── tsconfig.json           # TypeScript root config
│   ├── tsconfig.app.json       # App-specific TS config
│   ├── tsconfig.node.json      # Node-specific TS config
│   ├── eslint.config.js        # ESLint flat config
│   └── index.html              # SPA entry HTML
├── docker-compose.yml          # PostgreSQL + Redis + Adminer
├── package.json                # Root (opencode-agent-identity only)
└── Syncra.sln                  # Root solution pointer
```

## Directory Purposes

### Backend (`be/src/`)

**`Syncra.Api/`:**
- Purpose: HTTP entry point, routing, middleware, controllers
- Contains: `.cs` controllers, middleware, hubs, filters, Swagger config
- Key files:
  - `Program.cs` — Application bootstrap, middleware pipeline, DI composition root
  - `DependencyInjection.cs` — Registers Api services, authentication (JWT Bearer), Hangfire, Swagger
  - `Controllers/` — 17 controllers (Auth, Posts, Workspaces, Analytics, Media, Groups, Ideas, Integrations, Subscriptions, Stripe, Notifications, Admin)
  - `Middleware/` — CorrelationIdMiddleware, GlobalExceptionMiddleware, TenantResolutionMiddleware
  - `Filters/` — IdempotencyFilter
  - `Hubs/NotificationHub.cs` — SignalR real-time notification hub
  - `Services/NotificationDispatcher.cs` — Dispatches notifications via SignalR
  - `SwaggerFilters/` — WorkspaceHeaderFilter, IdempotencyHeaderFilter

**`Syncra.Application/`:**
- Purpose: Use-case orchestration, CQRS handlers, service abstractions
- Contains: Features/, Services/, Interfaces/, DTOs/, Options/, Payments/, Common/
- Key files:
  - `DependencyInjection.cs` — Registers MediatR + FluentValidation + app services
  - `Features/{Analytics,Auth,Groups,Ideas,Integrations,Media,Posts,Subscriptions,Users,Workspaces}/` — Feature folders each with Commands/ and Queries/ subfolders
  - `Services/` — PublishService, IntegrationTokenRefreshService, IntegrationAnalyticsService, WorkspaceAnalyticsService, AnalyticsExportService
  - `Interfaces/` — 15 service interfaces (ITokenService, IStorageService, IPublishService, IPaymentProvider, etc.)
  - `DTOs/` — 20 DTO subfolders/files
  - `Options/` — 10 options classes (PostgresOptions, JwtOptions, RedisOptions, StripeOptions, SentryOptions, etc.)
  - `Payments/` — Webhook dispatcher + handlers (StripeProduct, StripePrice, StripeSubscription)
  - `Common/Behaviors/` — MediatR pipeline behaviors: LoggingBehavior, ValidationBehavior, PerformanceBehavior

**`Syncra.Domain/`:**
- Purpose: Enterprise business logic, entity definitions, repository contracts
- Contains: Entities/, ValueObjects/, Enums/, Interfaces/, Exceptions/, Models/
- Key files:
  - `Entities/EntityBase.cs` — Base entity (Id, audit timestamps, soft-delete, version)
  - `Entities/WorkspaceEntityBase.cs` — Workspace-scoped entity base
  - `Entities/Post.cs` — Rich domain model with state machine (Create, UpdateContent, Schedule, Publish, Fail, Retry)
  - `Entities/` — User, Workspace, WorkspaceMember, Integration, Idea, Media, Group, Plan, Subscription, etc.
  - `ValueObjects/` — PostTitle, PostContent, ScheduledTime, Email, WorkspaceName, WorkspaceSlug, PublishResultMetadata
  - `Enums/` — PostStatus, PlanType, SubscriptionStatus, WorkspaceMemberRole, etc.
  - `Interfaces/` — 12 repository interfaces + ISocialProvider, IPublishAdapter, IAnalyticsAdapter, etc.
  - `Exceptions/` — DomainException, ValidationException, RefreshTokenException
  - `Models/Social/` — PublishRequest, PublishResult, AuthResult, ProviderError, AnalyticsData
  - `Models/Analytics/` — AnalyticsPostData, PostExportData

**`Syncra.Infrastructure/`:**
- Purpose: Data access, external service integrations, background jobs
- Contains: Persistence/, Repositories/, Social/, Services/, Jobs/, Storage/, Publishing/
- Key files:
  - `DependencyInjection.cs` — Registers DbContext (Npgsql), repositories, Redis, social integrations, payment providers, jobs
  - `Persistence/AppDbContext.cs` — EF Core DbContext with 17 DbSets
  - `Persistence/Configurations/` — 14 EF entity configurations (Fluent API)
  - `Persistence/Interceptors/AuditInterceptor.cs` — EF SaveChanges interceptor
  - `Persistence/Seed/PlanSeedData.cs` — Seed data
  - `Repositories/` — 12 concrete repos extending Repository<T>, plus UnitOfWork
  - `Social/Providers/` — FacebookProvider, XOAuthProvider, TikTokOAuthProvider, YouTubeProvider
  - `Social/ProviderRegistry.cs` — Resolves ISocialProvider by string ID
  - `Social/PublishAdapterRegistry.cs` — Publishing adapter resolution
  - `Social/AnalyticsAdapterRegistry.cs` — Analytics adapter resolution
  - `Services/` — TokenService, StripeService, StripePaymentProvider, PaymentProviderResolver, RedisDistributedLockService, AnalyticsCacheService
  - `Jobs/` — IntegrationTokenRefreshJob + Scheduler, DuePostPublishJob + Scheduler
  - `Storage/LocalMediaStorage.cs` — Local filesystem media storage
  - `Publishing/Adapters/` — Publishing adapters

**`Syncra.Shared/`:**
- Purpose: Cross-cutting utilities
- Key files:
  - `Constants/` — MemberStatus, UserStatus, WorkspaceMemberRoles
  - `Extensions/ClaimsPrincipalExtensions.cs` — User.GetUserId() helper
  - `Helpers/DateTimeHelper.cs`

### Frontend (`fe/src/`)

**`api/`:**
- Purpose: HTTP API client layer — one module per feature
- Files: `auth.ts`, `posts.ts`, `ideas.ts`, `media.ts`, `groups.ts`, `workspaces.ts`, `users.ts`, `analytics.ts`, `ai.ts`, `notifications.ts`, `types.ts`
- Test files co-located: `posts.test.ts`, `ideas.test.ts`, `media.test.ts`, `groups.test.ts`, `ai.test.ts`

**`components/`:**
- Purpose: Reusable UI components
- Files: 62 component files (`.tsx` + `.module.css` pairs), with subdirectories:
  - `auth/` — LoginModal
  - `billing/` — BillingSection
  - `create-post/` — CreatePostModal, CreatePostEditor, CreatePostSidebar, CreatePostHeader, CreatePostFooter, useCreatePostState, platformIcons, types
  - `repurpose/` — ConfigBar, InputSection, ResultsGrid, AtomCard
- Notable: WidgetErrorFallback, SkeletonLoader, PageWrapper, ProtectedRoute (all have `.test.tsx` files)

**`context/`:**
- Purpose: React Context providers for global state
- Files: AuthContext, WorkspaceContext, ToastContext, CalendarContext, RepurposeContext, BillingContext, createPostModalContext
- Supporting: `calendarContextBase.ts`, `repurposeContextBase.ts`
- Test: `AuthContext.test.tsx`

**`pages/`:**
- Purpose: Top-level route components
- Subdirectory: `app/` (authenticated routes)
- Files: DashboardPage, IdeasPage, CalendarPage, AnalyticsPage, MediaLibraryPage, SettingsPage, TrendRadarPage, RepurposePage, HelpPage, AppLayout
- Each has a co-located `.module.css`

**`hooks/`:**
- Purpose: Custom React hooks
- Files: `useCalendarPosts.ts`, `useAnalyticsSummary.ts`, `useNotificationHub.ts`, `useR2Upload.ts`, `useSettings.ts`

**`lib/`:**
- Purpose: Core library configuration
- Files: `axios.ts` — Axios instance with interceptors (auth token, workspace header, 401 redirect, error handler)

**`types/`:**
- Purpose: Shared TypeScript type definitions
- Files: `billing.ts`

**`utils/`:**
- Purpose: Utility functions
- Files: `api.ts`, `shortId.ts`

**`data/`:**
- Purpose: Mock data for development/demo
- Files: `mockAI.ts`, `mockCoachTrends.ts`

**`test/`:**
- Purpose: Test setup and configuration
- Files: `setup.ts`

**`assets/`:**
- Purpose: Static assets (images, icons)
- Key files: `syncra-logo.png`

## Key File Locations

**Entry Points:**
- `be/src/Syncra.Api/Program.cs`: Backend application bootstrap
- `fe/src/main.tsx`: Frontend React mount point
- `fe/src/App.tsx`: React component tree with routing & providers
- `fe/index.html`: SPA HTML shell served by Vite

**Configuration:**
- `be/src/Syncra.Api/appsettings.json`: Backend configuration (connection strings, JWT, Stripe, Sentry, etc.)
- `be/src/Syncra.Api/appsettings.Development.json`: Dev overrides
- `fe/vite.config.ts`: Vite bundler config
- `fe/tsconfig.json`, `fe/tsconfig.app.json`, `fe/tsconfig.node.json`: TypeScript configuration
- `fe/eslint.config.js`: ESLint flat config
- `docker-compose.yml`: PostgreSQL 15 + Redis 7 + Adminer

**Core Logic:**
- Backend: `be/src/Syncra.Application/Features/` (CQRS handlers per domain feature)
- Frontend: `fe/src/api/` (data fetching) → `fe/src/context/` (state) → `fe/src/pages/app/` (rendering)

**Testing:**
- `fe/tests/`: Playwright E2E tests
- `fe/src/test/setup.ts`: Vitest test setup
- Co-located `*.test.ts`/`*.test.tsx` in `fe/src/api/`, `fe/src/components/`, `fe/src/context/`
- `be/tests/`: Backend test directory (structure not deeply analyzed)

## Naming Conventions

**Files:**
- **C# (Backend):** PascalCase with `.cs` extension; entities match entity names (`Post.cs`), controllers are plural (`PostsController.cs`), handlers are `{Operation}Handler.cs`
- **TypeScript/React (Frontend):** PascalCase for components (`DashboardPage.tsx`, `AuthContext.tsx`); camelCase for utilities (`axios.ts`, `shortId.ts`)
- **CSS Modules:** Co-located `.module.css` matching component name (`DashboardPage.module.css`)

**Directories:**
- **Backend:** PascalCase for projects and namespaces (`Syncra.Api`, `Syncra.Application.Features.Workspaces.Queries`)
- **Frontend:** lowercase for all directories (`api/`, `components/`, `context/`, `hooks/`, `pages/`)
- **Feature folders:** PascalCase plural (`Features/Workspaces/`, `Features/Posts/`)

## Where to Add New Code

**New API Endpoint:**
- Controller: `be/src/Syncra.Api/Controllers/{Feature}Controller.cs`
- Command/Query record: `be/src/Syncra.Application/Features/{Feature}/Commands/{Operation}Command.cs`
- Command/Query handler: `be/src/Syncra.Application/Features/{Feature}/Commands/{Operation}CommandHandler.cs`
- Validator (optional): `be/src/Syncra.Application/Features/{Feature}/Commands/{Operation}CommandValidator.cs`
- DTO: `be/src/Syncra.Application/DTOs/{Feature}/{Dto}.cs`
- Repository interface: `be/src/Syncra.Domain/Interfaces/I{Entity}Repository.cs`
- Repository implementation: `be/src/Syncra.Infrastructure/Repositories/{Entity}Repository.cs`
- DI registration: `be/src/Syncra.Infrastructure/DependencyInjection.cs`

**New Frontend Page:**
- Page component: `fe/src/pages/app/{Name}Page.tsx` + `fe/src/pages/app/{Name}Page.module.css`
- Route registration: `fe/src/App.tsx` (inside `AnimatedRoutes` → `/app` route group)
- API functions: `fe/src/api/{feature}.ts`
- Type definitions: `fe/src/api/types.ts` or `fe/src/types/{feature}.ts`
- Context (if needed): `fe/src/context/{Name}Context.tsx`

**New Frontend Component:**
- Component: `fe/src/components/{Name}.tsx` + `fe/src/components/{Name}.module.css`
- Sub-components with their own directory: `fe/src/components/{feature-name}/{SubComponent}.tsx`

**New Social Platform Provider:**
- Provider implementation: `be/src/Syncra.Infrastructure/Social/Providers/{Name}Provider.cs`
- Registration: Update `be/src/Syncra.Infrastructure/Social/DependencyInjection.cs`
- Ensure `ISocialProvider` contract is satisfied with `ProviderId`, `GetAuthorizationUrl`, `ExchangeCodeAsync`, `RefreshTokenAsync`

**New Background Job:**
- Job class: `be/src/Syncra.Infrastructure/Jobs/{Name}.cs`
- Scheduler interface + implementation: `be/src/Syncra.Infrastructure/Jobs/{Name}Scheduler.cs`
- Registration: `be/src/Syncra.Infrastructure/DependencyInjection.cs`
- Scheduling: `be/src/Syncra.Api/Program.cs` (in the `using` scope block after `app.Build()`)

## Special Directories

**`.planning/`:**
- Purpose: GSD planning artifacts (roadmap, phases, state, codebase maps)
- Generated: Yes (by GSD workflow)
- Committed: Yes

**`.agents/`:**
- Purpose: Agent skills and tooling configuration
- Generated: No
- Committed: Yes

**`.gsd/`:**
- Purpose: GSD workflow state, journals, metrics, activity logs
- Generated: Yes (by GSD engine)
- Committed: Yes

**`fe/dist/`:**
- Purpose: Frontend production build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**`fe/node_modules/`:**
- Purpose: Frontend npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (gitignored)

---

*Structure analysis: 2026-05-14*
