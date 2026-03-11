# Day 2 – Identity, Workspace, and Persistence Base

Date / Time:
Day 2 of 7

Sprint:
Sprint 1 – Backend Foundation

Focus Area:
Initial schema, authentication baseline, user/profile endpoints, workspace scaffolding, audit logging, and idempotency foundation.

Tasks:
- create core persistence models for `users`, `user_profiles`, `user_sessions`, `refresh_tokens`, `workspaces`, `workspace_members`, `plans`, `subscriptions`, `usage_counters`, `audit_logs`, and `idempotency_records`
- apply database naming, soft delete, indexing, and optimistic concurrency rules from `backend-task.md`
- create the initial migration and validate it against a clean PostgreSQL instance
- seed reference data for plans and any required default values
- implement auth module skeleton for register, login, logout, refresh, and `me` flow contracts
- configure JWT bearer authentication and token issuance baseline for MVP
- implement protected `POST /api/v1/auth/me` or `GET /api/v1/auth/me` flow based on agreed API convention
- implement `GET /api/v1/users/me` with user profile projection
- scaffold workspace creation, current workspace lookup, and member listing contracts and repository layer
- add audit logging pipeline for sensitive operations such as auth, profile changes, and workspace creation
- add idempotency middleware or request pipeline skeleton for future mutation endpoints and webhook processing
- standardize success and error response envelopes for identity-related endpoints
- update backend documentation and API docs for all endpoints created today

---

## Task: Create core persistence models for identity, workspace, billing baseline, audit logging, and idempotency

### Purpose
This task establishes the first real database-backed foundation of the backend. The tables created today become the base for authentication, user profile access, workspace membership, billing expansion, request traceability, and safe retry behavior for future write endpoints.

### Implementation Steps

#### Step 1
Create or confirm the following backend folders exist under `be/src` so persistence code has a predictable home:
- `domain/entities`
- `domain/enums`
- `application/abstractions`
- `infrastructure/persistence`
- `infrastructure/persistence/configurations`
- `modules/auth`
- `modules/users`
- `modules/workspaces`

#### Step 2
Define shared base entity conventions that all mutable entities can inherit:
- `Id` as `Guid`
- `CreatedAtUtc`
- `UpdatedAtUtc`
- `DeletedAtUtc`
- `Version`
- optional `WorkspaceId`
- optional `Metadata`

Recommended base classes:
- `EntityBase`
- `WorkspaceEntityBase`
- `AuditableEntityBase`

#### Step 3
Create domain entities for:
- `User`
- `UserProfile`
- `UserSession`
- `RefreshToken`
- `Workspace`
- `WorkspaceMember`
- `Plan`
- `Subscription`
- `UsageCounter`
- `AuditLog`
- `IdempotencyRecord`

#### Step 4
Add supporting enums early so column usage stays consistent:
- `WorkspaceMemberRole`
- `WorkspaceMemberStatus`
- `PlanType`
- `SubscriptionStatus`
- `AuditActorType`
- `AuditResult`
- `IdempotencyStatus`

#### Step 5
Model the relationships clearly:
- `User` has one `UserProfile`
- `User` has many `UserSessions`
- `UserSession` has many `RefreshTokens`
- `User` can belong to many `Workspaces` through `WorkspaceMember`
- `Workspace` has many `WorkspaceMembers`
- `Workspace` can have a `Subscription`
- `Subscription` references `Plan`
- `AuditLog` may reference `UserId`, `WorkspaceId`, `EntityId`
- `IdempotencyRecord` may reference `UserId`, `WorkspaceId`

#### Step 6
Decide and document which fields are required on Day 2.

Recommended minimum columns:

`users`
- `id`
- `email`
- `normalized_email`
- `password_hash`
- `status`
- `email_verified_at_utc`
- `last_login_at_utc`
- `created_at_utc`
- `updated_at_utc`
- `deleted_at_utc`
- `version`
- `metadata`

`user_profiles`
- `id`
- `user_id`
- `display_name`
- `first_name`
- `last_name`
- `avatar_url`
- `timezone`
- `locale`
- `created_at_utc`
- `updated_at_utc`
- `deleted_at_utc`
- `version`
- `metadata`

`user_sessions`
- `id`
- `user_id`
- `device_name`
- `ip_address`
- `user_agent`
- `issued_at_utc`
- `expires_at_utc`
- `revoked_at_utc`
- `last_seen_at_utc`
- `created_at_utc`
- `updated_at_utc`
- `version`

`refresh_tokens`
- `id`
- `user_session_id`
- `token_hash`
- `expires_at_utc`
- `rotated_at_utc`
- `revoked_at_utc`
- `replaced_by_token_id`
- `created_at_utc`
- `updated_at_utc`
- `version`

`workspaces`
- `id`
- `name`
- `slug`
- `owner_user_id`
- `created_at_utc`
- `updated_at_utc`
- `deleted_at_utc`
- `version`
- `metadata`

`workspace_members`
- `id`
- `workspace_id`
- `user_id`
- `role`
- `status`
- `invited_by_user_id`
- `joined_at_utc`
- `created_at_utc`
- `updated_at_utc`
- `deleted_at_utc`
- `version`

`plans`
- `id`
- `code`
- `name`
- `description`
- `price_monthly`
- `price_yearly`
- `max_members`
- `max_social_accounts`
- `max_scheduled_posts_per_month`
- `is_active`
- `sort_order`
- `created_at_utc`
- `updated_at_utc`

`subscriptions`
- `id`
- `workspace_id`
- `plan_id`
- `provider`
- `provider_subscription_id`
- `status`
- `starts_at_utc`
- `ends_at_utc`
- `trial_ends_at_utc`
- `canceled_at_utc`
- `created_at_utc`
- `updated_at_utc`
- `version`

`usage_counters`
- `id`
- `workspace_id`
- `metric_code`
- `period_start_utc`
- `period_end_utc`
- `value`
- `created_at_utc`
- `updated_at_utc`
- `version`

`audit_logs`
- `id`
- `workspace_id`
- `user_id`
- `actor_type`
- `action`
- `entity_type`
- `entity_id`
- `result`
- `ip_address`
- `user_agent`
- `correlation_id`
- `details_json`
- `created_at_utc`

