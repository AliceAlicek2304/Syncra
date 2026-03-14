# Day 5 – Social Integrations and Publishing Pipeline

Date / Time:
Day 5 of 7

Sprint:
Sprint 3 – Integrations

Focus Area:
Social account integration lifecycle, publish-now orchestration, scheduled publishing worker, retry-safe dispatching, and publish outcome tracking.

Tasks:
- review the output from Sprint 2 to confirm `posts`, `post_schedules`, media metadata, and scheduling flows are stable enough to support publishing orchestration
- create persistence models and migration tasks for `social_accounts`, `social_account_tokens`, `social_account_scopes`, `publish_attempts`, `publish_results`, and `external_post_refs` as required for the MVP publishing scaffold
- implement `GET /api/v1/integrations/social-accounts` to return linked account state per workspace
- implement `POST /api/v1/integrations/{provider}/connect` contract to initiate provider connection flow
- scaffold provider callback handling for `GET` or `POST /api/v1/integrations/{provider}/callback` based on selected provider requirements
- implement `DELETE /api/v1/integrations/social-accounts/{id}` to support disconnect flow with safe token invalidation or archival behavior
- normalize provider account metadata and scopes into internal storage so the rest of the system does not depend on provider-specific payload shapes
- define secure token storage and refresh strategy for external provider access tokens and refresh tokens
- implement `POST /api/v1/publishing/posts/{id}/publish-now` or aligned internal command flow to trigger immediate publish requests
- implement publish request orchestration using existing post, variant, media, and schedule data
- add a scheduler worker job that scans for due scheduled posts and enqueues publish requests safely
- enforce idempotency so duplicate scheduler runs or repeated publish commands do not create duplicate publish attempts
- persist publish attempt lifecycle data including correlation ID, provider, status, timestamps, retry count, and failure reason
- emit domain or integration events for `PostPublishRequested`, `PostPublished`, and `PostPublishFailed`
- connect notification hooks so publish success and failure paths can be surfaced later to users
- add audit log entries for social account connect, disconnect, publish-now requests, scheduler dispatches, and publish outcomes
- add structured operational logging for scheduler scans, due-post selection, provider dispatch attempts, and failure handling
- document provider onboarding assumptions, callback URL requirements, token handling rules, and publish flow states for the team
- update Swagger/OpenAPI documentation for social integration and publish pipeline endpoints created today

---

## Task: Review Sprint 2 publishing prerequisites

### Purpose
Before building integrations and publishing orchestration, confirm the existing post, media, and scheduling foundation is stable. Publishing code will rely on `posts`, `post_schedules`, media metadata, and any status fields already introduced in Sprint 2. If these inputs are inconsistent, publishing logic will fail or create duplicate dispatches.

### Implementation Steps

#### Step 1
Review the Sprint 2 implementation for:
- `posts`
- `post_schedules`
- post variants or publishable content records
- media asset metadata and storage references
- schedule status fields
- any optimistic concurrency or idempotency behavior already implemented

#### Step 2
Document the minimum fields required for publishing:
- `Post.Id`
- `Post.WorkspaceId`
- `Post.Status`
- `Post.Caption` or variant content
- `PostSchedule.Id`
- `PostSchedule.PostId`
- `PostSchedule.ScheduledForUtc`
- `PostSchedule.Status`
- selected social account reference or provider target
- media references required by provider APIs

#### Step 3
Define post eligibility rules for Day 5 implementation. At minimum a post must:
- belong to the active workspace
- be in a publishable state
- have required content for the provider
- have valid linked social account credentials
- not already be actively publishing for the same target window
- not be disconnected or archived

#### Step 4
Confirm how schedule claiming will work:
- either update `post_schedules.status`
- or create `publish_attempts` with a unique key
- or do both for stronger protection

#### Step 5
Record any missing prerequisites directly in this sprint note so developers know what to patch before proceeding.

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be
dotnet restore
dotnet build

# inspect current migrations
dotnet ef migrations list --project src/Syncra.Infrastructure --startup-project src/Syncra.Api

# inspect current API surface manually
dotnet run --project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-17
be
├── src
│   ├── Syncra.Api
│   ├── Syncra.Application
│   ├── Syncra.Domain
│   ├── Syncra.Infrastructure
│   ├── Syncra.Workers
│   ├── Syncra.Contracts
│   └── Syncra.Shared
├── deploy
│   ├── docker
│   └── compose
├── docs
│   └── integrations
└── tests
    ├── Syncra.UnitTests
    ├── Syncra.IntegrationTests
    └── Syncra.ArchitectureTests
```

### Code Example

Example eligibility contract:
```/dev/null/PostEligibilityRule.cs#L1-17
public sealed record PublishEligibilityResult(
    bool IsEligible,
    string? Reason);

public interface IPostPublishEligibilityService
{
    Task<PublishEligibilityResult> ValidateAsync(
        Guid workspaceId,
        Guid postId,
        string provider,
        CancellationToken cancellationToken);
}
```

### Verification

- Confirm the existing database has stable `posts` and `post_schedules` tables
- Confirm post schedules can represent pending, dispatched, published, and failed states
- Confirm a post can be mapped to a specific provider/account target
- Confirm media metadata required for publishing is already persisted or clearly identified as missing

---

## Task: Create persistence models and migrations for publishing integrations

### Purpose
This task establishes the database foundation for linked social accounts, token management, provider scopes, publish attempt lifecycle tracking, and storage of provider-side published post references.

### Implementation Steps

#### Step 1
Create domain entities for:
- `SocialAccount`
- `SocialAccountToken`
- `SocialAccountScope`
- `PublishAttempt`
- `PublishResult`
- `ExternalPostRef`

#### Step 2
Use normalized internal fields rather than storing only raw provider payloads. Include fields such as:
- provider name
- provider account id
- display name
- username/handle
- avatar URL
- workspace id
- status
- connected/disconnected timestamps
- token expiration timestamps
- encrypted token payload references
- publish correlation id
- idempotency key
- retry count
- failure code
- failure message

#### Step 3
Add EF Core configurations for each entity:
- primary keys
- foreign keys
- unique indexes
- required lengths
- soft-delete or archival columns if needed

#### Step 4
Define constraints:
- unique social account per `workspace_id + provider + provider_account_id`
- unique publish attempt per idempotency key
- unique external post reference per `publish_attempt_id + provider`
- optional unique active token per account

#### Step 5
Generate a migration and review the SQL before applying.

#### Step 6
Apply the migration to local PostgreSQL and validate the schema.

### Commands

Example:
```/dev/null/commands.txt#L1-10
cd be

