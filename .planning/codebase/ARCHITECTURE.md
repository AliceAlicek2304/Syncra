<!-- refreshed: 2025-02-14 -->
# Architecture

**Analysis Date:** 2025-02-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                    │
├──────────────────┬──────────────────┬───────────────────────┤
│      Pages       │    Components    │    Context (State)    │
│    `fe/src/pages`│`fe/src/components`│   `fe/src/context`   │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    ASP.NET Core API Layer                   │
│                    `be/src/Syncra.Api`                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Logic (CQRS)                 │
│                 `be/src/Syncra.Application`                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure (Persistence)               │
│               `be/src/Syncra.Infrastructure`                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    SQL Database / Storage                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| API Controller | Handles HTTP requests, validates input models, and dispatches commands/queries. | `be/src/Syncra.Api/Controllers/` |
| Features (CQRS) | Contains business logic for specific use cases (Commands and Queries). | `be/src/Syncra.Application/Features/` |
| Persistence | Handles database access using Entity Framework Core. | `be/src/Syncra.Infrastructure/Persistence/` |
| Domain Entities | Core business models and rules. | `be/src/Syncra.Domain/Entities/` |
| React Components | UI presentation and local state management. | `fe/src/components/` |
| Context Providers | Global state management (Auth, Billing, Workspace). | `fe/src/context/` |

## Pattern Overview

**Overall:** Clean Architecture (Backend) and Modular Component-based (Frontend).

**Key Characteristics:**
- **Separation of Concerns:** Clearly defined layers in the backend to isolate business logic from infrastructure.
- **CQRS (Command Query Responsibility Segregation):** Used in the Application layer to separate read and write operations.
- **Dependency Injection:** Heavily used in .NET for decoupling services and their implementations.
- **Context API:** Used in the React frontend for managing cross-cutting state like authentication and billing.

## Layers

**API Layer (Backend):**
- Purpose: Entry point for external requests, handling HTTP, Authentication, and Middleware.
- Location: `be/src/Syncra.Api`
- Contains: Controllers, Middleware, Filters, and Startup configuration.
- Depends on: `Syncra.Application`, `Syncra.Infrastructure` (for DI registration).

**Application Layer (Backend):**
- Purpose: Orchestrates business logic and use cases.
- Location: `be/src/Syncra.Application`
- Contains: Commands, Queries, Handlers, DTOs, and Interfaces.
- Depends on: `Syncra.Domain`.

**Infrastructure Layer (Backend):**
- Purpose: Implementation of external concerns (DB, File Storage, Social APIs).
- Location: `be/src/Syncra.Infrastructure`
- Contains: Repositories, DB Context, Migrations, and External Service Clients.
- Depends on: `Syncra.Application`, `Syncra.Domain`.

**Domain Layer (Backend):**
- Purpose: Core business entities and logic that is independent of any technology.
- Location: `be/src/Syncra.Domain`
- Contains: Entities, Value Objects, Enums, and Domain Exceptions.

**UI Layer (Frontend):**
- Purpose: User interface and interaction logic.
- Location: `fe/src/`
- Contains: Pages, Components, Hooks, and Assets.

## Data Flow

### Primary Request Path

1. Frontend initiates request via `apiFetch` (`fe/src/utils/api.ts`).
2. Controller receives request (`be/src/Syncra.Api/Controllers/`).
3. Controller dispatches a Command/Query via MediatR to the Application layer.
4. Handler in Application layer processes business logic, interacting with Domain entities.
5. Handler uses Repository interfaces to persist/retrieve data from Infrastructure (`be/src/Syncra.Infrastructure/Persistence/`).
6. Result is returned as a DTO to the Controller.
7. Controller returns HTTP response to the Frontend.

### Background Processing Flow

1. Recurring jobs or triggered tasks are handled by Hangfire.
2. Job Handlers reside in `be/src/Syncra.Infrastructure/Jobs/`.
3. Jobs interact with Application services or Infrastructure repositories.

**State Management:**
- Backend: Stateless, using JWT for authentication and database for persistence.
- Frontend: Context API for global state (`fe/src/context/`), local `useState` for component-level state.

## Key Abstractions

**Repository Pattern:**
- Purpose: Decouples the application layer from data access technology.
- Examples: `be/src/Syncra.Infrastructure/Repositories/`
- Pattern: Interface defined in `Domain` or `Application`, implemented in `Infrastructure`.

**Mediator Pattern:**
- Purpose: Decouples the sender of a request from its receiver.
- Examples: `be/src/Syncra.Application/Features/`
- Pattern: MediatR used for Commands and Queries.

## Entry Points

**API Entry Point:**
- Location: `be/src/Syncra.Api/Program.cs`
- Triggers: HTTP Requests.
- Responsibilities: Configures DI, Middleware, Routing, and starts the web server.

**Frontend Entry Point:**
- Location: `fe/src/main.tsx`
- Triggers: Browser page load.
- Responsibilities: Mounts the React application and provides the router.

## Architectural Constraints

- **Multi-tenancy:** Handled via `TenantResolutionMiddleware` (`be/src/Syncra.Api/Middleware/TenantResolutionMiddleware.cs`) using `X-Workspace-Id` header.
- **Clean Architecture Dependencies:** `Domain` must not depend on any other layer. `Application` only depends on `Domain`.
- **Stateless API:** The API is stateless, relying on JWTs in the `Authorization` header.

## Anti-Patterns

### Logic in Controllers
**What happens:** Business logic placed directly inside API controllers.
**Why it's wrong:** Makes controllers hard to test and reuse; violates separation of concerns.
**Do this instead:** Use MediatR Commands/Queries in `be/src/Syncra.Application/Features/`.

### Cross-Layer Direct Access
**What happens:** Application layer directly using EF Core `DbContext`.
**Why it's wrong:** Couples business logic to a specific persistence technology.
**Do this instead:** Use Repository interfaces defined in `Application` or `Domain`.

## Error Handling

**Strategy:** Centralized exception handling via Middleware.

**Patterns:**
- **Global Exception Middleware:** `be/src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs` catches unhandled exceptions and returns standardized error responses.
- **Domain Exceptions:** Specific exceptions defined in `be/src/Syncra.Domain/Exceptions/` for business rule violations.

## Cross-Cutting Concerns

**Logging:** Serilog integrated in `be/src/Syncra.Api/Program.cs`.
**Validation:** FluentValidation (likely used) or DataAnnotations for DTO validation in the Application layer.
**Authentication:** JWT-based, configured in `be/src/Syncra.Api/DependencyInjection.cs`.

---

*Architecture analysis: 2025-02-14*