`idempotency_records`
- `id`
- `workspace_id`
- `user_id`
- `key`
- `request_hash`
- `endpoint`
- `method`
- `status`
- `response_status_code`
- `response_body`
- `locked_until_utc`
- `completed_at_utc`
- `expires_at_utc`
- `created_at_utc`
- `updated_at_utc`
- `version`

#### Step 7
Keep secrets and security-sensitive values out of plain text storage:
- store `password_hash`, never a password
- store refresh token hashes, never raw refresh tokens
- optionally store `details_json` and `response_body` carefully to avoid leaking secrets

### Commands

```/dev/null/day2-entity-scaffold.sh#L1-20
cd be

mkdir -p src/domain/entities
mkdir -p src/domain/enums
mkdir -p src/application/abstractions
mkdir -p src/infrastructure/persistence
mkdir -p src/infrastructure/persistence/configurations
mkdir -p src/modules/auth
mkdir -p src/modules/users
mkdir -p src/modules/workspaces

touch src/domain/entities/EntityBase.cs
touch src/domain/entities/User.cs
touch src/domain/entities/UserProfile.cs
touch src/domain/entities/UserSession.cs
touch src/domain/entities/RefreshToken.cs
touch src/domain/entities/Workspace.cs
touch src/domain/entities/WorkspaceMember.cs
touch src/domain/entities/Plan.cs
touch src/domain/entities/Subscription.cs
touch src/domain/entities/UsageCounter.cs
touch src/domain/entities/AuditLog.cs
touch src/domain/entities/IdempotencyRecord.cs
```

### Expected Folder Structure

```/dev/null/day2-domain-tree.txt#L1-28
be
├── src
│   ├── api
│   ├── application
│   │   └── abstractions
│   ├── domain
│   │   ├── entities
│   │   │   ├── EntityBase.cs
│   │   │   ├── User.cs
│   │   │   ├── UserProfile.cs
│   │   │   ├── UserSession.cs
│   │   │   ├── RefreshToken.cs
│   │   │   ├── Workspace.cs
│   │   │   ├── WorkspaceMember.cs
│   │   │   ├── Plan.cs
│   │   │   ├── Subscription.cs
│   │   │   ├── UsageCounter.cs
│   │   │   ├── AuditLog.cs
│   │   │   └── IdempotencyRecord.cs
│   │   └── enums
│   ├── infrastructure
│   │   └── persistence
│   │       └── configurations
│   └── modules
│       ├── auth
│       ├── users
│       └── workspaces
└── tests
```

### Code Example

```/dev/null/EntityBase.cs#L1-19
namespace Syncra.Domain.Entities;

public abstract class EntityBase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
    public long Version { get; set; }
    public string? Metadata { get; set; }
}

public abstract class WorkspaceEntityBase : EntityBase
{
    public Guid WorkspaceId { get; set; }
}
```

```/dev/null/User.cs#L1-24
namespace Syncra.Domain.Entities;

public sealed class User : EntityBase
{
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTime? EmailVerifiedAtUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }

    public UserProfile? Profile { get; set; }
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; } = new List<WorkspaceMember>();
}
```

```/dev/null/Workspace.cs#L1-18
namespace Syncra.Domain.Entities;

public sealed class Workspace : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid OwnerUserId { get; set; }

    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
    public ICollection<UsageCounter> UsageCounters { get; set; } = new List<UsageCounter>();
}
```

### Verification
- Confirm every entity compiles
- Confirm relationships are represented in the model
- Confirm no table needed by Day 2 is missing
- Confirm no entity stores raw passwords or raw refresh tokens
- Confirm mutable entities include `Version`

---

## Task: Apply database naming, soft delete, indexing, and optimistic concurrency rules from `backend-task.md`

### Purpose
This task makes schema behavior consistent from Day 2 onward. Naming rules, soft delete behavior, indexes, and concurrency checks are cross-cutting decisions that become expensive to retrofit later.

### Implementation Steps

#### Step 1
Use PostgreSQL-friendly snake_case naming for tables, columns, indexes, constraints, and foreign keys.

Examples:
- table: `user_profiles`
- column: `normalized_email`
- index: `ix_users_normalized_email`
- foreign key: `fk_workspace_members_workspace_id`

#### Step 2
Centralize EF Core model configuration in `IEntityTypeConfiguration<T>` classes rather than placing all config in `OnModelCreating`.

#### Step 3
Add soft delete support to entities that should not be physically removed in normal app flow:
- `users`
- `user_profiles`
- `workspaces`
- `workspace_members`

#### Step 4
Apply global query filters for `DeletedAtUtc == null` where soft delete is required.

#### Step 5
Mark `Version` as the optimistic concurrency token on mutable tables:
- `users`
- `user_profiles`
- `user_sessions`
- `refresh_tokens`
- `workspaces`
- `workspace_members`
- `subscriptions`
- `usage_counters`
- `idempotency_records`

#### Step 6
Create required indexes:

`users`
- unique index on `normalized_email`

`user_profiles`
- unique index on `user_id`

`workspaces`
- unique index on `slug`
- index on `owner_user_id`

`workspace_members`
- unique composite index on `workspace_id`, `user_id`
- index on `user_id`

`plans`
- unique index on `code`
- index on `is_active`, `sort_order`

`subscriptions`
- unique or filtered unique index on `provider_subscription_id` if provider data requires it
- index on `workspace_id`
- index on `plan_id`

`usage_counters`
- unique composite index on `workspace_id`, `metric_code`, `period_start_utc`, `period_end_utc`

`audit_logs`
- index on `workspace_id`
- index on `user_id`
- index on `created_at_utc`
- index on `correlation_id`

`idempotency_records`
- unique composite index on `key`, `method`, `endpoint`
- index on `expires_at_utc`
- index on `user_id`
- index on `workspace_id`

#### Step 7
If you adopt automatic snake_case conversion, do it once in the infrastructure layer and verify generated migration names carefully.

#### Step 8
Document soft-delete behavior:
- delete operations should generally set `DeletedAtUtc`
- admin cleanup or retention policies can hard-delete later
- query filters must be bypassed intentionally only for recovery/admin use cases