dotnet add src/Syncra.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add src/Syncra.Infrastructure package Microsoft.EntityFrameworkCore.Design

dotnet ef migrations add AddSocialIntegrationsAndPublishing \
  --project src/Syncra.Infrastructure \
  --startup-project src/Syncra.Api

dotnet ef database update --project src/Syncra.Infrastructure --startup-project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-25
src
├── Syncra.Domain
│   └── Publishing
│       ├── Entities
│       │   ├── SocialAccount.cs
│       │   ├── SocialAccountToken.cs
│       │   ├── SocialAccountScope.cs
│       │   ├── PublishAttempt.cs
│       │   ├── PublishResult.cs
│       │   └── ExternalPostRef.cs
│       └── Enums
│           ├── SocialAccountStatus.cs
│           ├── PublishAttemptStatus.cs
│           └── PublishResultStatus.cs
├── Syncra.Infrastructure
│   ├── Persistence
│   │   ├── Configurations
│   │   │   ├── SocialAccountConfiguration.cs
│   │   │   ├── SocialAccountTokenConfiguration.cs
│   │   │   ├── SocialAccountScopeConfiguration.cs
│   │   │   ├── PublishAttemptConfiguration.cs
│   │   │   ├── PublishResultConfiguration.cs
│   │   │   └── ExternalPostRefConfiguration.cs
│   │   └── Migrations
```

### Code Example

Example entity skeleton:
```/dev/null/SocialAccount.cs#L1-27
public sealed class SocialAccount
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Provider { get; set; } = null!;
    public string ProviderAccountId { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string? Username { get; set; }
    public string? ProfileUrl { get; set; }
    public string? AvatarUrl { get; set; }
    public string Status { get; set; } = "Active";
    public DateTimeOffset ConnectedAtUtc { get; set; }
    public DateTimeOffset? DisconnectedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public ICollection<SocialAccountScope> Scopes { get; set; } = new List<SocialAccountScope>();
    public ICollection<SocialAccountToken> Tokens { get; set; } = new List<SocialAccountToken>();
}
```

Example EF configuration:
```/dev/null/SocialAccountConfiguration.cs#L1-27
public sealed class SocialAccountConfiguration : IEntityTypeConfiguration<SocialAccount>
{
    public void Configure(EntityTypeBuilder<SocialAccount> builder)
    {
        builder.ToTable("social_accounts");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Provider).HasMaxLength(50).IsRequired();
        builder.Property(x => x.ProviderAccountId).HasMaxLength(200).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Username).HasMaxLength(200);
        builder.Property(x => x.Status).HasMaxLength(50).IsRequired();

        builder.HasIndex(x => new { x.WorkspaceId, x.Provider, x.ProviderAccountId })
            .IsUnique();

        builder.HasMany(x => x.Scopes)
            .WithOne()
            .HasForeignKey(x => x.SocialAccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Tokens)
            .WithOne()
            .HasForeignKey(x => x.SocialAccountId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### Configuration Examples

PostgreSQL connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=syncra;Username=syncra;Password=syncra"
  }
}
```

Docker Compose example:
```/dev/null/docker-compose.yml#L1-31
version: '3.9'
services:
  postgres:
    image: postgres:16
    container_name: syncra-postgres
    environment:
      POSTGRES_DB: syncra
      POSTGRES_USER: syncra
      POSTGRES_PASSWORD: syncra
    ports:
      - "5432:5432"
    volumes:
      - syncra-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U syncra -d syncra"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: syncra-redis
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    container_name: syncra-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: syncra
      RABBITMQ_DEFAULT_PASS: syncra
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  syncra-postgres:
```

### Verification

- Run migration successfully
- Inspect tables in PostgreSQL
- Confirm unique indexes exist
- Confirm foreign keys cascade only where intended
- Confirm `publish_attempts` can represent requested, processing, success, and failure states

Basic PostgreSQL test operation:
```/dev/null/postgres-test.sql#L1-4
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## Task: Implement `GET /api/v1/integrations/social-accounts`

### Purpose
This endpoint gives the frontend and internal tooling a workspace-scoped list of linked social accounts and their integration health, without exposing sensitive token data.

### Implementation Steps

#### Step 1
Create an application query:
- `GetSocialAccountsQuery`
- input: workspace id
- output: list of social account summaries

#### Step 2
Return only safe fields:
- account id
- provider
- display name
- username
- avatar URL
- status
- connected timestamp
- token expiry summary if safe to expose
- scopes
- publish capability flags if available

#### Step 3
Do not expose:
- raw access tokens
- raw refresh tokens
- provider secret values
- token encryption metadata

#### Step 4
Apply workspace scoping using the authenticated workspace context.

#### Step 5
Add Swagger documentation and example responses.

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Api
curl http://localhost:5000/api/v1/integrations/social-accounts
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Application
│   └── Integrations
│       └── SocialAccounts
│           ├── Queries
│           │   ├── GetSocialAccountsQuery.cs
│           │   └── GetSocialAccountsQueryHandler.cs
│           └── Dtos
│               └── SocialAccountSummaryDto.cs
└── Syncra.Api
    └── Endpoints
        └── IntegrationsEndpoints.cs
```

### Code Example

```/dev/null/GetSocialAccountsQueryHandler.cs#L1-33
public sealed record GetSocialAccountsQuery(Guid WorkspaceId)
    : IRequest<IReadOnlyList<SocialAccountSummaryDto>>;

