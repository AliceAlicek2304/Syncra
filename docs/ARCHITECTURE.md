# Syncra Architecture

This document defines the architectural shape, boundary rules, and technology stack of the Syncra workspace automation platform.

## Technology Stack

Syncra is built as a split-client application with an ASP.NET Core backend and a Vite + React frontend.

- **Backend**: ASP.NET Core 8.0 (C#)
- **Frontend**: Vite + React + TypeScript (Vanilla CSS and Tailwind)
- **Database**: PostgreSQL (Entity Framework Core)
- **Caching**: Redis
- **Background Jobs**: Hangfire (dev dashboard on `/hangfire`)
- **Payments**: Stripe
- **Monitoring/Logging**: Serilog + Sentry
- **Local Dev Proxy**: ngrok (required for OAuth provider callback webhooks)

## Project Layering

The backend follows clean architecture guidelines:

```text
Syncra.Domain (Domain Entities & Enums)
  ^
  |
Syncra.Application (Interfaces, DTOs, MediatR Commands/Queries, Services)
  ^
  |
Syncra.Infrastructure (EF Core DbContext, Repositories, Jobs, Social/OAuth, Payments)
  ^
  |
Syncra.Api (Controllers, Middlewares, Program.cs entrypoint)
```

### Dependency Rules
- **Syncra.Domain** is the core and has zero dependencies on other layers or external frameworks.
- **Syncra.Application** contains application-specific business rules. It depends on `Syncra.Domain` and exposes interfaces, but has no dependency on infrastructure or controllers.
- **Syncra.Infrastructure** implements interfaces defined in Application, referencing database contexts, Hangfire jobs, external APIs (Stripe, OAuth).
- **Syncra.Api** maps incoming HTTP requests to application commands/queries, configures CORS, handles JWT authentication, and coordinates program startup.

## Parse-First Boundary Rule

Unknown data must be parsed at boundaries before it enters inner application logic.

Boundaries include:
- HTTP request bodies, headers, and query parameters (validated in Controllers/MediatR pipelines).
- OAuth Callback payloads (handled in `Syncra.Infrastructure.Social` and parsed into domain events/DTOs).
- Webhook endpoints (validated via signatures before processing).

Target flow:
```text
Raw HTTP Request -> Controller (DTO validation) -> Command/Query -> Application Handler -> Domain Model
```

## Observability Contract

The backend incorporates logging via Serilog and Sentry. In production, requests should produce structured logs mapping:
- `timestamp`
- `level`
- `request_id`
- `user_id` (when authenticated)
- `duration_ms`
- `status_code`

Audit logs for platform updates are treated as first-class product records in the database, separated from developer-centric application debug logs.