### Commands

```/dev/null/day2-config-scaffold.sh#L1-9
cd be

mkdir -p src/infrastructure/persistence/configurations

touch src/infrastructure/persistence/configurations/UserConfiguration.cs
touch src/infrastructure/persistence/configurations/UserProfileConfiguration.cs
touch src/infrastructure/persistence/configurations/WorkspaceConfiguration.cs
touch src/infrastructure/persistence/configurations/WorkspaceMemberConfiguration.cs
touch src/infrastructure/persistence/AppDbContext.cs
```

### Expected Folder Structure

```/dev/null/day2-config-tree.txt#L1-16
be/src/infrastructure/persistence
├── AppDbContext.cs
└── configurations
    ├── UserConfiguration.cs
    ├── UserProfileConfiguration.cs
    ├── UserSessionConfiguration.cs
    ├── RefreshTokenConfiguration.cs
    ├── WorkspaceConfiguration.cs
    ├── WorkspaceMemberConfiguration.cs
    ├── PlanConfiguration.cs
    ├── SubscriptionConfiguration.cs
    ├── UsageCounterConfiguration.cs
    ├── AuditLogConfiguration.cs
    └── IdempotencyRecordConfiguration.cs
```

### Code Example

```/dev/null/UserConfiguration.cs#L1-31
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Email).HasColumnName("email").HasMaxLength(256).IsRequired();
        builder.Property(x => x.NormalizedEmail).HasColumnName("normalized_email").HasMaxLength(256).IsRequired();
        builder.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(512).IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").HasMaxLength(64).IsRequired();
        builder.Property(x => x.Version).HasColumnName("version").IsConcurrencyToken();

        builder.HasIndex(x => x.NormalizedEmail)
            .IsUnique()
            .HasDatabaseName("ix_users_normalized_email");

        builder.HasQueryFilter(x => x.DeletedAtUtc == null);
    }
}
```

```/dev/null/AppDbContext.cs#L1-38
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<UsageCounter> UsageCounters => Set<UsageCounter>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
```

### Verification
- Generate a migration and inspect all object names
- Confirm `version` is marked as a concurrency token
- Confirm soft-deletable entities have query filters
- Confirm unique indexes exist for email, slug, and workspace membership
- Confirm all index names are readable and consistent

---

## Task: Create the initial migration and validate it against a clean PostgreSQL instance

### Purpose
This task proves the current schema is real, portable, and reproducible. A migration that only works on one developer machine is not a usable foundation.

### Implementation Steps

#### Step 1
Add required persistence packages to the API or infrastructure project where EF Core tooling is hosted:
- `Microsoft.EntityFrameworkCore`
- `Microsoft.EntityFrameworkCore.Design`
- `Microsoft.EntityFrameworkCore.Tools`
- `Npgsql.EntityFrameworkCore.PostgreSQL`

#### Step 2
Register `AppDbContext` with the PostgreSQL provider in `Program.cs` or infrastructure registration extensions.

#### Step 3
Ensure the connection string points to a fresh local PostgreSQL database.

#### Step 4
Create the first migration using a clear name such as:
- `InitialIdentityWorkspaceFoundation`

#### Step 5
Apply the migration to a brand-new local database.

#### Step 6
Drop and recreate the database once, then run migrations again. This validates zero-state reliability.

#### Step 7
Inspect generated SQL or database objects directly to ensure tables, foreign keys, indexes, and seed data are correct.

### Commands

```/dev/null/day2-ef-packages.sh#L1-10
cd be/src/api

dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL

cd ../../
dotnet restore Syncra.sln
dotnet build Syncra.sln
```

```/dev/null/day2-migration.sh#L1-8
cd be

dotnet ef migrations add InitialIdentityWorkspaceFoundation --project src/infrastructure/Syncra.Infrastructure.csproj --startup-project src/api/Syncra.Api.csproj --output-dir Persistence/Migrations
dotnet ef database update --project src/infrastructure/Syncra.Infrastructure.csproj --startup-project src/api/Syncra.Api.csproj
```

### Expected Folder Structure

```/dev/null/day2-migrations-tree.txt#L1-12
be
├── src
│   ├── api
│   └── infrastructure
│       └── Persistence
│           ├── AppDbContext.cs
│           └── Migrations
│               ├── 20260310xxxxxx_InitialIdentityWorkspaceFoundation.cs
│               ├── 20260310xxxxxx_InitialIdentityWorkspaceFoundation.Designer.cs
│               └── AppDbContextModelSnapshot.cs
└── deploy
```

### Configuration Example

```/dev/null/appsettings.Development.json#L1-16
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres"
  },
  "Redis": {
    "Configuration": "localhost:6379"
  },
  "RabbitMq": {
    "Host": "localhost",
    "Port": 5672,
    "Username": "guest",
    "Password": "guest"
  }
}
```

### Infrastructure Example: Docker Compose for PostgreSQL, Redis, RabbitMQ

```/dev/null/docker-compose.yml#L1-39
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: syncra-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: syncra
    ports:
      - "5432:5432"
    volumes:
      - syncra-postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: syncra-redis
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    container_name: syncra-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  syncra-postgres-data:
```

### Connection String Format
- PostgreSQL: `Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres`
- Redis: `localhost:6379`
- RabbitMQ AMQP: `amqp://guest:guest@localhost:5672/`

### Basic Test Operations

PostgreSQL test query:
```/dev/null/postgres-test.sql#L1-3
select count(*) from plans;
select count(*) from users;
select count(*) from workspaces;
```

Redis set/get:
```/dev/null/redis-test.sh#L1-2
redis-cli SET syncra:test "ok"
redis-cli GET syncra:test
```

RabbitMQ test publisher:
```/dev/null/rabbitmq-test.cs#L1-16
using RabbitMQ.Client;
using System.Text;

var factory = new ConnectionFactory { HostName = "localhost", UserName = "guest", Password = "guest" };
using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();
channel.QueueDeclare("syncra.test", durable: false, exclusive: false, autoDelete: false);
var body = Encoding.UTF8.GetBytes("hello-syncra");
channel.BasicPublish("", "syncra.test", body: body);
Console.WriteLine("published");
```