public sealed class GetSocialAccountsQueryHandler
    : IRequestHandler<GetSocialAccountsQuery, IReadOnlyList<SocialAccountSummaryDto>>
{
    private readonly IAppDbContext _dbContext;

    public GetSocialAccountsQueryHandler(IAppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<SocialAccountSummaryDto>> Handle(
        GetSocialAccountsQuery request,
        CancellationToken cancellationToken)
    {
        return await _dbContext.SocialAccounts
            .Where(x => x.WorkspaceId == request.WorkspaceId)
            .OrderBy(x => x.Provider)
            .ThenBy(x => x.DisplayName)
            .Select(x => new SocialAccountSummaryDto(
                x.Id,
                x.Provider,
                x.DisplayName,
                x.Username,
                x.AvatarUrl,
                x.Status,
                x.ConnectedAtUtc,
                x.DisconnectedAtUtc))
            .ToListAsync(cancellationToken);
    }
}
```

### Verification

- Call endpoint with a workspace that has linked accounts
- Confirm only workspace-owned accounts are returned
- Confirm no token fields appear in response
- Confirm disconnected accounts show expected state

---

## Task: Implement `POST /api/v1/integrations/{provider}/connect`

### Purpose
This endpoint initiates the provider connection flow, typically by returning an authorization URL and correlation metadata used during callback handling.

### Implementation Steps

#### Step 1
Create a provider-agnostic connect command:
- input: provider, workspace id, optional redirect state
- output: authorization URL, state, expiration time

#### Step 2
Generate secure connection state:
- correlation id
- anti-forgery state token
- workspace id
- provider
- timestamp / expiry

#### Step 3
Persist pending connection state in Redis or database with a short TTL.

#### Step 4
Build provider-specific authorization URL through a provider adapter.

#### Step 5
Return a normalized response:
- provider
- authorization URL
- state
- expires at UTC

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be
dotnet add src/Syncra.Infrastructure package StackExchange.Redis
dotnet build

curl -X POST http://localhost:5000/api/v1/integrations/linkedin/connect \
  -H "Content-Type: application/json" \
  -d "{}"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-20
src
├── Syncra.Application
│   └── Integrations
│       ├── Commands
│       │   ├── ConnectSocialProviderCommand.cs
│       │   └── ConnectSocialProviderCommandHandler.cs
│       └── Dtos
│           └── ConnectSocialProviderResponse.cs
├── Syncra.Infrastructure
│   └── Integrations
│       ├── Providers
│       │   ├── ISocialProviderAuthService.cs
│       │   ├── LinkedInAuthService.cs
│       │   └── MockSocialAuthService.cs
│       └── State
│           └── IProviderConnectionStateStore.cs
```

### Code Example

```/dev/null/ConnectSocialProviderCommand.cs#L1-29
public sealed record ConnectSocialProviderCommand(
    Guid WorkspaceId,
    string Provider) : IRequest<ConnectSocialProviderResponse>;

public sealed class ConnectSocialProviderResponse
{
    public string Provider { get; init; } = null!;
    public string AuthorizationUrl { get; init; } = null!;
    public string State { get; init; } = null!;
    public DateTimeOffset ExpiresAtUtc { get; init; }
}
```

### Configuration Examples

Provider configuration:
```/dev/null/appsettings.json#L1-15
{
  "SocialProviders": {
    "LinkedIn": {
      "ClientId": "your-client-id",
      "ClientSecret": "use-env-var-not-source-control",
      "AuthorizeUrl": "https://www.linkedin.com/oauth/v2/authorization",
      "TokenUrl": "https://www.linkedin.com/oauth/v2/accessToken",
      "CallbackUrl": "https://localhost:5001/api/v1/integrations/linkedin/callback",
      "Scopes": [ "openid", "profile", "email", "w_member_social" ]
    }
  }
}
```

Redis connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false"
  }
}
```

### Verification

- POST to the endpoint and receive an authorization URL
- Confirm state token is stored with TTL
- Confirm provider name is validated against supported providers
- Confirm no client secret is ever returned in the response

Basic Redis test operation:
```/dev/null/redis-test.txt#L1-4
redis-cli -p 6379
SET social:state:test pending
GET social:state:test
```

---

## Task: Scaffold provider callback handling

### Purpose
The callback endpoint completes the integration handshake after the provider redirects back with code/token payload. This flow must safely validate state, exchange tokens, normalize profile data, and persist the linked account.

### Implementation Steps

#### Step 1
Support provider-specific callback shape:
- query string `code/state`
- or form post payload if required by provider

#### Step 2
Validate:
- state exists
- state has not expired
- workspace id matches
- provider matches expected value

#### Step 3
Exchange authorization code for provider tokens using a provider adapter.

#### Step 4
Fetch provider account profile and granted scopes.

#### Step 5
Normalize provider payload into internal account model:
- provider account id
- display name
- username
- avatar URL
- scopes
- token expiry timestamps

#### Step 6
Encrypt token values before persistence.

#### Step 7
Upsert `social_accounts`, related scopes, and current token row.

#### Step 8
Write audit log entry and structured log event.

### Commands

Example:
```/dev/null/commands.txt#L1-7
cd be
dotnet build

curl "http://localhost:5000/api/v1/integrations/linkedin/callback?code=test-code&state=test-state"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-18
src
├── Syncra.Application
│   └── Integrations
│       ├── Commands
│       │   ├── HandleSocialProviderCallbackCommand.cs
│       │   └── HandleSocialProviderCallbackCommandHandler.cs
│       └── Dtos
│           └── ProviderCallbackPayload.cs
├── Syncra.Infrastructure
│   └── Integrations
│       ├── Providers
│       │   ├── ISocialProviderClient.cs
│       │   ├── LinkedInProviderClient.cs
│       │   └── MockSocialProviderClient.cs
│       └── Security
│           └── ITokenEncryptionService.cs
```

### Code Example

```/dev/null/ProviderProfile.cs#L1-29
public sealed class ProviderProfile
{
    public string Provider { get; init; } = null!;
    public string ProviderAccountId { get; init; } = null!;
    public string DisplayName { get; init; } = null!;
    public string? Username { get; init; }
    public string? AvatarUrl { get; init; }
    public IReadOnlyCollection<string> Scopes { get; init; } = Array.Empty<string>();
}

