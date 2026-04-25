# Architecture

**Analysis Date:** 2025-05-15

## Pattern Overview

**Overall:** Clean Architecture (Onion Architecture) with CQRS.

**Key Characteristics:**
- **Layered Isolation:** Dependency flow is towards the core (Domain). Infrastructure and API depend on Application and Domain, not vice-versa.
- **CQRS with MediatR:** Separation of commands (write) and queries (read) using the Mediator pattern for use cases.
- **Domain-Driven Design (DDD):** Rich domain models with encapsulated behaviors and value objects.

## Layers

**Domain Layer:**
- Purpose: Contains the enterprise logic and state.
- Location: `src/Syncra.Domain/`
- Contains: Entities (`Entities/`), Value Objects (`ValueObjects/`), Domain Exceptions (`Exceptions/`), Enums (`Enums/`), and Repository Interfaces (`Interfaces/`).
- Depends on: None (it's the core).
- Used by: Application, Infrastructure, Api.

**Application Layer:**
- Purpose: Coordinates the use cases and business rules.
- Location: `src/Syncra.Application/`
- Contains: Feature-based Commands/Queries (`Features/`), DTOs (`DTOs/`), MediatR Behaviors (`Common/Behaviors/`), and Service Interfaces.
- Depends on: Domain.
- Used by: Api, Infrastructure (via interfaces).

**Infrastructure Layer:**
- Purpose: Implementation details, persistence, and external service integrations.
- Location: `src/Syncra.Infrastructure/`
- Contains: EF Core Context (`Persistence/`), Repositories (`Repositories/`), Social Media Adapters (`Publishing/`), Background Jobs (`Jobs/`), and External Services implementation.
- Depends on: Domain, Application.
- Used by: Api (via DI).

**API Layer:**
- Purpose: The entry point and interface for external consumers.
- Location: `src/Syncra.Api/`
- Contains: Controllers (`Controllers/`), Middleware (`Middleware/`), Filters (`Filters/`), and Startup configuration.
- Depends on: Application, Infrastructure (for DI registration).
- Used by: External clients.

## Data Flow

**Standard Command Flow:**

1. `Controller` receives an HTTP request and extracts data into a DTO.
2. `Controller` maps the DTO to a MediatR `Command`.
3. `Mediator` dispatches the command through a pipeline of `Behaviors` (Logging, Validation, Performance).
4. `CommandHandler` in the Application layer receives the command.
5. `CommandHandler` uses `Repositories` (Domain interfaces) to fetch/persist `Entities`.
6. `Entities` perform domain logic and state changes.
7. `CommandHandler` saves changes via `UnitOfWork`.
8. `CommandHandler` returns a DTO back to the `Controller`.
9. `Controller` returns the appropriate HTTP response.

**State Management:**
- Server-side state is persisted in PostgreSQL via EF Core.
- Transient application state is handled within the scope of the HTTP request.
- Background state and recurring tasks are managed by Hangfire.

## Key Abstractions

**Repository Pattern:**
- Purpose: Abstracts data access logic.
- Examples: `src/Syncra.Domain/Interfaces/IWorkspaceRepository.cs`, `src/Syncra.Infrastructure/Repositories/WorkspaceRepository.cs`
- Pattern: Repository and Unit of Work.

**Adapter Pattern:**
- Purpose: Decouples the application from external social media APIs.
- Examples: `src/Syncra.Domain/Interfaces/IPublishAdapter.cs`, `src/Syncra.Infrastructure/Publishing/Adapters/TikTok/TikTokPublishAdapter.cs`
- Pattern: Adapter/Registry pattern.

## Entry Points

**Web API:**
- Location: `src/Syncra.Api/Program.cs`
- Triggers: HTTP Requests.
- Responsibilities: Configuring services, middleware, and starting the Kestrel server.

**Background Jobs:**
- Location: `src/Syncra.Infrastructure/Jobs/`
- Triggers: Hangfire recurring or delayed triggers.
- Responsibilities: Token refreshing (`IntegrationTokenRefreshJob`), scheduled posting.

## Error Handling

**Strategy:** Centralized exception handling via Middleware.

**Patterns:**
- **GlobalExceptionMiddleware:** Catches all unhandled exceptions, logs them, and returns a structured JSON error response.
- **ValidationException:** Thrown by FluentValidation behavior when request validation fails (results in 400 Bad Request).
- **DomainException:** Thrown when business rules are violated (results in 400 or 409).

## Cross-Cutting Concerns

**Logging:** Serilog with redaction (`Syncra.Api/Logging/RedactingEnricher.cs`) and Sentry integration.
**Validation:** FluentValidation integrated via MediatR pipeline behaviors (`Syncra.Application/Common/Behaviors/ValidationBehavior.cs`).
**Authentication:** JWT-based authentication using ASP.NET Core Identity.
**Multi-tenancy:** Header-based tenant resolution (`X-Workspace-Id`) via `TenantResolutionMiddleware`.

---

*Architecture analysis: 2025-05-15*