### Verification
- Run the migration on an empty database
- Drop the database and run it again
- Confirm all expected tables exist
- Confirm PostgreSQL is reachable and queries return results
- Confirm Redis set/get works
- Confirm RabbitMQ publish succeeds and queue appears in the management UI at `http://localhost:15672`

---

## Task: Seed reference data for plans and any required default values

### Purpose
This task gives the application stable reference data for plan-aware behavior and avoids hardcoding subscription tiers in frontend or service logic.

### Implementation Steps

#### Step 1
Define the initial plan catalog for MVP. Keep the set intentionally small and stable.

Recommended initial plans:
- `free`
- `pro`
- `team`

#### Step 2
Choose a seed strategy:
- `HasData` in EF Core configuration for simple immutable records
- or startup seeding service for more flexible logic

For Day 2, `HasData` is acceptable if IDs are deterministic.

#### Step 3
Assign deterministic GUIDs for seeded plans so references remain stable across environments.

#### Step 4
Include realistic but clearly provisional values:
- feature limits
- pricing
- sort order
- `is_active = true`

#### Step 5
If the team is not ready to lock pricing, label these values as placeholders in documentation and code comments.

### Commands

```/dev/null/day2-seed-files.sh#L1-5
cd be

touch src/infrastructure/persistence/configurations/PlanConfiguration.cs
touch src/infrastructure/persistence/Seed/PlanSeedData.cs
```

### Expected Folder Structure

```/dev/null/day2-seed-tree.txt#L1-9
be/src/infrastructure/persistence
├── AppDbContext.cs
├── Seed
│   └── PlanSeedData.cs
└── configurations
    └── PlanConfiguration.cs
```

### Code Example

```/dev/null/PlanSeedData.cs#L1-34
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence.Seed;

public static class PlanSeedData
{
    public static readonly Guid FreePlanId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid ProPlanId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid TeamPlanId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    public static readonly Plan Free = new()
    {
        Id = FreePlanId,
        Code = "free",
        Name = "Free",
        Description = "Starter plan for individual creators.",
        PriceMonthly = 0m,
        PriceYearly = 0m,
        MaxMembers = 1,
        MaxSocialAccounts = 2,
        MaxScheduledPostsPerMonth = 20,
        IsActive = true,
        SortOrder = 1
    };

    public static readonly Plan Pro = new()
    {
        Id = ProPlanId,
        Code = "pro",
        Name = "Pro",
        Description = "Paid plan for growing creators.",
        PriceMonthly = 19m,
        PriceYearly = 190m,
        MaxMembers = 3,
        MaxSocialAccounts = 10,
        MaxScheduledPostsPerMonth = 200,
        IsActive = true,
        SortOrder = 2
    };
}
```

```/dev/null/PlanConfiguration.cs#L1-30
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence.Seed;

namespace Syncra.Infrastructure.Persistence.Configurations;

public sealed class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.ToTable("plans");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(64).IsRequired();
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(128).IsRequired();

        builder.HasIndex(x => x.Code)
            .IsUnique()
            .HasDatabaseName("ix_plans_code");

        builder.HasData(PlanSeedData.Free, PlanSeedData.Pro, new Plan
        {
            Id = PlanSeedData.TeamPlanId,
            Code = "team",
            Name = "Team",
            Description = "Plan for collaborative workspaces.",
            PriceMonthly = 49m,
            PriceYearly = 490m,
            MaxMembers = 10,
            MaxSocialAccounts = 25,
            MaxScheduledPostsPerMonth = 1000,
            IsActive = true,
            SortOrder = 3
        });
    }
}
```

### Verification
- Apply migration and query `plans`
- Confirm `free`, `pro`, and `team` exist
- Confirm IDs are deterministic
- Confirm no duplicate seed rows are inserted on repeated migration application
- Confirm frontend and backend can safely depend on plan codes

---

## Task: Implement auth module skeleton for register, login, logout, refresh, and `me` flow contracts

### Purpose
This task creates the public API shape for identity without requiring the entire auth system to be production-complete today. Developers and frontend teammates need stable contracts to build against.

### Implementation Steps

#### Step 1
Create a dedicated auth module structure:
- `modules/auth/contracts`
- `modules/auth/endpoints`
- `modules/auth/services`
- `modules/auth/repositories`

#### Step 2
Define request DTOs for:
- `RegisterRequest`
- `LoginRequest`
- `LogoutRequest`
- `RefreshTokenRequest`

#### Step 3
Define response DTOs for:
- `AuthTokenResponse`
- `AuthenticatedUserResponse`
- `UserSessionResponse`

#### Step 4
Keep contract rules explicit:
- email required and normalized
- password minimum length documented
- token response contains access token expiry
- refresh token exists in contract even if rotation is still basic

#### Step 5
Define service abstractions:
- `IPasswordHasher`
- `IJwtTokenService`
- `IRefreshTokenService`
- `IUserRepository`
- `IUserSessionRepository`

#### Step 6
Wire endpoint mapping for placeholder routes:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

#### Step 7
If register/login logic is not fully complete today, return clear `501 Not Implemented` or temporary mock handler output only for unfinished routes, but `auth/me` should be functional.

### Commands

```/dev/null/day2-auth-module.sh#L1-13
cd be

mkdir -p src/modules/auth/contracts
mkdir -p src/modules/auth/endpoints
mkdir -p src/modules/auth/services
mkdir -p src/modules/auth/repositories

touch src/modules/auth/contracts/RegisterRequest.cs
touch src/modules/auth/contracts/LoginRequest.cs
touch src/modules/auth/contracts/AuthTokenResponse.cs
touch src/modules/auth/endpoints/AuthEndpoints.cs
touch src/modules/auth/services/IJwtTokenService.cs
touch src/modules/auth/services/IPasswordHasher.cs
```

### Expected Folder Structure