public sealed class ProviderTokenSet
{
    public string AccessToken { get; init; } = null!;
    public string? RefreshToken { get; init; }
    public DateTimeOffset? AccessTokenExpiresAtUtc { get; init; }
    public DateTimeOffset? RefreshTokenExpiresAtUtc { get; init; }
}
```

### Verification

- Simulate callback with valid state
- Confirm linked account is created or updated
- Confirm scopes are stored in normalized rows
- Confirm tokens are encrypted before persistence
- Confirm callback replay is either blocked or handled safely

---

## Task: Implement disconnect flow

### Purpose
Disconnecting a social account must prevent future publishes from using invalid credentials while preserving auditability and historical publish records.

### Implementation Steps

#### Step 1
Implement `DELETE /api/v1/integrations/social-accounts/{id}`.

#### Step 2
Validate:
- account exists
- account belongs to current workspace
- account is not already disconnected

#### Step 3
Choose disconnect strategy:
- mark account as `Disconnected`
- invalidate active tokens
- archive scopes if needed
- preserve historical references for reporting

#### Step 4
Define behavior for scheduled posts tied to this account:
- mark as blocked
- or leave pending but fail eligibility checks
- record explicit reason so users can see remediation action

#### Step 5
Write audit log and structured log entry.

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build

curl -X DELETE http://localhost:5000/api/v1/integrations/social-accounts/00000000-0000-0000-0000-000000000001
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-10
src
├── Syncra.Application
│   └── Integrations
│       └── Commands
│           ├── DisconnectSocialAccountCommand.cs
│           └── DisconnectSocialAccountCommandHandler.cs
└── Syncra.Api
    └── Endpoints
        └── IntegrationsEndpoints.cs
```

### Code Example

```/dev/null/DisconnectSocialAccountCommandHandler.cs#L1-32
public sealed class DisconnectSocialAccountCommandHandler
    : IRequestHandler<DisconnectSocialAccountCommand>
{
    private readonly IAppDbContext _dbContext;

    public DisconnectSocialAccountCommandHandler(IAppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task Handle(
        DisconnectSocialAccountCommand request,
        CancellationToken cancellationToken)
    {
        SocialAccount account = await _dbContext.SocialAccounts
            .SingleAsync(x => x.Id == request.SocialAccountId && x.WorkspaceId == request.WorkspaceId, cancellationToken);

        account.Status = "Disconnected";
        account.DisconnectedAtUtc = DateTimeOffset.UtcNow;

        foreach (SocialAccountToken token in _dbContext.SocialAccountTokens.Where(x => x.SocialAccountId == account.Id))
        {
            token.IsActive = false;
            token.InvalidatedAtUtc = DateTimeOffset.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
```

### Verification

- Disconnect an active account
- Confirm account no longer appears as active
- Confirm tokens are marked inactive
- Confirm scheduled publish eligibility fails with a clear message for disconnected accounts

---

## Task: Normalize provider account metadata and scopes

### Purpose
Provider APIs differ widely. The application should persist a normalized representation so downstream publishing, UI, and audit features do not depend on provider-specific payload formats.

### Implementation Steps

#### Step 1
Define a normalized profile model:
- provider
- provider account id
- display name
- username
- profile URL
- avatar URL
- granted scopes
- connection status
- raw metadata JSON only if absolutely necessary

#### Step 2
Keep raw provider responses out of core business logic.

#### Step 3
If raw provider payloads must be retained for troubleshooting, store them in a separate optional JSON column or secure diagnostics store, and never expose them through public API responses.

#### Step 4
Add mappers/adapters per provider to translate API payloads into internal models.

### Commands

Example:
```/dev/null/commands.txt#L1-3
cd be
dotnet build
dotnet test
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Application
│   └── Integrations
│       └── Models
│           └── NormalizedSocialAccountProfile.cs
└── Syncra.Infrastructure
    └── Integrations
        └── Mapping
            ├── ISocialProviderProfileMapper.cs
            ├── LinkedInProfileMapper.cs
            └── MockProfileMapper.cs
```

### Code Example

```/dev/null/NormalizedSocialAccountProfile.cs#L1-18
public sealed record NormalizedSocialAccountProfile(
    string Provider,
    string ProviderAccountId,
    string DisplayName,
    string? Username,
    string? ProfileUrl,
    string? AvatarUrl,
    IReadOnlyCollection<string> Scopes);
```

### Verification

- Confirm each provider adapter returns the same internal profile shape
- Confirm UI/API queries depend only on normalized storage
- Confirm provider-specific payload changes do not require widespread domain changes

---

## Task: Define secure token storage and refresh strategy

### Purpose
Access tokens and refresh tokens are highly sensitive. This task ensures tokens are stored securely, rotated safely, refreshed before expiration, and never exposed in logs or API responses.

### Implementation Steps

#### Step 1
Create a token protection abstraction:
- encrypt before save
- decrypt only at provider call time
- redact in logs

#### Step 2
Store:
- encrypted access token
- encrypted refresh token
- token type
- issued at
- access token expiry
- refresh token expiry
- last refresh attempt
- invalidation timestamp

#### Step 3
Use environment variables or secrets management for:
- provider client id
- provider client secret
- encryption key material

#### Step 4
Implement refresh strategy:
- refresh before expiration threshold
- mark account unhealthy if refresh fails
- retry safely
- record failure metadata

#### Step 5
Do not return token values from any API contract.

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet user-secrets init --project src/Syncra.Api
dotnet user-secrets set "SocialProviders:LinkedIn:ClientSecret" "local-secret" --project src/Syncra.Api
dotnet user-secrets set "Security:TokenEncryptionKey" "replace-with-strong-key" --project src/Syncra.Api
dotnet build
```

### Code Example

```/dev/null/ITokenEncryptionService.cs#L1-14
public interface ITokenEncryptionService
{
    string Encrypt(string plaintext);
    string Decrypt(string ciphertext);
}
```

### Configuration Examples

```/dev/null/appsettings.Development.json#L1-12
{
  "Security": {
    "TokenEncryptionKey": "load-from-user-secrets-or-env"
  },
  "SocialProviders": {
    "LinkedIn": {
      "ClientId": "load-from-env",
      "ClientSecret": "load-from-env"
    }
  }
}
```

### Verification

- Confirm database stores encrypted token values only
- Confirm application can decrypt token values when making provider calls
- Confirm logs never contain raw token values
- Confirm expired tokens trigger refresh logic or clear failure state

---

## Task: Implement `POST /api/v1/publishing/posts/{id}/publish-now`

### Purpose
This endpoint lets the system or user initiate immediate publishing for a post using linked provider accounts and existing post/media data.

### Implementation Steps

#### Step 1
Create `PublishPostNowCommand` with:
- workspace id
- post id
- target provider
- target social account id
- optional idempotency key
- initiated by actor id

#### Step 2
Load:
- post
- publishable variant/content
- media assets
- target social account
- active token state

#### Step 3
Run eligibility validation:
- post belongs to workspace
- post not already published for same target
- account connected and active
- media present if required
- caption/content valid for provider
- token available or refreshable

#### Step 4
Create a `publish_attempts` record with status `Requested`.

#### Step 5
Emit `PostPublishRequested` event or enqueue a publish command to RabbitMQ.

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be
dotnet build

curl -X POST http://localhost:5000/api/v1/publishing/posts/00000000-0000-0000-0000-000000000100/publish-now \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: publish-post-100-linkedin" \
  -d "{\"provider\":\"linkedin\",\"socialAccountId\":\"00000000-0000-0000-0000-000000000001\"}"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-14
src
├── Syncra.Application
│   └── Publishing
│       ├── Commands
│       │   ├── PublishPostNowCommand.cs
│       │   └── PublishPostNowCommandHandler.cs
│       ├── Services
│       │   └── IPostPublishOrchestrator.cs
│       └── Events
│           └── PostPublishRequested.cs
└── Syncra.Api
    └── Endpoints
        └── PublishingEndpoints.cs
```

