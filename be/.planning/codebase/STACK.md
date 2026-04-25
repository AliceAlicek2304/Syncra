# Technology Stack

**Analysis Date:** 2024-04-25

## Languages

**Primary:**
- C# 12 / .NET 8.0 - Entire backend codebase (`src/`)

**Secondary:**
- SQL - PostgreSQL dialect used via EF Core migrations and queries

## Runtime

**Environment:**
- .NET 8.0 Runtime

**Package Manager:**
- NuGet
- Lockfile: Not present (standard .csproj project references)

## Frameworks

**Core:**
- ASP.NET Core 8.0 - Web API framework
- MediatR 14.1.0 - In-process messaging for CQRS pattern
- Entity Framework Core 8.0 - Object-Relational Mapper

**Testing:**
- xUnit 2.9.0 - Test runner
- Moq 4.20.72 - Mocking library
- FluentAssertions 8.8.0 - Assertion library

**Build/Dev:**
- MSBuild / dotnet CLI - Build system
- Swashbuckle (Swagger) 6.5.0 - API documentation

## Key Dependencies

**Critical:**
- `Stripe.net` 50.4.1 - Payment processing integration
- `Hangfire` 1.8.14 - Background job processing and scheduling
- `System.IdentityModel.Tokens.Jwt` 8.16.0 - JWT token generation and validation

**Infrastructure:**
- `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.0 - PostgreSQL database provider
- `Microsoft.Extensions.Caching.StackExchangeRedis` 8.0.0 - Redis distributed caching
- `Serilog.AspNetCore` 10.0.0 - Structured logging
- `Sentry.AspNetCore` 6.1.0 - Error tracking and performance monitoring
- `Microsoft.Extensions.Http.Polly` 10.0.4 - HTTP resiliency and transient fault handling

## Configuration

**Environment:**
- `appsettings.json` and `appsettings.Development.json` for base configuration
- Environment variables for secrets (bound to Options classes)

**Build:**
- `.csproj` files for project-level configuration
- `Properties/launchSettings.json` for local development profiles

## Platform Requirements

**Development:**
- .NET 8.0 SDK
- PostgreSQL (local or Docker)
- Redis (optional, falls back to memory cache)

**Production:**
- Linux/Windows/Docker container running .NET 8.0
- Managed PostgreSQL (e.g., AWS RDS, Azure Database for PostgreSQL)
- Managed Redis (e.g., AWS ElastiCache)

---

*Stack analysis: 2024-04-25*