```/dev/null/day2-auth-tree.txt#L1-16
be/src/modules/auth
├── contracts
│   ├── RegisterRequest.cs
│   ├── LoginRequest.cs
│   ├── LogoutRequest.cs
│   ├── RefreshTokenRequest.cs
│   ├── AuthTokenResponse.cs
│   └── AuthenticatedUserResponse.cs
├── endpoints
│   └── AuthEndpoints.cs
├── repositories
│   ├── IUserRepository.cs
│   └── IUserSessionRepository.cs
└── services
    ├── IJwtTokenService.cs
    ├── IPasswordHasher.cs
    └── IRefreshTokenService.cs
```

### Code Example

```/dev/null/LoginRequest.cs#L1-8
namespace Syncra.Modules.Auth.Contracts;

public sealed class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
```

```/dev/null/AuthTokenResponse.cs#L1-14
namespace Syncra.Modules.Auth.Contracts;

public sealed class AuthTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public Guid UserId { get; set; }
    public Guid? WorkspaceId { get; set; }
}
```

### Verification
- Confirm all auth routes appear in Swagger
- Confirm request and response contracts are explicit and versionable
- Confirm `GET /api/v1/auth/me` exists and is protected
- Confirm unfinished endpoints are clearly marked and not silently misleading

---

## Task: Configure JWT bearer authentication and token issuance baseline for MVP

### Purpose
This task enables real protected endpoints and establishes the token model that the rest of the product will depend on.

### Implementation Steps

#### Step 1
Add JWT packages:
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- optionally `System.IdentityModel.Tokens.Jwt`

#### Step 2
Define configuration structure for JWT:
- issuer
- audience
- signing key
- access token lifetime minutes

#### Step 3
Create an options class such as `JwtOptions`.

#### Step 4
Register JWT bearer authentication in `Program.cs`.

#### Step 5
Enable authorization globally or per endpoint.

#### Step 6
Create a token service that issues access tokens with a minimum set of claims:
- `sub`
- `email`
- `name`
- `workspace_id` if available
- `session_id`
- role claims if needed

#### Step 7
Never hardcode the signing key in committed source. Use environment variables or local secret storage.

#### Step 8
Return access token expiry in the auth response so clients know when refresh is needed.

### Commands

```/dev/null/day2-jwt-packages.sh#L1-6
cd be/src/api

dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package System.IdentityModel.Tokens.Jwt

cd ../../
dotnet restore Syncra.sln
```

### Configuration Example

```/dev/null/JwtOptions.cs#L1-11
namespace Syncra.Api.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenLifetimeMinutes { get; set; } = 60;
}
```

```/dev/null/appsettings.json#L1-12
{
  "Auth": {
    "Jwt": {
      "Issuer": "Syncra",
      "Audience": "Syncra.Client",
      "SigningKey": "replace-in-secrets",
      "AccessTokenLifetimeMinutes": 60
    }
  }
}
```

### ASP.NET Core Setup Example

```/dev/null/Program.cs#L1-70
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Auth:Jwt"));

var jwtSection = builder.Configuration.GetSection("Auth:Jwt");
var signingKey = jwtSection["SigningKey"] ?? throw new InvalidOperationException("JWT signing key is missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.Run();
```

### Verification
- Start the API with a valid signing key
- Issue a token from a seed/dev path or temporary token endpoint
- Call a protected endpoint with the bearer token
- Confirm anonymous access is rejected with `401`
- Confirm invalid or expired tokens are rejected

---

## Task: Implement protected `GET /api/v1/auth/me` flow based on agreed API convention

### Purpose
This task proves end-to-end identity flow works: token validation, current user extraction, and protected endpoint behavior.

### Implementation Steps

#### Step 1
Prefer `GET /api/v1/auth/me` for a read-only current-user identity lookup.

#### Step 2
Require authentication on this endpoint.

#### Step 3
Extract user claims from `HttpContext.User`:
- `sub`
- `email`
- `workspace_id`
- `session_id`

#### Step 4
Return a stable response envelope containing:
- user id
- email
- workspace id if present
- session id if present
- claims if useful for debugging in development only

#### Step 5
Do not expose sensitive values such as password hash, refresh token data, or security internals.

### Commands
No special terminal commands are required beyond normal build and run.

### Code Example

```/dev/null/AuthEndpoints.cs#L1-37
using Microsoft.AspNetCore.Authorization;

namespace Syncra.Modules.Auth.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapGet("/me", [Authorize] (HttpContext httpContext) =>
        {
            var user = httpContext.User;

            var response = new
            {
                success = true,
                data = new
                {
                    userId = user.FindFirst("sub")?.Value,
                    email = user.FindFirst("email")?.Value,
                    workspaceId = user.FindFirst("workspace_id")?.Value,
                    sessionId = user.FindFirst("session_id")?.Value
                }
            };

            return Results.Ok(response);
        })
        .WithName("GetAuthMe")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }
}
```

### Verification
- Call the endpoint without a token and confirm `401`
- Call the endpoint with a valid token and confirm authenticated data is returned
- Confirm response contains only safe fields
- Confirm Swagger shows the route as protected

---

## Task: Implement `GET /api/v1/users/me` with user profile projection

### Purpose
This task gives the frontend a real profile endpoint instead of forcing it to decode everything from JWT claims.

### Implementation Steps

#### Step 1
Create a `users` module with:
- contracts
- endpoints
- queries or services
- repository abstractions

#### Step 2
Define a response DTO that projects from `users` and `user_profiles`.

Recommended fields:
- `id`
- `email`
- `displayName`
- `firstName`
- `lastName`
- `avatarUrl`
- `timezone`
- `locale`
- `status`

#### Step 3
Resolve the current user ID from authenticated claims.

#### Step 4
Query the database using a projection instead of loading unnecessary full graphs.

#### Step 5
Return `404` only if the user truly does not exist. Otherwise return `200` for authenticated users.

#### Step 6
Wrap the response using the standard success envelope.

### Commands

```/dev/null/day2-users-module.sh#L1-9
cd be

mkdir -p src/modules/users/contracts
mkdir -p src/modules/users/endpoints
mkdir -p src/modules/users/repositories

touch src/modules/users/contracts/CurrentUserProfileResponse.cs
touch src/modules/users/endpoints/UserEndpoints.cs
touch src/modules/users/repositories/IUserReadRepository.cs
```