### Code Example

```/dev/null/PublishPostNowCommand.cs#L1-25
public sealed record PublishPostNowCommand(
    Guid WorkspaceId,
    Guid PostId,
    string Provider,
    Guid SocialAccountId,
    string IdempotencyKey,
    Guid InitiatedByUserId) : IRequest<PublishPostNowResponse>;

public sealed record PublishPostNowResponse(
    Guid PublishAttemptId,
    string Status,
    string CorrelationId);
```

### Verification

- Call endpoint with valid post and linked account
- Confirm `publish_attempts` row is created
- Confirm idempotency key is persisted
- Confirm publish event or queue message is emitted

---

## Task: Implement publish request orchestration

### Purpose
Publishing requires joining post content, media, schedules, provider metadata, and token state into one dispatchable request. This orchestration layer should keep endpoint logic thin and allow worker-based execution.

### Implementation Steps

#### Step 1
Create an orchestrator service responsible for:
- loading publish context
- validating provider requirements
- resolving media URLs
- refreshing token if needed
- building provider publish payload
- creating queue message or direct dispatch request

#### Step 2
Map internal post content into provider-specific payloads.

#### Step 3
Store correlation id across logs, events, and publish attempt rows.

#### Step 4
Update attempt status:
- `Requested`
- `Processing`
- `Succeeded`
- `Failed`

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Workers
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-18
src
├── Syncra.Application
│   └── Publishing
│       ├── Services
│       │   ├── PublishOrchestrator.cs
│       │   ├── IProviderPublishPayloadFactory.cs
│       │   └── IPostPublishEligibilityService.cs
└── Syncra.Infrastructure
    └── Publishing
        ├── Dispatch
        │   ├── IPublishDispatcher.cs
        │   ├── RabbitMqPublishDispatcher.cs
        │   └── DirectPublishDispatcher.cs
        └── Providers
            ├── ISocialPublishClient.cs
            └── MockSocialPublishClient.cs
```

### Code Example

```/dev/null/IPostPublishOrchestrator.cs#L1-20
public interface IPostPublishOrchestrator
{
    Task<Guid> RequestPublishAsync(
        Guid workspaceId,
        Guid postId,
        Guid socialAccountId,
        string provider,
        string idempotencyKey,
        Guid initiatedByUserId,
        CancellationToken cancellationToken);
}
```

### Verification

- Confirm orchestration loads all required entities
- Confirm provider-specific payload generation works for supported providers
- Confirm correlation ids appear in logs and attempt records
- Confirm failed eligibility blocks dispatch cleanly

---

## Task: Add scheduler worker job for due scheduled posts

### Purpose
Scheduled posts must be picked up automatically and dispatched once due. The worker should safely scan for due items, claim them, and enqueue publish requests without duplication.

### Implementation Steps

#### Step 1
Create a background worker that runs every N seconds.

#### Step 2
Query for schedules where:
- scheduled time <= now UTC
- status is pending/ready
- linked account is active
- no completed/active publish attempt already exists for same schedule dispatch key

#### Step 3
Use one of these safety patterns:
- database row locking
- atomic status update
- insert unique idempotency key into `publish_attempts`
- advisory lock if needed

#### Step 4
For each claimed schedule:
- build publish command
- enqueue to RabbitMQ
- write audit/structured logs
- update schedule dispatch metadata

#### Step 5
Keep scan batch size limited and configurable.

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be
dotnet add src/Syncra.Workers package Microsoft.Extensions.Hosting
dotnet build
dotnet run --project src/Syncra.Workers
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-16
src
├── Syncra.Workers
│   ├── Publishing
│   │   ├── DuePostSchedulerWorker.cs
│   │   ├── DuePostScanService.cs
│   │   └── DuePostScanOptions.cs
│   └── Program.cs
└── Syncra.Application
    └── Publishing
        └── Commands
            └── EnqueueScheduledPublishCommand.cs
```

### Code Example

```/dev/null/DuePostSchedulerWorker.cs#L1-37
public sealed class DuePostSchedulerWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DuePostSchedulerWorker> _logger;

    public DuePostSchedulerWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<DuePostSchedulerWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            IDuePostScanService scanner = scope.ServiceProvider.GetRequiredService<IDuePostScanService>();

            int count = await scanner.ScanAndEnqueueAsync(stoppingToken);

            _logger.LogInformation("Scheduled publish scan completed. Enqueued {Count} items.", count);

            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }
}
```

### Verification

- Seed a due scheduled post
- Run worker
- Confirm due post is detected
- Confirm publish request is enqueued once
- Confirm schedule state changes as expected

---

## Task: Enforce idempotency for manual and scheduled dispatch

### Purpose
Duplicate publish attempts can be caused by retried API requests, worker restarts, or overlapping scheduler scans. Idempotency ensures one logical publish request produces one active attempt.

### Implementation Steps

#### Step 1
Require or generate idempotency keys for:
- manual `publish-now`
- scheduled dispatches
- retry operations

#### Step 2
Construct deterministic idempotency keys, for example:
- `publish:{workspaceId}:{postId}:{socialAccountId}:{provider}:{scheduleId-or-manual}`

#### Step 3
Add a unique database index on `publish_attempts.idempotency_key`.

