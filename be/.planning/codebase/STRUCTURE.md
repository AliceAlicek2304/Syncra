# Codebase Structure

**Analysis Date:** 2025-05-15

## Directory Layout

```
Syncra/be/
├── docs/               # Project documentation and sprint plans
├── src/
│   ├── Syncra.Api/     # Presentation layer (Web API)
│   ├── Syncra.Application/ # Business logic and use cases
│   ├── Syncra.Domain/  # Enterprise logic and entities
│   ├── Syncra.Infrastructure/ # External concerns and persistence
│   └── Syncra.Shared/  # Common utilities and constants
├── tests/
│   └── Syncra.UnitTests/ # Unit tests for all layers
└── API_DOCS.md         # API endpoint documentation
```

## Directory Purposes

**Syncra.Api:**
- Purpose: Web API project handling HTTP requests and responses.
- Contains: Controllers, Middleware, API Filters, and Startup configuration.
- Key files: `Program.cs`, `DependencyInjection.cs`, `Middleware/GlobalExceptionMiddleware.cs`.

**Syncra.Application:**
- Purpose: Implements the use cases of the system using the CQRS pattern.
- Contains: Commands, Queries, DTOs, Handlers, and Pipeline Behaviors.
- Key files: `Features/`, `DTOs/`, `Common/Behaviors/`.

**Syncra.Domain:**
- Purpose: Core domain model representing business concepts and rules.
- Contains: Entities, Value Objects, Enums, and Repository Interfaces.
- Key files: `Entities/Workspace.cs`, `Interfaces/IWorkspaceRepository.cs`.

**Syncra.Infrastructure:**
- Purpose: Implementation of external interfaces and data persistence.
- Contains: EF Core context, Repository implementations, Social media adapters, and Background jobs.
- Key files: `Persistence/AppDbContext.cs`, `Repositories/WorkspaceRepository.cs`, `Jobs/`.

**Syncra.Shared:**
- Purpose: Shared code that can be used by any layer without violating dependency rules.
- Contains: Constants, Extension methods, and Helpers.
- Key files: `Constants/`, `Extensions/`.

## Key File Locations

**Entry Points:**
- `src/Syncra.Api/Program.cs`: Main API entry point.
- `src/Syncra.Infrastructure/Jobs/`: Background job definitions.

**Configuration:**
- `src/Syncra.Api/DependencyInjection.cs`: API-specific service registration.
- `src/Syncra.Application/DependencyInjection.cs`: Application layer registration (MediatR, Validators).
- `src/Syncra.Infrastructure/DependencyInjection.cs`: Infrastructure layer registration (DB, Repositories).

**Core Logic:**
- `src/Syncra.Domain/Entities/`: Business logic encapsulated in entities.
- `src/Syncra.Application/Features/`: Implementation of business use cases.

**Testing:**
- `tests/Syncra.UnitTests/`: Root directory for unit tests.

## Naming Conventions

**Files:**
- PascalCase for all C# files: `WorkspaceRepository.cs`, `CreateWorkspaceCommand.cs`.
- Interface files prefixed with 'I': `IWorkspaceRepository.cs`.

**Directories:**
- PascalCase: `Features`, `Entities`, `Middleware`.

## Where to Add New Code

**New Feature (e.g., 'Comments'):**
- Primary code: `src/Syncra.Application/Features/Comments/` (Commands/Queries/Handlers).
- Entities: `src/Syncra.Domain/Entities/Comment.cs`.
- Repositories: `src/Syncra.Domain/Interfaces/ICommentRepository.cs` and `src/Syncra.Infrastructure/Repositories/CommentRepository.cs`.
- Controller: `src/Syncra.Api/Controllers/CommentsController.cs`.
- Tests: `tests/Syncra.UnitTests/Application/Features/Comments/`.

**New Component/Module:**
- Implementation: `src/Syncra.Infrastructure/Services/` or `src/Syncra.Infrastructure/[Module]/`.
- Interface: `src/Syncra.Application/Interfaces/` or `src/Syncra.Domain/Interfaces/`.

**Utilities:**
- Shared helpers: `src/Syncra.Shared/Helpers/` or `src/Syncra.Shared/Extensions/`.

## Special Directories

**Syncra.Api/wwwroot/uploads:**
- Purpose: Local storage for uploaded media (in development).
- Generated: No.
- Committed: Yes (the directory structure).

**Syncra.Infrastructure/Migrations:**
- Purpose: EF Core database migrations.
- Generated: Yes (via `dotnet ef migrations add`).
- Committed: Yes.

---

*Structure analysis: 2025-05-15*
