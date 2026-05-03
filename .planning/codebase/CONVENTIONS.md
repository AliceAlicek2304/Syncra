# Coding Conventions

**Analysis Date:** 2025-02-14

## Naming Patterns

### Frontend (React/TypeScript)
**Files:**
- Components: PascalCase (e.g., `AICoach.tsx`, `Navbar.tsx`) in `fe/src/components/`
- Contexts: camelCase for files (e.g., `calendarContextBase.ts`) but PascalCase for provider files (e.g., `CalendarContext.tsx`)
- Utilities: camelCase (e.g., `api.ts`, `shortId.ts`)

**Functions:**
- Functional Components: PascalCase (e.g., `function Homepage()`)
- Hooks: `use` prefix (e.g., `useAuth`)
- Utility functions: camelCase (e.g., `apiFetch`)

**Variables:**
- Local variables: camelCase
- Constants: SCREAMING_SNAKE_CASE (though many local constants use camelCase)

**Types:**
- Interfaces and Types: PascalCase (e.g., `ReactNode`, `BillingPlan`)

### Backend (.NET/C#)
**Files:**
- Classes: PascalCase (e.g., `Post.cs`, `PostsController.cs`)
- Projects: PascalCase with dot notation (e.g., `Syncra.Api.csproj`)

**Namespaces:**
- Follow directory structure: `Syncra.{Layer}.{Folder}` (e.g., `namespace Syncra.Domain.Entities`)

**Classes:**
- PascalCase
- Use `sealed` by default for domain entities and services (e.g., `public sealed class Post`)

**Properties:**
- PascalCase (e.g., `public Guid UserId { get; private set; }`)
- Use private setters for encapsulation in domain entities.

**Methods:**
- PascalCase (e.g., `public static Post Create(...)`)
- Use factory methods (`Create`) instead of public constructors for domain entities.

## Code Style

### Frontend
**Formatting:**
- Standard Vite/React defaults. No explicit `.prettierrc` found, likely using ESLint for style enforcement.

**Linting:**
- ESLint configured in `fe/eslint.config.js`.
- Uses `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`.

### Backend
**Formatting:**
- Standard .NET/C# conventions (PascalCase, K&R style braces).
- Braces on new lines for classes and methods.

**Linting:**
- Implicitly handled by modern MSBuild/Roslyn analyzers. No `.editorconfig` detected in root, but standard C# rules apply.

## Import Organization

### Frontend
**Order:**
1. External libraries (`react`, `react-router-dom`)
2. Internal contexts and hooks
3. Internal components
4. Internal pages
5. Types (using `import type`)

**Path Aliases:**
- Not detected. Relative paths used (e.g., `../../components/Navbar`).

## Error Handling

### Frontend
- Centralized API fetching in `fe/src/utils/api.ts` with response checking and error throwing.
- Uses `try/catch` in components for UI-level error handling.

### Backend
- Centralized via `GlobalExceptionMiddleware.cs` in `be/src/Syncra.Api/Middleware/`.
- Maps specific exceptions (e.g., `DomainException`, `ValidationException`, `StripeException`) to HTTP status codes and structured JSON responses.
- Uses Sentry for capturing unhandled exceptions (`SentrySdk.CaptureException(ex)`).

## Logging

### Backend
**Framework:** Serilog with Sentry integration.
**Patterns:**
- Configured in `be/src/Syncra.Api/Program.cs`.
- Uses `ILogger<T>` for dependency injection.
- Structured logging with `RedactingEnricher` to protect sensitive data.

## Module Design

### Frontend
**Exports:** Named exports for utilities, default exports for components.
**Contexts:** Heavy use of React Context for state management (`AuthContext`, `BillingContext`, etc.).

### Backend
**Architecture:** Clean Architecture with clear layer separation:
- `Syncra.Domain`: Entities, Value Objects, Domain Exceptions.
- `Syncra.Application`: DTOs, Services, Interfaces.
- `Syncra.Infrastructure`: Persistence (EF Core), External Integrations (Stripe, Social APIs).
- `Syncra.Api`: Controllers, Middleware.

---

*Convention analysis: 2025-02-14*