#### Step 4
Handle duplicate insert exceptions gracefully:
- return existing attempt for manual call
- skip duplicate scheduler dispatch

#### Step 5
Include correlation id and schedule id in structured logs.

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet build

# issue same request twice and confirm only one attempt row exists
curl -X POST http://localhost:5000/api/v1/publishing/posts/{id}/publish-now
curl -X POST http://localhost:5000/api/v1/publishing/posts/{id}/publish-now
```

### Code Example

```/dev/null/PublishAttemptConfiguration.cs#L1-18
public sealed class PublishAttemptConfiguration : IEntityTypeConfiguration<PublishAttempt>
{
    public void Configure(EntityTypeBuilder<PublishAttempt> builder)
    {
        builder.ToTable("publish_attempts");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.IdempotencyKey)
            .HasMaxLength(300)
            .IsRequired();

        builder.HasIndex(x => x.IdempotencyKey)
            .IsUnique();
    }
}
```

### Verification

- Send duplicate publish-now request with same idempotency key
- Confirm only one attempt row exists
- Run scheduler twice against same due schedule
- Confirm only one dispatch happens

---

## Task: Persist publish attempt lifecycle data

### Purpose
Publish lifecycle data is necessary for debugging, retries, user feedback, auditability, and future analytics.

### Implementation Steps

#### Step 1
Persist on `PublishAttempt`:
- id
- workspace id
- post id
- post schedule id if scheduled
- social account id
- provider
- status
- correlation id
- idempotency key
- retry count
- requested at
- processing started at
- completed at
- failure code
- failure reason

#### Step 2
Persist on `PublishResult`:
- publish attempt id
- final status
- provider response code
- provider response message
- raw external identifier if safe
- published at UTC

#### Step 3
Persist on `ExternalPostRef`:
- provider
- provider post id
- provider URL if available
- publish attempt id
- workspace id

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet ef database update --project src/Syncra.Infrastructure --startup-project src/Syncra.Api
```

### Code Example

```/dev/null/PublishAttempt.cs#L1-24
public sealed class PublishAttempt
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid PostId { get; set; }
    public Guid? PostScheduleId { get; set; }
    public Guid SocialAccountId { get; set; }
    public string Provider { get; set; } = null!;
    public string Status { get; set; } = "Requested";
    public string CorrelationId { get; set; } = null!;
    public string IdempotencyKey { get; set; } = null!;
    public int RetryCount { get; set; }
    public DateTimeOffset RequestedAtUtc { get; set; }
    public DateTimeOffset? ProcessingStartedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public string? FailureCode { get; set; }
    public string? FailureReason { get; set; }
}
```

### Verification

- Publish a post successfully and inspect all lifecycle fields
- Force a failed publish and confirm failure metadata is stored
- Confirm correlation id matches logs and event payloads

---

## Task: Emit publish lifecycle events

### Purpose
Events decouple the publish pipeline from notifications, audit trails, analytics, and downstream integrations.

### Implementation Steps

#### Step 1
Define events:
- `PostPublishRequested`
- `PostPublished`
- `PostPublishFailed`

#### Step 2
Emit `PostPublishRequested` when the attempt row is created.

#### Step 3
Emit `PostPublished` when provider dispatch succeeds and external refs are stored.

#### Step 4
Emit `PostPublishFailed` when dispatch fails permanently or eligibility blocks terminal execution.

#### Step 5
Include:
- event id
- correlation id
- workspace id
- post id
- social account id
- provider
- attempt id
- timestamp
- failure reason where relevant

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Workers
# observe event bus logs or queue messages
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Contracts
│   └── Events
│       ├── PostPublishRequested.cs
│       ├── PostPublished.cs
│       └── PostPublishFailed.cs
└── Syncra.Infrastructure
    └── Messaging
        └── EventPublisher.cs
```

### Code Example

```/dev/null/PostPublished.cs#L1-16
public sealed record PostPublished(
    Guid EventId,
    string CorrelationId,
    Guid WorkspaceId,
    Guid PostId,
    Guid SocialAccountId,
    Guid PublishAttemptId,
    string Provider,
    DateTimeOffset PublishedAtUtc,
    string? ExternalPostId);
```

### Verification

- Publish successfully and confirm requested + published events are emitted
- Force a failure and confirm failed event is emitted
- Confirm event payload includes correlation id

---

## Task: Connect notification hooks to publish events

### Purpose
The MVP may not deliver full user notifications yet, but the publish pipeline should expose hooks so notifications can be added without refactoring core publishing logic.

### Implementation Steps

#### Step 1
Create notification handlers/subscribers for:
- `PostPublished`
- `PostPublishFailed`

#### Step 2
Initially implement minimal behavior:
- create notification record
- or write placeholder log entry
- or enqueue internal notification command

#### Step 3
Keep notification logic out of the endpoint and publishing worker.

### Commands

Example:
```/dev/null/commands.txt#L1-3
cd be
dotnet build
dotnet run --project src/Syncra.Workers
```

### Code Example

```/dev/null/PostPublishFailedHandler.cs#L1-17
public sealed class PostPublishFailedHandler : INotificationHandler<PostPublishFailed>
{
    private readonly ILogger<PostPublishFailedHandler> _logger;

    public PostPublishFailedHandler(ILogger<PostPublishFailedHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(PostPublishFailed notification, CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Notification hook received publish failure for attempt {PublishAttemptId} with correlation {CorrelationId}",
            notification.PublishAttemptId,
            notification.CorrelationId);

        return Task.CompletedTask;
    }
}
```

### Verification

- Trigger publish success and failure
- Confirm notification hook receives the events
- Confirm no publish flow logic depends on notification subsystem success

---

## Task: Add audit logging for integration and publishing actions

### Purpose
Audit logging is required for traceability of sensitive account linkage changes and operational publishing actions.

### Implementation Steps

#### Step 1
Write audit entries for:
- social account connect initiated
- social account connected
- social account disconnected
- publish-now requested
- scheduled dispatch requested
- publish succeeded
- publish failed

#### Step 2
Store actor, workspace, entity type, entity id, action, timestamp, and summary payload.

#### Step 3
Avoid sensitive token data in audit details.

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
# exercise connect, disconnect, and publish flows
```

### Code Example

