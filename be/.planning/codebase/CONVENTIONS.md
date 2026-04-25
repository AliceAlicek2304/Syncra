# Coding Conventions

**Analysis Date:** 2025-03-04

## Naming Patterns

**Files:**
- PascalCase: `AuthController.cs`, `RegisterCommand.cs`, `EntityBase.cs`.
- Follows class name: `public class RegisterCommand` is in `RegisterCommand.cs`.

**Functions:**
- PascalCase for all methods: `public async Task Handle(...)`, `public static User Create(...)`.
- Test methods follow `Method_Condition_Expectation` pattern: `Handle_ValidCommand_CreatesWorkspaceSuccessfully`.

**Variables:**
- camelCase for local variables and parameters: `cancellationToken`, `registerDto`, `existingUser`.
- camelCase with underscore prefix for private fields: `_mediator`, `_userRepository`, `_unitOfWork`.

**Types:**
- PascalCase for Classes, Interfaces, Enums: `IUserRepository`, `PostStatus`, `DomainException`.
- Interfaces prefixed with `I`: `ITokenService`, `IUnitOfWork`.

## Code Style

**Formatting:**
- Visual Studio / JetBrains Rider defaults for C#.
- File-scoped namespaces: `namespace Syncra.Api.Controllers;`.
- Braces on new lines (Allman style).
- Explicit access modifiers (e.g., `private readonly`, `public sealed class`).

**Linting:**
- Standard Roslyn analyzers (implied by .NET project).
- No specific `.editorconfig` detected in root.

## Import Organization

**Order:**
1. System/Microsoft namespaces.
2. Third-party libraries (e.g., `MediatR`, `Moq`).
3. Project namespaces (`Syncra.*`).
4. Aliases: `using BC = BCrypt.Net.BCrypt;`.

**Path Aliases:**
- Not applicable in C# (standard project references used).

## Error Handling

**Patterns:**
- Use of `DomainException` for business logic and validation errors: `throw new DomainException("user_exists", "...");`.
- Centralized error handling via `GlobalExceptionMiddleware` in `src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs`.
- Mapping of exception types to HTTP status codes (400, 401, 404, 500).

## Logging

**Framework:** Serilog

**Patterns:**
- Configured in `Program.cs` via `builder.Host.UseSerilog`.
- Injected via `ILogger<T>` in classes.
- Use of custom enrichers: `RedactingEnricher` in `src/Syncra.Api/Logging/RedactingEnricher.cs`.
- Global exception logging in `GlobalExceptionMiddleware`.

## Comments

**When to Comment:**
- Minimal commenting observed.
- Grouping comments in controllers or handlers: `// Generate tokens`, `// Create session and refresh token`.
- Used for TODOs and FIXMEs (detected via grep).

**JSDoc/TSDoc:**
- XML Documentation comments (`///`) occasionally used for public API (implied by Swagger setup).

## Function Design

**Size:**
- Small, focused methods in entities and handlers.
- Handlers usually contain logic or delegate to domain entities.

**Parameters:**
- Use of `CancellationToken` in almost all async methods.
- DTOs for grouping input parameters in controllers.

**Return Values:**
- `Task<T>` for async operations.
- `IActionResult` or `Task<IActionResult>` for controller actions.
- `ValueTask` occasionally for performance-sensitive operations (not explicitly seen but common in .NET).

## Module Design

**Exports:**
- `public` access for most classes intended for DI or external use.
- `internal` or `private` for implementation details.
- `sealed` classes for Handlers and Entities to prevent inheritance where not needed.

**Barrel Files:**
- Dependency Injection extension methods act as "barrels" for service registration: `AddApplicationServices()`, `AddInfrastructureServices()`.

---

*Convention analysis: 2025-03-04*
