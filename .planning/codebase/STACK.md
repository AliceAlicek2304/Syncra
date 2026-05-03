# Technology Stack

**Analysis Date:** 2025-05-14

## Languages

**Primary:**
- C# 12.0 (.NET 8.0) - Backend API and business logic (`be/src/`)
- TypeScript 5.x - Frontend application (`fe/src/`)

**Secondary:**
- SQL - Database migrations (`be/src/Syncra.Infrastructure/Migrations`)
- CSS (Modules) - Frontend styling (`fe/src/components/*.module.css`)

## Runtime

**Environment:**
- .NET 8.0 Runtime (Backend)
- Node.js (Frontend development and build)

**Package Manager:**
- NuGet - Backend dependencies (`*.csproj`)
- npm/pnpm - Frontend dependencies (`fe/package.json`)
- Lockfiles: `fe/package-lock.json` and `fe/pnpm-lock.yaml` present.

## Frameworks

**Core:**
- ASP.NET Core 8.0 - Backend REST API (`be/src/Syncra.Api`)
- React 19.0 - Frontend UI library (`fe/src`)
- Entity Framework Core 8.0 - Object-Relational Mapper (`be/src/Syncra.Infrastructure/Persistence`)

**Testing:**
- xUnit - Unit testing framework (`be/tests/Syncra.UnitTests`)
- FluentAssertions - Assertion library for backend tests.
- Moq - Mocking library for backend tests.

**Build/Dev:**
- Vite 7.x - Frontend build tool and dev server (`fe/vite.config.ts`)
- Docker & Docker Compose - Infrastructure orchestration (`docker-compose.yml`)

## Key Dependencies

**Critical:**
- MediatR - Implementation of the Mediator pattern for CQRS (`be/src/Syncra.Application`)
- FluentValidation - Strongly-typed validation rules (`be/src/Syncra.Application/Common/Behaviors/ValidationBehavior.cs`)
- Serilog - Structured logging (`be/src/Syncra.Api/Program.cs`)
- Hangfire - Background job processing (`be/src/Syncra.Infrastructure/Jobs`)
- StackExchange.Redis - Redis client for caching and locking (`be/src/Syncra.Infrastructure/DependencyInjection.cs`)

**Infrastructure:**
- Npgsql.EntityFrameworkCore.PostgreSQL - PostgreSQL provider for EF Core.
- Stripe.net - SDK for Stripe payment integration.
- Sentry.AspNetCore - Error tracking and performance monitoring.
- Polly - Resilience and transient-fault-handling library (`be/src/Syncra.Infrastructure/Social/DependencyInjection.cs`).

## Configuration

**Environment:**
- `.env` files (not to be read) for frontend and backend secrets.
- `appsettings.json` and `appsettings.Development.json` for backend configuration.

**Build:**
- `fe/tsconfig.json` - TypeScript configuration.
- `fe/vite.config.ts` - Vite configuration.
- `be/src/Syncra.Api/Syncra.Api.csproj` - Backend project file.

## Platform Requirements

**Development:**
- .NET 8.0 SDK
- Node.js 20+
- Docker Desktop (for PostgreSQL and Redis)

**Production:**
- Linux/Windows containers (Docker)
- PostgreSQL 15+
- Redis 7+

---

*Stack analysis: 2025-05-14*