### Expected Folder Structure

```/dev/null/day2-users-tree.txt#L1-11
be/src/modules/users
├── contracts
│   └── CurrentUserProfileResponse.cs
├── endpoints
│   └── UserEndpoints.cs
└── repositories
    └── IUserReadRepository.cs
```

### Code Example

```/dev/null/CurrentUserProfileResponse.cs#L1-14
namespace Syncra.Modules.Users.Contracts;

public sealed class CurrentUserProfileResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Timezone { get; set; }
    public string? Locale { get; set; }
    public string Status { get; set; } = string.Empty;
}
```

```/dev/null/UserEndpoints.cs#L1-41
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Modules.Users.Endpoints;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/users").WithTags("Users");

        group.MapGet("/me", [Authorize] async (HttpContext httpContext, AppDbContext dbContext, CancellationToken cancellationToken) =>
        {
            var userIdValue = httpContext.User.FindFirst("sub")?.Value;
            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return Results.Unauthorized();
            }

            var data = await dbContext.Users
                .Where(x => x.Id == userId)
                .Select(x => new
                {
                    x.Id,
                    x.Email,
                    DisplayName = x.Profile != null ? x.Profile.DisplayName : string.Empty,
                    FirstName = x.Profile != null ? x.Profile.FirstName : null,
                    LastName = x.Profile != null ? x.Profile.LastName : null,
                    AvatarUrl = x.Profile != null ? x.Profile.AvatarUrl : null,
                    Timezone = x.Profile != null ? x.Profile.Timezone : null,
                    Locale = x.Profile != null ? x.Profile.Locale : null,
                    x.Status
                })
                .FirstOrDefaultAsync(cancellationToken);

            return data is null ? Results.NotFound() : Results.Ok(new { success = true, data });
        });

        return app;
    }
}
```

### Verification
- Authenticate as a known user
- Call `GET /api/v1/users/me`
- Confirm the endpoint returns user + profile data
- Confirm soft-deleted users are not returned
- Confirm no password, token, or internal auditing fields are exposed

---

## Task: Scaffold workspace creation, current workspace lookup, and member listing contracts and repository layer

### Purpose
This task creates the initial multi-tenant foundation that later content, scheduling, analytics, and billing modules will rely on.

### Implementation Steps

#### Step 1
Create a `workspaces` module structure:
- `contracts`
- `endpoints`
- `repositories`
- optionally `services`

#### Step 2
Define contracts for:
- `CreateWorkspaceRequest`
- `WorkspaceResponse`
- `WorkspaceMemberResponse`
- `CurrentWorkspaceResponse`

#### Step 3
Define repository/service responsibilities:
- create workspace
- add owner membership
- get current workspace for user
- list workspace members

#### Step 4
When creating a workspace:
- create `workspaces` record
- create `workspace_members` owner record in same transaction
- assign `role = owner`
- assign `status = active`

#### Step 5
Define current workspace selection rules for Day 2:
- simplest option: first active membership ordered by creation date
- future enhancement: explicit user-selected current workspace

#### Step 6
Protect workspace routes with authentication.

#### Step 7
If endpoint implementation is not fully complete today, at least finish:
- contracts
- repository interfaces
- transactional design notes
- route placeholders

### Commands

```/dev/null/day2-workspaces-module.sh#L1-11
cd be

mkdir -p src/modules/workspaces/contracts
mkdir -p src/modules/workspaces/endpoints
mkdir -p src/modules/workspaces/repositories

touch src/modules/workspaces/contracts/CreateWorkspaceRequest.cs
touch src/modules/workspaces/contracts/WorkspaceResponse.cs
touch src/modules/workspaces/contracts/WorkspaceMemberResponse.cs
touch src/modules/workspaces/endpoints/WorkspaceEndpoints.cs
touch src/modules/workspaces/repositories/IWorkspaceRepository.cs
```

### Expected Folder Structure

```/dev/null/day2-workspaces-tree.txt#L1-13
be/src/modules/workspaces
├── contracts
│   ├── CreateWorkspaceRequest.cs
│   ├── WorkspaceResponse.cs
│   ├── WorkspaceMemberResponse.cs
│   └── CurrentWorkspaceResponse.cs
├── endpoints
│   └── WorkspaceEndpoints.cs
└── repositories
    └── IWorkspaceRepository.cs
```

### Code Example

```/dev/null/CreateWorkspaceRequest.cs#L1-8
namespace Syncra.Modules.Workspaces.Contracts;

public sealed class CreateWorkspaceRequest
{
    public string Name { get; set; } = string.Empty;
}
```

```/dev/null/IWorkspaceRepository.cs#L1-16
using Syncra.Domain.Entities;

namespace Syncra.Modules.Workspaces.Repositories;

public interface IWorkspaceRepository
{
    Task<Workspace> CreateAsync(Workspace workspace, CancellationToken cancellationToken);
    Task AddMemberAsync(WorkspaceMember member, CancellationToken cancellationToken);
    Task<Workspace?> GetCurrentForUserAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<WorkspaceMember>> ListMembersAsync(Guid workspaceId, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
```

### Verification
- Confirm contracts compile
- Confirm repository interface supports Day 2 use cases
- Confirm workspace creation is designed as one transaction
- Confirm member listing is workspace-scoped
- Confirm future modules can depend on `WorkspaceId`

---

## Task: Add audit logging pipeline for sensitive operations such as auth, profile changes, and workspace creation

### Purpose
This task ensures sensitive identity events are traceable for debugging, support, and future compliance expectations without blocking core application development.

### Implementation Steps

#### Step 1
Define what must be audited on Day 2:
- login success
- login failure
- logout
- token refresh
- user profile update
- workspace creation
- workspace membership changes later

#### Step 2
Create an audit log service abstraction:
- `IAuditLogger`

#### Step 3
Implement a persistence-backed audit logger that writes to `audit_logs`.

#### Step 4
Include useful context in each audit entry:
- actor user id
- workspace id
- action
- entity type
- entity id
- result
- IP address
- user agent
- correlation id
- details JSON

#### Step 5
Treat audit logging as non-critical for request completion on Day 2:
- log failures
- do not fail the main request if audit insert fails, unless the team explicitly requires strict auditing

