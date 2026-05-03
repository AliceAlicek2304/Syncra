# Codebase Structure

**Analysis Date:** 2025-02-14

## Directory Layout

```text
[project-root]/
├── be/                 # Backend (ASP.NET Core)
│   ├── src/            # Source code
│   │   ├── Syncra.Api/           # API Layer (Controllers, Middleware)
│   │   ├── Syncra.Application/   # Application Layer (CQRS Features, DTOs)
│   │   ├── Syncra.Domain/        # Domain Layer (Entities, Rules)
│   │   ├── Syncra.Infrastructure/# Infrastructure Layer (DB, Jobs, Services)
│   │   └── Syncra.Shared/        # Shared Utilities & Constants
│   └── tests/          # Unit and Integration Tests
├── fe/                 # Frontend (React + Vite)
│   ├── public/         # Static assets
│   └── src/            # Source code
│       ├── assets/     # Images, icons, etc.
│       ├── components/ # Reusable UI components
│       ├── context/    # React Context providers
│       ├── data/       # Mock and static data
│       ├── pages/      # Page-level components (Routing)
│       ├── types/      # TypeScript definitions
│       └── utils/      # Shared helper functions
└── docs/               # General documentation
```

## Directory Purposes

**be/src/Syncra.Api:**
- Purpose: External interface for the backend.
- Contains: Controllers, Middleware (Exception handling, Tenant resolution), DI setup.
- Key files: `Program.cs`, `Controllers/`, `Middleware/`.

**be/src/Syncra.Application:**
- Purpose: Business logic orchestrated via CQRS.
- Contains: `Features/` (Commands/Queries), `DTOs/`, `Interfaces/` for services.
- Key files: `DependencyInjection.cs`.

**be/src/Syncra.Domain:**
- Purpose: Core business models and invariants.
- Contains: `Entities/`, `ValueObjects/`, `Enums/`, `Exceptions/`.
- Key files: `Entities/User.cs`, `Entities/Post.cs`.

**be/src/Syncra.Infrastructure:**
- Purpose: Implementation of cross-cutting and external concerns.
- Contains: `Persistence/` (EF Core), `Jobs/` (Hangfire), `Repositories/`, `Services/`.
- Key files: `Persistence/AppDbContext.cs`.

**fe/src/components:**
- Purpose: Reusable UI blocks, often with co-located CSS Modules.
- Contains: `.tsx` and `.module.css` files.
- Key files: `Navbar.tsx`, `Hero.tsx`.

**fe/src/context:**
- Purpose: Global state management.
- Contains: Context providers for Auth, Billing, etc.
- Key files: `AuthContext.tsx`.

**fe/src/pages:**
- Purpose: Top-level route components.
- Contains: Components representing different views (Dashboard, Ideas, etc.).
- Key files: `app/AppLayout.tsx`, `app/DashboardPage.tsx`.

## Key File Locations

**Entry Points:**
- `be/src/Syncra.Api/Program.cs`: Backend startup.
- `fe/src/main.tsx`: Frontend startup.

**Configuration:**
- `be/src/Syncra.Api/appsettings.json`: Backend config.
- `fe/vite.config.ts`: Vite build config.
- `fe/tsconfig.json`: TypeScript configuration.

**Core Logic:**
- `be/src/Syncra.Application/Features/`: CQRS Handlers.
- `fe/src/context/`: Frontend state orchestration.

**Testing:**
- `be/tests/Syncra.UnitTests/`: Backend unit tests.

## Naming Conventions

**Files:**
- .NET (Backend): PascalCase (e.g., `UserController.cs`).
- React (Frontend): PascalCase for components (`DashboardPage.tsx`), camelCase for utilities (`api.ts`).

**Directories:**
- .NET (Backend): PascalCase (e.g., `Features`, `Common`).
- React (Frontend): camelCase or kebab-case for groupings (`create-post`, `utils`), PascalCase for component-specific folders.

## Where to Add New Code

**New Feature (Full Stack):**
1. **Backend Domain:** Add entity in `be/src/Syncra.Domain/Entities/`.
2. **Backend Application:** Add Command/Query in `be/src/Syncra.Application/Features/[FeatureName]/`.
3. **Backend API:** Add endpoint in `be/src/Syncra.Api/Controllers/[FeatureName]Controller.cs`.
4. **Frontend API:** Update `fe/src/utils/api.ts` if needed (though it's generic).
5. **Frontend Component:** Add UI in `fe/src/components/` or `fe/src/pages/app/`.

**New Utility:**
- Backend: `be/src/Syncra.Shared/Helpers/` or `Extensions/`.
- Frontend: `fe/src/utils/`.

## Special Directories

**be/src/Syncra.Infrastructure/Migrations:**
- Purpose: EF Core database migration files.
- Generated: Yes.
- Committed: Yes.

**fe/dist:**
- Purpose: Production build output.
- Generated: Yes.
- Committed: No (ignored).

---

*Structure analysis: 2025-02-14*
