# Technology Stack

**Analysis Date:** 2026-05-25

## Languages

**Primary:**
- **C#** (.NET 8.0) — Backend API, application logic, domain model, infrastructure (`be/src/`)
- **TypeScript** ~5.9 — Frontend application (`fe/src/`)

**Secondary:**
- **SQL** — EF Core migrations and seed data (`be/src/Syncra.Infrastructure/Migrations/`)

## Runtime

**Environment:**
- **.NET 8.0 SDK** — Backend runtime (`be/src/Syncra.Api/Syncra.Api.csproj`, `TargetFramework=net8.0`)
- **Node.js** (via Vite) — Frontend dev server and build

**Package Manager:**
- **NuGet** — Backend dependency manager
- **npm** — Frontend dependency manager (`fe/package.json`)
- Lockfile: `fe/package-lock.json` present, also `fe/pnpm-lock.yaml` present (migration artifact)

## Frameworks

**Core:**
- **ASP.NET Core 8.0** — REST API framework with controllers and Minimal API endpoints (`be/src/Syncra.Api/`)
- **React 19.2** — Frontend UI library (`fe/src/`)
- **React Router 7.13** — Client-side routing (`fe/src/App.tsx`)
- **Vite 7.3** — Frontend build tool and dev server (`fe/vite.config.ts`)

**State Management:**
- **TanStack React Query 5.100** — Server state management, caching, and mutations (`fe/src/hooks/`)
- **React Context** — Client-side state (Auth, Workspace, Billing, Calendar, Repurpose, Toast) (`fe/src/context/`)
- No Zustand or Redux present

**UI & Styling:**
- **Framer Motion 12.38** — Animation library (`fe/src/components/`)
- **Lucide React 0.575** — Icon library
- **react-day-picker 9.14** — Date picker component
- **@dnd-kit** (core 6.3 / sortable 10.0 / utilities 3.2) — Drag-and-drop for Kanban board (`fe/src/pages/app/IdeasPage.tsx`)
- **react-hook-form 7.75** + **@hookform/resolvers 5.2** — Form management
- **zod 4.4** — Schema validation
- **date-fns 4.1** — Date utilities
- **CSS Modules** — Component-scoped styling (e.g., `BillingSection.module.css`)

**Testing:**
- **Vitest 4.1** — Unit test runner (`fe/vitest.config.ts`)
- **@testing-library/react 16.3** — Component testing
- **@testing-library/jest-dom 6.9** — DOM matchers
- **Playwright 1.59** — E2E testing (`fe/playwright.config.ts`)
- **xUnit 2.9** — Backend unit test framework (`be/tests/Syncra.UnitTests/`)
- **Moq 4.20** — Mocking for .NET tests
- **FluentAssertions 8.8** — Assertion library for .NET tests
- **coverlet 6.0** — Code coverage collection

**Architecture / Mediation:**
- **MediatR 14.1** — CQRS / mediator pattern for backend (`be/src/Syncra.Application/`)
- **FluentValidation 11.11** — Request validation pipeline
- **BCrypt.Net-Next 4.1** — Password hashing

## Key Dependencies

**Critical:**
- **Zernio 0.0.281** — Unified social media API integration client (`be/src/Syncra.Infrastructure/Services/ZernioClient.cs`)
- **Entity Framework Core 8.0** — ORM / database access (`be/src/Syncra.Infrastructure/Persistence/AppDbContext.cs`)
- **Npgsql.EntityFrameworkCore.PostgreSQL 8.0** — PostgreSQL provider for EF Core
- **StackExchange.Redis** / **Microsoft.Extensions.Caching.StackExchangeRedis 8.0** — Redis caching layer
- **Serilog.AspNetCore 10.0** + Serilog.Sinks.Console 6.1 — Structured logging
- **Sentry.AspNetCore 6.1** — Error tracking
- **Stripe.net 50.4** — Payment processing integration
- **Hangfire 1.8.14** + Hangfire.PostgreSql 1.20.5 — Background job processing (token refresh, post publishing)
- **@microsoft/signalr 8.0** — Real-time notifications via WebSocket
- **axios 1.16** — HTTP client for API requests (`fe/src/lib/axios.ts`)
- **Microsoft.AspNetCore.Authentication.JwtBearer 8.0** — JWT authentication
- **Polly** (via Microsoft.Extensions.Http.Polly 10.0) — HTTP resilience policies (retry, timeout)

**Infrastructure:**
- **Swashbuckle.AspNetCore 6.5** — Swagger/OpenAPI for API documentation
- **Microsoft.AspNetCore.OpenApi 8.0** — OpenAPI support
- **Hangfire.AspNetCore 1.8.14** — Background jobs dashboard
- **System.IdentityModel.Tokens.Jwt 8.16** — JWT token generation and validation
- **Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore 8.0** — Database health checks

## Configuration

**Environment:**
- Backend: `appsettings.json` and `appsettings.Development.json` (`be/src/Syncra.Api/`)
- Frontend: Vite env vars via `import.meta.env.VITE_*` (e.g., `VITE_API_BASE_URL`)
- Token storage: `localStorage` keys `syncra_access_token`, `syncra_workspace_id`

**Build:**
- `be/src/Syncra.Api/Syncra.Api.csproj` — .NET build configuration
- `fe/vite.config.ts` — Vite build config with dev proxy (`/Syncra/api` → `http://localhost:5260`)
- `fe/tsconfig.json`, `fe/tsconfig.app.json`, `fe/tsconfig.node.json` — TypeScript config
- `fe/eslint.config.js` — ESLint configuration (TypeScript + React Hooks + React Refresh)

## Platform Requirements

**Development:**
- .NET 8.0 SDK
- Docker Desktop (for PostgreSQL 15 + Redis 7 via `docker-compose.yml`)
- Node.js + npm
- ngrok (for OAuth callback URLs during local development)

**Production:**
- PostgreSQL 15 database
- Redis 7 cache
- .NET 8 runtime
- Reverse proxy (nginx/IIS) for API
- File storage (local filesystem or Cloudflare R2 via presigned URLs)

---

*Stack analysis: 2026-05-25*