#### Step 6
Hook the service into auth and workspace handlers.

### Commands

```/dev/null/day2-audit-files.sh#L1-7
cd be

mkdir -p src/application/abstractions/auditing
touch src/application/abstractions/auditing/IAuditLogger.cs
touch src/infrastructure/persistence/AuditLogger.cs
touch src/domain/entities/AuditLog.cs
```

### Code Example

```/dev/null/IAuditLogger.cs#L1-16
namespace Syncra.Application.Abstractions.Auditing;

public interface IAuditLogger
{
    Task WriteAsync(
        string action,
        string entityType,
        string? entityId,
        string result,
        Guid? userId,
        Guid? workspaceId,
        string? detailsJson,
        string? correlationId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken);
}
```

```/dev/null/AuditLogger.cs#L1-34
using Syncra.Application.Abstractions.Auditing;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Persistence;

public sealed class AuditLogger : IAuditLogger
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AuditLogger> _logger;

    public AuditLogger(AppDbContext dbContext, ILogger<AuditLogger> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task WriteAsync(
        string action,
        string entityType,
        string? entityId,
        string result,
        Guid? userId,
        Guid? workspaceId,
        string? detailsJson,
        string? correlationId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        try
        {
            _dbContext.AuditLogs.Add(new AuditLog
            {
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Result = result,
                UserId = userId,
                WorkspaceId = workspaceId,
                DetailsJson = detailsJson,
                CorrelationId = correlationId,
                IpAddress = ipAddress,
                UserAgent = userAgent
            });

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write audit log entry for action {Action}", action);
        }
    }
}
```

### Verification
- Trigger a login or workspace creation path
- Confirm an `audit_logs` row is written
- Confirm request still succeeds even if audit insertion temporarily fails
- Confirm correlation ID and actor info are stored
- Confirm secrets are not accidentally written into `details_json`

---

## Task: Add idempotency middleware or request pipeline skeleton for future mutation endpoints and webhook processing

### Purpose
This task prepares the backend for safe retries on write endpoints and external webhook handling. It reduces the risk of duplicate workspace creation, duplicate billing actions, or duplicate webhook side effects later.

### Implementation Steps

#### Step 1
Standardize the future request header now:
- `Idempotency-Key`

#### Step 2
Decide which methods the middleware should eventually protect:
- `POST`
- `PUT`
- `PATCH`
- possibly `DELETE`

#### Step 3
For Day 2, implement the skeleton behavior:
- inspect request header
- compute or store request fingerprint
- check `idempotency_records`
- if existing completed record exists, return stored response
- otherwise reserve or create a processing record

#### Step 4
Keep initial implementation limited if necessary:
- middleware class
- service abstraction
- persistence entity
- response replay design
- route opt-in strategy

#### Step 5
Document the expected lifecycle:
- request starts
- key reserved
- handler executes
- response captured
- record updated as completed
- future retries replay response

### Commands

```/dev/null/day2-idempotency-files.sh#L1-8
cd be

mkdir -p src/api/middleware
mkdir -p src/application/abstractions/idempotency
touch src/api/middleware/IdempotencyMiddleware.cs
touch src/application/abstractions/idempotency/IIdempotencyService.cs
touch src/domain/entities/IdempotencyRecord.cs
```

### Code Example

```/dev/null/IIdempotencyService.cs#L1-15
namespace Syncra.Application.Abstractions.Idempotency;

public interface IIdempotencyService
{
    Task<IdempotencyRecord?> GetCompletedAsync(string key, string method, string endpoint, CancellationToken cancellationToken);
    Task<IdempotencyRecord> ReserveAsync(string key, string method, string endpoint, string requestHash, Guid? userId, Guid? workspaceId, CancellationToken cancellationToken);
    Task CompleteAsync(Guid recordId, int responseStatusCode, string responseBody, CancellationToken cancellationToken);
}
```

```/dev/null/IdempotencyMiddleware.cs#L1-38
namespace Syncra.Api.Middleware;

public sealed class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;

    public IdempotencyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var isMutation = HttpMethods.IsPost(context.Request.Method)
            || HttpMethods.IsPut(context.Request.Method)
            || HttpMethods.IsPatch(context.Request.Method);

        if (!isMutation)
        {
            await _next(context);
            return;
        }

        var key = context.Request.Headers["Idempotency-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(key))
        {
            await _next(context);
            return;
        }

        context.Items["IdempotencyKey"] = key;

        await _next(context);
    }
}
```

### Verification
- Confirm middleware runs only for mutation methods
- Confirm requests without `Idempotency-Key` still behave normally
- Confirm header value is captured and available to handlers
- Confirm `idempotency_records` schema supports future response replay

---

## Task: Standardize success and error response envelopes for identity-related endpoints

### Purpose
This task gives the frontend and future modules one predictable API contract shape for both successful and failed calls.

### Implementation Steps

#### Step 1
Choose a standard success shape.

Recommended:
- `success`
- `data`
- `meta`

#### Step 2
Choose a standard error shape.

Recommended:
- `success`
- `error.code`
- `error.message`
- `error.details`
- `correlationId`

#### Step 3
Create shared response contract helpers or static factory methods.

#### Step 4
Use the same shape for:
- `auth/me`
- `users/me`
- login/register responses
- validation errors
- unauthorized responses where possible

#### Step 5
Ensure global exception middleware also emits the same envelope.

### Commands

```/dev/null/day2-response-files.sh#L1-6
cd be

mkdir -p src/contracts/responses
touch src/contracts/responses/ApiSuccessResponse.cs
touch src/contracts/responses/ApiErrorResponse.cs
```

### Code Example

```/dev/null/ApiSuccessResponse.cs#L1-10
namespace Syncra.Contracts.Responses;

public sealed class ApiSuccessResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public object? Meta { get; set; }
}
```

```/dev/null/ApiErrorResponse.cs#L1-15
namespace Syncra.Contracts.Responses;

public sealed class ApiErrorResponse
{
    public bool Success { get; set; } = false;
    public ApiErrorDetail Error { get; set; } = new();
    public string? CorrelationId { get; set; }
}

public sealed class ApiErrorDetail
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Details { get; set; }
}
```