```/dev/null/AuditLogEntry.cs#L1-16
public sealed record AuditLogEntry(
    Guid WorkspaceId,
    Guid? ActorUserId,
    string EntityType,
    string EntityId,
    string Action,
    DateTimeOffset OccurredAtUtc,
    string SummaryJson);
```

### Verification

- Connect account and confirm audit entry exists
- Disconnect account and confirm audit entry exists
- Publish and confirm attempt-related audit entries exist
- Confirm no secrets are recorded

---

## Task: Add structured operational logging

### Purpose
Structured logging is necessary for diagnosing scheduler behavior, provider dispatch outcomes, retries, and failures in distributed or worker-based execution.

### Implementation Steps

#### Step 1
Add logs for:
- scheduler scan start/end
- number of due posts found
- each claimed schedule
- queue publish requested
- provider publish started
- provider publish success/failure
- retry attempt incremented

#### Step 2
Always include:
- correlation id
- publish attempt id
- post id
- schedule id when available
- provider
- workspace id

#### Step 3
Redact tokens, secrets, and raw payloads.

### Commands

Example:
```/dev/null/commands.txt#L1-3
cd be
dotnet run --project src/Syncra.Workers
```

### Code Example

```/dev/null/logging-example.cs#L1-16
_logger.LogInformation(
    "Dispatching publish attempt {PublishAttemptId} for post {PostId} provider {Provider} correlation {CorrelationId}",
    publishAttempt.Id,
    publishAttempt.PostId,
    publishAttempt.Provider,
    publishAttempt.CorrelationId);
```

### Verification

- Run scheduler and inspect logs
- Confirm correlation ids appear consistently
- Confirm failures include actionable reason codes
- Confirm logs do not expose secrets

---

## Task: Document provider onboarding assumptions and callback requirements

### Purpose
The team needs a consistent reference for how new providers are configured, how callback URLs are registered, and what assumptions the MVP makes about scopes, tokens, and publish flows.

### Implementation Steps

#### Step 1
Create internal documentation covering:
- provider supported environments
- callback URL format
- required scopes
- token expiry expectations
- whether refresh token is available
- supported publish formats
- sandbox or mock mode behavior

#### Step 2
Document publish flow states:
- pending
- requested
- processing
- succeeded
- failed
- blocked

#### Step 3
Document disconnect behavior and retry policy.

### Commands

Example:
```/dev/null/commands.txt#L1-2
mkdir -p docs/integrations
touch docs/integrations/social-provider-onboarding.md
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-6
docs
└── integrations
    ├── social-provider-onboarding.md
    ├── publish-flow-states.md
    └── callback-url-reference.md
```

### Verification

- Confirm docs exist in repository
- Confirm a developer can configure a mock provider from documentation alone
- Confirm callback URL expectations are unambiguous

---

## Task: Update Swagger/OpenAPI documentation

### Purpose
Swagger/OpenAPI should reflect all new social integration and publishing endpoints so frontend and QA teams can use the APIs without reverse engineering the contracts.

### Implementation Steps

#### Step 1
Add XML comments or OpenAPI annotations to:
- `GET /api/v1/integrations/social-accounts`
- `POST /api/v1/integrations/{provider}/connect`
- callback endpoint
- `DELETE /api/v1/integrations/social-accounts/{id}`
- `POST /api/v1/publishing/posts/{id}/publish-now`

#### Step 2
Provide request/response examples.

#### Step 3
Document security behavior:
- workspace-scoped authorization
- no token values returned
- idempotency header for publish-now

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Api
# open /swagger
```

### Code Example

Example Swagger setup:
```/dev/null/Program.cs#L1-22
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Syncra API",
        Version = "v1",
        Description = "Social integrations and publishing pipeline endpoints"
    });

    string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});
```

### Verification

- Start API and open Swagger UI
- Confirm all Day 5 endpoints appear
- Confirm request and response schemas are accurate
- Confirm example payloads are visible

---

## Task: Infrastructure baseline for PostgreSQL, Redis, and RabbitMQ

### Purpose
The Day 5 publishing pipeline depends on PostgreSQL for persistence, Redis for short-lived OAuth/connect state or dedupe helpers, and RabbitMQ for publish request queueing or event transport.

### Implementation Steps

#### Step 1
Run local infrastructure through Docker Compose.

#### Step 2
Configure application connection strings.

#### Step 3
Verify each service independently before testing application flows.

#### Step 4
Wire health checks for all infrastructure dependencies.

### Commands

Docker Compose example:
```/dev/null/docker-compose.yml#L1-31
version: '3.9'
services:
  postgres:
    image: postgres:16
    container_name: syncra-postgres
    environment:
      POSTGRES_DB: syncra
      POSTGRES_USER: syncra
      POSTGRES_PASSWORD: syncra
    ports:
      - "5432:5432"
    volumes:
      - syncra-postgres:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: syncra-redis
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    container_name: syncra-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: syncra
      RABBITMQ_DEFAULT_PASS: syncra
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  syncra-postgres:
```

Start services:
```/dev/null/commands.txt#L1-6
cd be
docker compose up -d
docker ps
```

PostgreSQL connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=syncra;Username=syncra;Password=syncra"
  }
}
```

Redis connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false"
  }
}
```

RabbitMQ connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "RabbitMq": "amqp://syncra:syncra@localhost:5672"
  }
}
```

Basic PostgreSQL test operation:
```/dev/null/postgres-test.sql#L1-2
SELECT NOW();
SELECT 1;
```

Basic Redis test operation:
```/dev/null/redis-test.txt#L1-4
redis-cli -p 6379
SET publish:test ready
GET publish:test
```

Basic RabbitMQ test publisher:
```/dev/null/RabbitMqSmokeTest.cs#L1-24
var factory = new ConnectionFactory
{
    Uri = new Uri("amqp://syncra:syncra@localhost:5672")
};

using IConnection connection = factory.CreateConnection();
using IModel channel = connection.CreateModel();

channel.QueueDeclare("publish-requests", durable: true, exclusive: false, autoDelete: false);

byte[] body = Encoding.UTF8.GetBytes("{\"message\":\"hello\"}");

channel.BasicPublish(
    exchange: "",
    routingKey: "publish-requests",
    basicProperties: null,
    body: body);
```

### Verification

- Confirm PostgreSQL accepts connections and migrations run
- Confirm Redis set/get works
- Confirm RabbitMQ management UI opens at `http://localhost:15672`
- Confirm a test publish message can be sent to a queue