### Verification
- Confirm all new identity endpoints return the same envelope pattern
- Confirm exception middleware emits the same error shape
- Confirm validation and unauthorized responses are documented
- Confirm frontend can parse one stable structure

---

## Task: Update backend documentation and API docs for all endpoints created today

### Purpose
This task makes Day 2 usable by other developers immediately. If the code exists but the usage is unclear, integration slows down and mistakes multiply.

### Implementation Steps

#### Step 1
Update sprint documentation with:
- tables created
- routes added
- config keys required
- migration name
- seed data inserted

#### Step 2
Add or update Swagger metadata:
- auth routes
- user routes
- workspace routes
- bearer authentication scheme
- response examples if available

#### Step 3
Document environment variables required for Day 2:
- `ConnectionStrings__Postgres`
- `Auth__Jwt__Issuer`
- `Auth__Jwt__Audience`
- `Auth__Jwt__SigningKey`

#### Step 4
Add a developer runbook note covering:
- start containers
- apply migrations
- run API
- obtain or seed a valid JWT
- call `/api/v1/auth/me`
- call `/api/v1/users/me`

### Commands

```/dev/null/day2-runbook.sh#L1-7
cd be

docker compose -f deploy/docker-compose.yml up -d
dotnet restore Syncra.sln
dotnet build Syncra.sln
dotnet ef database update --project src/infrastructure/Syncra.Infrastructure.csproj --startup-project src/api/Syncra.Api.csproj
dotnet run --project src/api/Syncra.Api.csproj
```

### ASP.NET Core Swagger Setup Example

```/dev/null/Program.cs#L1-56
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Syncra API",
        Version = "v1",
        Description = "Syncra backend API for identity, workspace, and platform foundations."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT bearer token only."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.Run();
```

### Verification
- Open `/swagger`
- Confirm all Day 2 endpoints are visible
- Confirm bearer auth is documented
- Confirm runbook steps work from a clean machine
- Confirm another developer can follow the notes without guessing

---

## Task: Register Day 2 services, middleware, health checks, endpoint modules, and infrastructure in ASP.NET Core

### Purpose
This task ties together the Day 2 implementation so the new schema, auth, audit logging, endpoint modules, and idempotency pipeline are actually active in the running API.

### Implementation Steps

#### Step 1
Register EF Core and PostgreSQL with `AppDbContext`.

#### Step 2
Register JWT authentication and authorization.

#### Step 3
Register infrastructure services:
- `IAuditLogger`
- token service
- password hasher
- repository implementations

#### Step 4
Register health checks for:
- PostgreSQL
- Redis
- RabbitMQ

#### Step 5
Add middleware in the right order:
- correlation ID
- exception handling
- authentication
- authorization
- idempotency
- endpoint mappings

#### Step 6
Map:
- `/health`
- `/health/live`
- `/health/ready`
- auth endpoints
- user endpoints
- workspace endpoints

### Commands
No additional commands beyond build and run are required.

### ASP.NET Core Setup Example

```/dev/null/Program.cs#L1-109
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Syncra.Api.Middleware;
using Syncra.Infrastructure.Persistence;
using Syncra.Modules.Auth.Endpoints;
using Syncra.Modules.Users.Endpoints;
using Syncra.Modules.Workspaces.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddAuthentication();
builder.Services.AddAuthorization();

builder.Services.AddHealthChecks()
    .AddNpgSql(
        builder.Configuration.GetConnectionString("Postgres") ?? throw new InvalidOperationException("Missing Postgres connection string."),
        name: "postgres",
        tags: new[] { "ready" })
    .AddRedis(
        builder.Configuration["Redis:Configuration"] ?? "localhost:6379",
        name: "redis",
        tags: new[] { "ready" })
    .AddRabbitMQ(
        rabbitConnectionString: "amqp://guest:guest@localhost:5672/",
        name: "rabbitmq",
        tags: new[] { "ready" });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseMiddleware<IdempotencyMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});

app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapWorkspaceEndpoints();

app.Run();
```

### Verification
- Start the API
- Confirm `/health`, `/health/live`, and `/health/ready` respond
- Confirm database-backed endpoints resolve `AppDbContext`
- Confirm Swagger loads
- Confirm protected endpoints reject anonymous requests

---

Deliverables:
- first migration package and seeded reference data
- auth and workspace persistence baseline
- JWT authentication configured in the API
- protected `/api/v1/auth/me` endpoint available
- `/api/v1/users/me` endpoint available
- audit logging infrastructure for core identity and workspace actions
- idempotency skeleton ready for later business modules

Dependencies:
- Day 1 backend API skeleton completed
- PostgreSQL connection stable and verified
- environment variables for JWT signing and database access configured
- base entity and auditing conventions agreed by the team
- solution structure for API, domain, application, infrastructure, and modules already in place

Blocker Check:
- verify migration can run from zero state and also against a recreated local database
- verify seeded plans do not conflict with future billing assumptions
- verify JWT signing keys or secrets are not hardcoded into source control
- verify protected endpoints reject anonymous requests
- verify workspace-scoped tables include required foreign keys and indexes
- verify audit log writes do not break main request flow on non-critical failures

Test Criteria:
- initial migration applies successfully on a clean database
- seeded plan and reference data exists after migration
- JWT can be issued and validated by the API
- `/api/v1/auth/me` returns authenticated user context when a valid token is provided
- `/api/v1/users/me` returns expected user and profile payload
- anonymous requests to protected endpoints return unauthorized responses
- audit records are stored for key identity and workspace actions
- response envelopes match the agreed API standard
- concurrency/version column exists on mutable business tables created today

End-of-Day Checklist:
- [ ] core identity tables created
- [ ] workspace tables created
- [ ] plan seed data inserted
- [ ] initial migration applied successfully
- [ ] JWT auth configured
- [ ] `/api/v1/auth/me` protected endpoint working
- [ ] `/api/v1/users/me` endpoint working
- [ ] workspace contracts scaffolded
- [ ] audit logging pipeline active
- [ ] idempotency skeleton added
- [ ] API documentation updated