---

## Task: ASP.NET Core setup for integrations and publishing pipeline

### Purpose
The API and worker runtime must be configured consistently with dependency injection, Swagger, provider settings, queueing services, and middleware needed for Day 5 flows.

### Implementation Steps

#### Step 1
Register:
- EF Core DbContext
- MediatR/application handlers
- provider auth clients
- provider publish clients
- token encryption service
- Redis state store
- RabbitMQ dispatcher
- audit logging services
- health checks

#### Step 2
Enable Swagger in development.

#### Step 3
Register authentication and workspace context middleware.

#### Step 4
Map integrations and publishing endpoints.

### Commands

Example:
```/dev/null/commands.txt#L1-9
cd be

dotnet add src/Syncra.Api package Swashbuckle.AspNetCore
dotnet add src/Syncra.Api package AspNetCore.HealthChecks.NpgSql
dotnet add src/Syncra.Api package AspNetCore.HealthChecks.Redis
dotnet add src/Syncra.Api package AspNetCore.HealthChecks.Rabbitmq

dotnet build
dotnet run --project src/Syncra.Api
```

### Code Example

Example `Program.cs` setup:
```/dev/null/Program.cs#L1-62
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<ITokenEncryptionService, TokenEncryptionService>();
builder.Services.AddScoped<IPostPublishOrchestrator, PostPublishOrchestrator>();
builder.Services.AddScoped<IProviderConnectionStateStore, RedisProviderConnectionStateStore>();
builder.Services.AddScoped<IPublishDispatcher, RabbitMqPublishDispatcher>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization();

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Postgres")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!)
    .AddRabbitMQ(rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMq"));

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(PublishPostNowCommand).Assembly);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");

app.MapIntegrationsEndpoints();
app.MapPublishingEndpoints();

app.Run();
```

### Verification

- Start API successfully
- Open Swagger UI
- Confirm endpoints are registered
- Confirm DI resolves publishing services
- Confirm `/health`, `/health/ready`, and `/health/live` respond

---

## Task: Add health checks for API readiness and liveness

### Purpose
Health checks allow infrastructure, CI, and operators to determine whether the app is alive and whether critical dependencies are ready.

### Implementation Steps

#### Step 1
Add health check packages for PostgreSQL, Redis, and RabbitMQ.

#### Step 2
Register checks with descriptive names and tags.

#### Step 3
Expose:
- `/health`
- `/health/ready`
- `/health/live`

#### Step 4
Use readiness tags for dependency-backed checks and keep liveness lightweight.

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet build
dotnet run --project src/Syncra.Api

curl http://localhost:5000/health
curl http://localhost:5000/health/ready
curl http://localhost:5000/health/live
```

### Code Example

```/dev/null/Program.cs#L1-44
builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString: builder.Configuration.GetConnectionString("Postgres")!,
        name: "postgres",
        tags: new[] { "ready" })
    .AddRedis(
        redisConnectionString: builder.Configuration.GetConnectionString("Redis")!,
        name: "redis",
        tags: new[] { "ready" })
    .AddRabbitMQ(
        rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMq"),
        name: "rabbitmq",
        tags: new[] { "ready" });

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
```

### Verification

- `/health/live` returns healthy while process is running
- `/health/ready` fails if PostgreSQL, Redis, or RabbitMQ is unavailable
- `/health` returns aggregate health information
- Stop one dependency and confirm readiness reflects failure

---

Deliverables:
- social account integration schema and persistence baseline
- linked account list, connect, callback, and disconnect API contracts
- secure external account/token handling design for MVP
- publish-now command endpoint or equivalent orchestration path
- scheduler worker baseline that detects due posts and dispatches publish requests
- persisted publish attempt tracking with status lifecycle support
- notification and audit hooks connected to publish events
- updated API documentation for integrations and publishing

Dependencies:
- Sprint 2 post, media, and scheduling modules completed
- authenticated workspace context available from Sprint 1
- RabbitMQ or job orchestration baseline available from foundation setup
- agreed initial set of providers for scaffolding, even if real publishing is mocked
- environment strategy for storing provider secrets and callback configuration
- audit logging and idempotency foundations already in place

Blocker Check:
- verify callback URLs and provider app credentials are available or a mock strategy is defined
- verify scheduler worker can safely identify due posts without racing against duplicate executions
- verify provider secrets are stored outside source control and never exposed in logs or API responses
- verify publish attempt records can represent retry, failure, and success states clearly
- verify post eligibility rules are defined before publish is attempted, including schedule status, connected account availability, and required media/caption checks
- verify disconnect flow behavior is defined for existing scheduled posts tied to a removed account
- verify idempotency rules cover both manual publish-now actions and automated scheduler dispatches

Test Criteria:
- social account list endpoint returns workspace-scoped linked account data correctly
- connect endpoint returns a valid initiation response for the selected provider flow
- callback scaffold accepts provider response payload and stores normalized account metadata
- disconnect endpoint updates account state safely without leaving invalid active links
- publish-now command creates a publish request and publish attempt record successfully
- scheduler worker detects due posts and dispatches only eligible items
- duplicate scheduler execution does not create duplicate publish attempts for the same schedule window
- publish attempt records transition correctly across requested, processing, success, and failure states
- publish failure path stores actionable failure metadata and emits the correct event(s)
- audit logs are written for key integration and publishing mutations
- structured logs include correlation IDs for publish workflow tracing

End-of-Day Checklist:
- [ ] `social_accounts` table created
- [ ] `social_account_tokens` table created
- [ ] `social_account_scopes` table created
- [ ] publish tracking tables created
- [ ] linked account list endpoint implemented
- [ ] provider connect endpoint scaffolded
- [ ] provider callback flow scaffolded
- [ ] disconnect endpoint implemented
- [ ] publish-now flow implemented
- [ ] scheduler worker detects due posts
- [ ] idempotency enforced for publish dispatch
- [ ] publish attempt tracking active
- [ ] publish events emitted
- [ ] notification hooks connected to publish events
- [ ] audit logging added for integration and publish actions
- [ ] structured logging added for scheduler and provider dispatch paths
- [ ] health endpoints `/health`, `/health/ready`, and `/health/live` working
- [ ] Swagger/OpenAPI updated