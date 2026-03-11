# Day 3 – Ideas, AI Requests, and Repurpose Services

Date / Time:
Day 3 of 7

Sprint:
Sprint 2 – Core Services

Focus Area:
Ideas domain, AI request tracking, repurpose workflow contracts, and usage enforcement.

Tasks:
- create persistence models and migrations for `idea_groups`, `ideas`, `ai_requests`, `ai_generations`, `repurpose_jobs`, and `repurpose_atoms`
- implement idea group CRUD endpoints with workspace scoping and validation
- implement idea CRUD endpoints with create, update, delete, list, and move/status transition support
- enforce optimistic concurrency where idea updates or moves can conflict
- implement AI idea generation request endpoint contract and request persistence flow
- define normalized response shape for AI-generated ideas so frontend integration can stabilize early
- implement repurpose generation endpoint contract and persistence flow for request history
- create a worker stub or queue contract for asynchronous AI processing, even if the first implementation returns mock/provider output synchronously
- connect AI requests and repurpose requests to usage counters and plan entitlements
- add audit logs for idea creation, update, delete, move, and AI billable actions
- add idempotency handling to `POST /api/v1/ai/ideas/generate` and `POST /api/v1/repurpose/generate`
- update Swagger and developer notes for all new contracts

---

## Task: Create persistence models and migrations for ideas, AI requests, and repurpose services

Purpose

This task establishes the database foundation for the Ideas domain and AI-related workflows. These tables must support workspace isolation, request history, usage accounting, provider abstraction, retries, and future async processing.

Implementation Steps

### Step 1
Define the new domain entities in the backend domain layer:

- `IdeaGroup`
- `Idea`
- `AiRequest`
- `AiGeneration`
- `RepurposeJob`
- `RepurposeAtom`

Also define enums/value objects where useful:

- `IdeaStatus`
- `AiRequestType`
- `AiRequestStatus`
- `RepurposeJobStatus`
- `RepurposeAtomType`

Recommended entity responsibilities:

- `IdeaGroup`: logical grouping of ideas under a workspace
- `Idea`: content record tied to a group and workspace
- `AiRequest`: tracks an AI billable request and request lifecycle
- `AiGeneration`: stores generated outputs from an AI request
- `RepurposeJob`: tracks a repurpose workflow request
- `RepurposeAtom`: stores repurposed output fragments/assets

### Step 2
Add EF Core configurations for all entities using explicit table names, indexes, FK constraints, soft-delete fields if the project standard requires them, and concurrency tokens for mutable entities.

Recommended conventions:

- snake_case table names
- `id` as primary key
- `workspace_id` on all workspace-scoped tables
- `created_at`, `updated_at`
- optional `deleted_at` for soft delete
- `row_version` or equivalent concurrency token on `ideas` and optionally `idea_groups`

### Step 3
Define indexes for common query paths:

- `idea_groups(workspace_id, deleted_at)`
- `ideas(workspace_id, idea_group_id, status, deleted_at)`
- `ideas(workspace_id, updated_at desc)`
- `ai_requests(workspace_id, request_type, created_at desc)`
- `ai_requests(idempotency_key)` unique where present
- `repurpose_jobs(workspace_id, created_at desc)`
- `repurpose_atoms(repurpose_job_id, atom_type)`

### Step 4
Add the new `DbSet<>` registrations and apply entity configurations in the application DbContext.

### Step 5
Create the migration and verify the generated schema before applying it.

### Step 6
Apply the migration against PostgreSQL and inspect the tables manually.

Commands

Example:

```/dev/null/commands.txt#L1-18
cd be

dotnet add src/api package Microsoft.EntityFrameworkCore.Design
dotnet add src/infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL

dotnet ef migrations add AddIdeasAndAiCore \
  --project src/infrastructure \
  --startup-project src/api \
  --output-dir Persistence/Migrations

dotnet ef database update \
  --project src/infrastructure \
  --startup-project src/api

docker compose -f deploy/docker-compose.yml up -d postgres

psql "Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres" -c "\dt"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-30
backend
 ├ api
 │  ├ Endpoints
 │  ├ Middleware
 │  └ Program.cs
 ├ application
 │  ├ Ideas
 │  │  ├ Commands
 │  │  ├ Queries
 │  │  ├ Dtos
 │  │  └ Validators
 │  ├ Ai
 │  └ Repurpose
 ├ domain
 │  ├ Ideas
 │  │  ├ Idea.cs
 │  │  ├ IdeaGroup.cs
 │  │  └ Enums
 │  ├ Ai
 │  │  ├ AiRequest.cs
 │  │  └ AiGeneration.cs
 │  └ Repurpose
 │     ├ RepurposeJob.cs
 │     └ RepurposeAtom.cs
 ├ infrastructure
 │  ├ Persistence
 │  │  ├ Configurations
 │  │  ├ Migrations
 │  │  └ ApplicationDbContext.cs
 │  ├ Messaging
 │  └ Ai
 ├ workers
 │  └ Syncra.Worker
 ├ contracts
 ├ tests
 └ deploy
```

Code Example

Example entity skeleton:

```/dev/null/Idea.cs#L1-40
public sealed class Idea
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid IdeaGroupId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public IdeaGroup IdeaGroup { get; set; } = null!;
}
```

Example EF configuration:

```/dev/null/IdeaConfiguration.cs#L1-48
public sealed class IdeaConfiguration : IEntityTypeConfiguration<Idea>
{
    public void Configure(EntityTypeBuilder<Idea> builder)
    {
        builder.ToTable("ideas");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Summary)
            .HasMaxLength(1000);

        builder.Property(x => x.Content)
            .HasColumnType("text");

        builder.Property(x => x.Status)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.RowVersion)
            .IsRowVersion();

        builder.HasIndex(x => new { x.WorkspaceId, x.IdeaGroupId, x.Status, x.DeletedAt });
        builder.HasIndex(x => new { x.WorkspaceId, x.UpdatedAt });

        builder.HasOne(x => x.IdeaGroup)
            .WithMany(x => x.Ideas)
            .HasForeignKey(x => x.IdeaGroupId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

Configuration Example

PostgreSQL connection string format:

```/dev/null/appsettings.json#L1-9
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres"
  }
}
```

Docker compose example for infrastructure:

```/dev/null/docker-compose.yml#L1-47
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: syncra-postgres
    environment:
      POSTGRES_DB: syncra
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
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
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  syncra-postgres:
```

Verification

- Run migrations successfully.
- Confirm the tables exist in PostgreSQL.
- Confirm indexes and constraints are present.
- Insert one row into each table manually or through the API and verify FK relationships.
- Confirm concurrency column exists on `ideas`.

Basic PostgreSQL test query:

```/dev/null/postgres-test.sql#L1-6
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'idea_groups', 'ideas', 'ai_requests', 'ai_generations', 'repurpose_jobs', 'repurpose_atoms'
  );
```

---

## Task: Implement idea group CRUD endpoints with workspace scoping and validation

Purpose

Idea groups organize ideas inside a workspace. CRUD operations must respect the authenticated workspace context so users can never read or mutate groups outside their tenant scope.

Implementation Steps

### Step 1
Create DTOs for:

- `CreateIdeaGroupRequest`
- `UpdateIdeaGroupRequest`
- `IdeaGroupResponse`
- `IdeaGroupListResponse`

Suggested fields:

- `name`
- `description`
- `color`
- `sortOrder`

### Step 2
Add validators:

- `name` required, max length 100
- `description` optional, max length 500
- `color` optional, must match allowed hex/rgb pattern if used
- `sortOrder` must be non-negative

### Step 3
Implement endpoints:

- `POST /api/v1/idea-groups`
- `GET /api/v1/idea-groups`
- `GET /api/v1/idea-groups/{id}`
- `PUT /api/v1/idea-groups/{id}`
- `DELETE /api/v1/idea-groups/{id}`

Each endpoint must:

- require authentication
- resolve current `workspace_id`
- query only records belonging to that workspace
- ignore soft-deleted records
- return normalized response envelope

### Step 4
On delete, decide whether to:
- soft delete the group only if empty, or
- reject deletion when active ideas exist

Prefer explicit rejection first to avoid hidden cascades.

### Step 5
Add audit logging for create, update, and delete actions.

Commands

Example:

```/dev/null/commands.txt#L1-12
cd be

dotnet build Syncra.sln

curl -X POST http://localhost:5000/api/v1/idea-groups \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Growth Ideas\",\"description\":\"Ideas for growth\",\"color\":\"#7C3AED\",\"sortOrder\":0}"

curl http://localhost:5000/api/v1/idea-groups \
  -H "Authorization: Bearer <token>"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-18
application
 └ Ideas
    ├ Dtos
    │  ├ CreateIdeaGroupRequest.cs
    │  ├ UpdateIdeaGroupRequest.cs
    │  └ IdeaGroupResponse.cs
    ├ Validators
    │  └ CreateIdeaGroupRequestValidator.cs
    ├ Commands
    │  ├ CreateIdeaGroupCommand.cs
    │  ├ UpdateIdeaGroupCommand.cs
    │  └ DeleteIdeaGroupCommand.cs
    └ Queries
       ├ GetIdeaGroupByIdQuery.cs
       └ ListIdeaGroupsQuery.cs
```

Code Example

Example endpoint skeleton:

```/dev/null/IdeaGroupEndpoints.cs#L1-64
public static class IdeaGroupEndpoints
{
    public static IEndpointRouteBuilder MapIdeaGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/idea-groups")
            .RequireAuthorization()
            .WithTags("Idea Groups");

        group.MapGet("/", async (
            HttpContext httpContext,
            ApplicationDbContext db,
            CancellationToken cancellationToken) =>
        {
            var workspaceId = httpContext.GetRequiredWorkspaceId();

            var items = await db.IdeaGroups
                .Where(x => x.WorkspaceId == workspaceId && x.DeletedAt == null)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .Select(x => new IdeaGroupResponse(
                    x.Id,
                    x.Name,
                    x.Description,
                    x.Color,
                    x.SortOrder,
                    x.CreatedAt,
                    x.UpdatedAt))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Success(items));
        });

        return app;
    }
}
```

Verification

- Create a group and confirm it appears in list results.
- Try to fetch a group from another workspace and confirm `404` or `403` according to the API standard.
- Delete a group containing active ideas and confirm the API rejects the operation if that rule is chosen.
- Confirm audit logs contain create/update/delete records.

---

## Task: Implement idea CRUD endpoints with create, update, delete, list, and move/status transition support

Purpose

Ideas are the core product objects in this sprint. Developers need full CRUD and move capabilities because the frontend workflow depends on board/list movement, state transitions, and filtered lists.

Implementation Steps

### Step 1
Create DTOs for:

- `CreateIdeaRequest`
- `UpdateIdeaRequest`
- `MoveIdeaRequest`
- `IdeaResponse`
- `IdeaListItemResponse`

Suggested fields:

- `ideaGroupId`
- `title`
- `summary`
- `content`
- `status`
- `sortOrder`
- `tags` if tags are already supported, otherwise defer

### Step 2
Implement endpoints:

- `POST /api/v1/ideas`
- `GET /api/v1/ideas`
- `GET /api/v1/ideas/{id}`
- `PUT /api/v1/ideas/{id}`
- `DELETE /api/v1/ideas/{id}`
- `POST /api/v1/ideas/{id}/move`
- optional `POST /api/v1/ideas/{id}/status`

### Step 3
Enforce workspace scoping:

- validate target `idea_group_id` belongs to same workspace
- validate the idea itself belongs to current workspace
- never trust incoming workspace identifiers from the client

### Step 4
Validate allowed status transitions. Example state model:

- `draft`
- `ready`
- `generating`
- `published`
- `archived`

Example allowed transitions:

- `draft -> ready`
- `ready -> generating`
- `generating -> ready`
- `ready -> published`
- `published -> archived`
- `draft -> archived`

Document the rule in code and Swagger.

### Step 5
Implement move behavior:

- update `idea_group_id`
- optionally update `sort_order`
- optionally update `status`
- update `updated_at`
- save with concurrency control

### Step 6
Delete should be soft delete unless Day 1/2 standards specify hard delete for this domain.

Commands

Example:

```/dev/null/commands.txt#L1-20
curl -X POST http://localhost:5000/api/v1/ideas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"ideaGroupId\":\"00000000-0000-0000-0000-000000000001\",
        \"title\":\"Launch a short-form content series\",
        \"summary\":\"Weekly clips from long-form content\",
        \"content\":\"Repurpose podcasts into clips\",
        \"status\":\"draft\",
        \"sortOrder\":1
      }"

curl -X POST http://localhost:5000/api/v1/ideas/00000000-0000-0000-0000-000000000010/move \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"targetIdeaGroupId\":\"00000000-0000-0000-0000-000000000002\",
        \"status\":\"ready\",
        \"sortOrder\":0
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-20
application
 └ Ideas
    ├ Dtos
    │  ├ CreateIdeaRequest.cs
    │  ├ UpdateIdeaRequest.cs
    │  ├ MoveIdeaRequest.cs
    │  └ IdeaResponse.cs
    ├ Validators
    │  ├ CreateIdeaRequestValidator.cs
    │  ├ UpdateIdeaRequestValidator.cs
    │  └ MoveIdeaRequestValidator.cs
    ├ Commands
    │  ├ CreateIdeaCommand.cs
    │  ├ UpdateIdeaCommand.cs
    │  ├ DeleteIdeaCommand.cs
    │  └ MoveIdeaCommand.cs
    └ Queries
       ├ GetIdeaByIdQuery.cs
       └ ListIdeasQuery.cs
```

Code Example

Example move handler skeleton:

```/dev/null/MoveIdeaHandler.cs#L1-61
public sealed class MoveIdeaHandler
{
    public static async Task<IResult> HandleAsync(
        Guid id,
        MoveIdeaRequest request,
        HttpContext httpContext,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var workspaceId = httpContext.GetRequiredWorkspaceId();

        var idea = await db.Ideas
            .FirstOrDefaultAsync(x => x.Id == id && x.WorkspaceId == workspaceId && x.DeletedAt == null, cancellationToken);

        if (idea is null)
        {
            return Results.NotFound(ApiResponse.Fail("idea_not_found", "Idea was not found."));
        }

        var groupExists = await db.IdeaGroups.AnyAsync(
            x => x.Id == request.TargetIdeaGroupId &&
                 x.WorkspaceId == workspaceId &&
                 x.DeletedAt == null,
            cancellationToken);

        if (!groupExists)
        {
            return Results.BadRequest(ApiResponse.Fail("invalid_group", "Target group does not exist in the current workspace."));
        }

        idea.IdeaGroupId = request.TargetIdeaGroupId;
        idea.Status = request.Status;
        idea.SortOrder = request.SortOrder;
        idea.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(ApiResponse.Success(new { idea.Id }));
    }
}
```

Verification

- Create, update, list, and delete an idea successfully.
- Move an idea between groups successfully.
- Attempt an invalid move to another workspace group and confirm rejection.
- Attempt an invalid status transition and confirm validation error.
- Confirm deleted ideas do not appear in list results.

---

## Task: Enforce optimistic concurrency where idea updates or moves can conflict

Purpose

Concurrent edits are likely in collaborative workspaces. Without optimistic concurrency, one user can silently overwrite another user’s changes.

Implementation Steps

### Step 1
Add a concurrency token to `ideas` using `row_version` or the project’s equivalent.

### Step 2
Include concurrency information in read responses. Common options:

- base64 `rowVersion`
- ETag header
- numeric version column

Recommended first implementation:
- return `rowVersion` as base64 in response DTO
- require it back on update and move requests

### Step 3
When updating or moving an idea:
- load the entity
- set original concurrency value from the client request
- attempt save
- catch `DbUpdateConcurrencyException`
- return `409 Conflict`

### Step 4
Document conflict handling in Swagger and developer notes.

Commands

Example:

```/dev/null/commands.txt#L1-8
curl http://localhost:5000/api/v1/ideas/<id> \
  -H "Authorization: Bearer <token>"

# Use the returned rowVersion in a follow-up update request.
```

Code Example

Example request/response shape:

```/dev/null/IdeaResponse.cs#L1-20
public sealed record IdeaResponse(
    Guid Id,
    Guid IdeaGroupId,
    string Title,
    string Summary,
    string Content,
    string Status,
    int SortOrder,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
```

Example update flow:

```/dev/null/UpdateIdeaHandler.cs#L1-39
db.Entry(idea)
    .Property(x => x.RowVersion)
    .OriginalValue = Convert.FromBase64String(request.RowVersion);

try
{
    await db.SaveChangesAsync(cancellationToken);
}
catch (DbUpdateConcurrencyException)
{
    return Results.Conflict(ApiResponse.Fail(
        "concurrency_conflict",
        "The idea was modified by another request. Reload and try again."));
}
```

Verification

- Fetch an idea twice.
- Update it from client A.
- Attempt update from client B using stale `rowVersion`.
- Confirm the API returns `409 Conflict`.
- Confirm the original latest data remains intact.

---

## Task: Implement AI idea generation request endpoint contract and request persistence flow

Purpose

The frontend needs a stable AI generation API even before the final AI provider integration is finished. This task creates the request/response contract and guarantees request persistence for auditability, billing, retries, and future background execution.

Implementation Steps

### Step 1
Define endpoint contract:

- `POST /api/v1/ai/ideas/generate`

Suggested request fields:

- `prompt`
- `tone`
- `audience`
- `channel`
- `count`
- `ideaGroupId` optional if generated ideas should be associated immediately
- `context` object for structured metadata

### Step 2
Validate:

- prompt required
- count range, e.g. 1 to 10
- workspace-scoped group exists if supplied
- user has entitlement and remaining usage quota

### Step 3
Persist an `AiRequest` record before provider execution:
- request type = `idea_generation`
- request status = `pending`
- idempotency key if provided
- prompt/inputs snapshot
- provider name placeholder
- estimated usage or token fields if tracked

### Step 4
Generate results:
- initial implementation may return mock data or a provider abstraction response synchronously
- map provider output into normalized `AiGeneration` rows
- update `AiRequest` status to `completed` or `failed`

### Step 5
Return normalized response shape only. Do not expose provider-native payloads.

Commands

Example:

```/dev/null/commands.txt#L1-13
curl -X POST http://localhost:5000/api/v1/ai/ideas/generate \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 9b0c4dd7-147d-4de6-8f9d-5342a17f9021" \
  -H "Content-Type: application/json" \
  -d "{
        \"prompt\":\"Generate ideas for onboarding emails for SaaS users\",
        \"tone\":\"helpful\",
        \"audience\":\"new users\",
        \"channel\":\"email\",
        \"count\":3
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-20
application
 └ Ai
    ├ Dtos
    │  ├ GenerateIdeasRequest.cs
    │  ├ GenerateIdeasResponse.cs
    │  └ AiIdeaItemResponse.cs
    ├ Validators
    │  └ GenerateIdeasRequestValidator.cs
    ├ Services
    │  ├ IAiProvider.cs
    │  └ MockAiProvider.cs
    └ Commands
       └ GenerateIdeasCommand.cs
```

Code Example

Example endpoint skeleton:

```/dev/null/AiEndpoints.cs#L1-81
public static class AiEndpoints
{
    public static IEndpointRouteBuilder MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/ai")
            .RequireAuthorization()
            .WithTags("AI");

        group.MapPost("/ideas/generate", async (
            GenerateIdeasRequest request,
            HttpContext httpContext,
            ApplicationDbContext db,
            IAiProvider aiProvider,
            CancellationToken cancellationToken) =>
        {
            var workspaceId = httpContext.GetRequiredWorkspaceId();
            var userId = httpContext.GetRequiredUserId();

            var aiRequest = new AiRequest
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspaceId,
                CreatedByUserId = userId,
                RequestType = "idea_generation",
                Status = "pending",
                RequestPayloadJson = JsonSerializer.Serialize(request),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            db.AiRequests.Add(aiRequest);
            await db.SaveChangesAsync(cancellationToken);

            var providerResult = await aiProvider.GenerateIdeasAsync(request, cancellationToken);

            foreach (var item in providerResult.Items)
            {
                db.AiGenerations.Add(new AiGeneration
                {
                    Id = Guid.NewGuid(),
                    AiRequestId = aiRequest.Id,
                    WorkspaceId = workspaceId,
                    OutputType = "idea",
                    Title = item.Title,
                    Summary = item.Summary,
                    Content = item.Content,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }

            aiRequest.Status = "completed";
            aiRequest.UpdatedAt = DateTimeOffset.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(ApiResponse.Success(providerResult));
        });

        return app;
    }
}
```

Verification

- Send a generation request and confirm one `ai_requests` row is created.
- Confirm one or more `ai_generations` rows are created.
- Confirm the response shape is normalized and does not include raw provider payloads.
- Confirm failed provider execution marks `ai_requests.status = failed`.

---

## Task: Define normalized response shape for AI-generated ideas

Purpose

A normalized contract allows frontend integration to proceed without coupling to a specific provider. It also makes response caching, usage reporting, and future provider swaps much easier.

Implementation Steps

### Step 1
Create a stable response schema.

Recommended top-level fields:

- `requestId`
- `status`
- `provider`
- `generatedAt`
- `items`

Each item should include:

- `generationId`
- `title`
- `summary`
- `content`
- `keywords`
- `warnings`

### Step 2
Map all provider outputs into this shape inside the application layer.

### Step 3
Document the schema with Swagger examples so frontend developers can start against a stable payload.

Code Example

Example normalized response:

```/dev/null/GenerateIdeasResponse.cs#L1-24
public sealed record GenerateIdeasResponse(
    Guid RequestId,
    string Status,
    string Provider,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<AiIdeaItemResponse> Items);

public sealed record AiIdeaItemResponse(
    Guid GenerationId,
    string Title,
    string Summary,
    string Content,
    IReadOnlyList<string> Keywords,
    IReadOnlyList<string> Warnings);
```

Verification

- Confirm the same response shape is returned whether data comes from mock provider or future real provider.
- Confirm frontend can render ideas without special-case parsing.
- Confirm no raw provider schema appears in Swagger.

---

## Task: Implement repurpose generation endpoint contract and persistence flow for request history

Purpose

Repurpose generation is another billable AI workflow. It needs the same consistency guarantees as idea generation: persistence, auditability, normalized outputs, and future async support.

Implementation Steps

### Step 1
Define endpoint:
- `POST /api/v1/repurpose/generate`

Suggested request fields:

- `sourceIdeaId` optional
- `sourceText`
- `targetFormats` array such as `linkedin_post`, `tweet_thread`, `email`, `short_script`
- `tone`
- `audience`
- `countPerFormat`

### Step 2
Validate:
- at least one source field present
- source idea belongs to current workspace if supplied
- `targetFormats` contains supported values only
- entitlement and usage checks pass

### Step 3
Persist `RepurposeJob` first with status `pending`.

### Step 4
Generate outputs synchronously for now or enqueue work and return accepted state if using a queue stub.

### Step 5
Persist each generated output as a `RepurposeAtom`.

Commands

Example:

```/dev/null/commands.txt#L1-14
curl -X POST http://localhost:5000/api/v1/repurpose/generate \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 4ed6793e-c3d8-4aa0-8208-32c4a58e8c57" \
  -H "Content-Type: application/json" \
  -d "{
        \"sourceText\":\"A long-form article about product onboarding metrics\",
        \"targetFormats\":[\"linkedin_post\",\"tweet_thread\"],
        \"tone\":\"practical",
        \"audience\":\"product managers\",
        \"countPerFormat\":2
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-15
application
 └ Repurpose
    ├ Dtos
    │  ├ GenerateRepurposeRequest.cs
    │  ├ GenerateRepurposeResponse.cs
    │  └ RepurposeAtomResponse.cs
    ├ Validators
    │  └ GenerateRepurposeRequestValidator.cs
    ├ Services
    │  └ IRepurposeProvider.cs
    └ Commands
       └ GenerateRepurposeCommand.cs
```

Code Example

Example response shape:

```/dev/null/GenerateRepurposeResponse.cs#L1-22
public sealed record GenerateRepurposeResponse(
    Guid JobId,
    string Status,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<RepurposeAtomResponse> Items);

public sealed record RepurposeAtomResponse(
    Guid AtomId,
    string Format,
    string Title,
    string Content,
    IReadOnlyList<string> Warnings);
```

Verification

- Send repurpose request and confirm one `repurpose_jobs` row exists.
- Confirm one or more `repurpose_atoms` rows exist.
- Confirm source idea validation rejects cross-workspace access.
- Confirm output is normalized and stored for later retrieval.

---

## Task: Create a worker stub or queue contract for asynchronous AI processing

Purpose

Even if the first release executes synchronously, the backend must define a clean async boundary now. This prevents controller logic from being tightly coupled to provider execution and makes later queue-based scaling straightforward.

Implementation Steps

### Step 1
Define a queue message contract for AI and repurpose processing.

Suggested message fields:

- `requestId`
- `workspaceId`
- `userId`
- `requestType`
- `createdAt`

### Step 2
Create an abstraction such as:

- `IAiRequestQueue`
- `IRepurposeRequestQueue`

with methods like:
- `EnqueueIdeaGenerationAsync(...)`
- `EnqueueRepurposeAsync(...)`

### Step 3
Implement a first stub:
- synchronous no-op queue
- in-memory logger implementation
- or RabbitMQ publisher implementation behind the interface

### Step 4
If using RabbitMQ now, create exchanges/queues:

- `syncra.ai.requests`
- `syncra.repurpose.requests`

### Step 5
Add a worker project stub that can later consume queue messages.

Commands

Example:

```/dev/null/commands.txt#L1-15
cd be

dotnet new worker -n Syncra.Worker -o workers/Syncra.Worker
dotnet sln Syncra.sln add workers/Syncra.Worker/Syncra.Worker.csproj

docker compose -f deploy/docker-compose.yml up -d rabbitmq

# RabbitMQ management UI
# http://localhost:15672
# guest / guest
```

Expected Folder Structure

```/dev/null/tree.txt#L1-15
workers
 └ Syncra.Worker
    ├ Program.cs
    ├ Worker.cs
    ├ Messaging
    │  ├ AiRequestMessage.cs
    │  └ RepurposeRequestMessage.cs
    └ Services
       └ RabbitMqConsumer.cs
```

Code Example

RabbitMQ connection string format:

```/dev/null/appsettings.json#L1-7
{
  "RabbitMq": {
    "Host": "localhost",
    "Port": 5672,
    "Username": "guest",
    "Password": "guest"
  }
}
```

Publisher skeleton:

```/dev/null/RabbitMqAiRequestQueue.cs#L1-43
public sealed class RabbitMqAiRequestQueue : IAiRequestQueue
{
    public Task EnqueueIdeaGenerationAsync(AiRequestMessage message, CancellationToken cancellationToken)
    {
        // Serialize message and publish to syncra.ai.requests
        return Task.CompletedTask;
    }
}
```

Verification

- If using stub mode, confirm requests flow through the queue abstraction instead of directly invoking provider logic from endpoint code.
- If using RabbitMQ, publish one test message and confirm queue/exchange activity in management UI.
- Confirm worker stub starts without crashing.

Basic RabbitMQ publisher test

```/dev/null/rabbitmq-test.cs#L1-29
var factory = new ConnectionFactory
{
    HostName = "localhost",
    Port = 5672,
    UserName = "guest",
    Password = "guest"
};

using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();
channel.QueueDeclare("syncra.ai.requests", durable: true, exclusive: false, autoDelete: false);

var body = Encoding.UTF8.GetBytes("{\"requestId\":\"00000000-0000-0000-0000-000000000001\"}");
channel.BasicPublish("", "syncra.ai.requests", body: body);
```

---

## Task: Connect AI requests and repurpose requests to usage counters and plan entitlements

Purpose

AI and repurpose operations are billable platform capabilities. Usage must be checked before execution and incremented atomically only after a successful billable action.

Implementation Steps

### Step 1
Reuse Sprint 1 subscription and usage counter tables.

Define usage dimensions, for example:

- `ai_idea_generation_requests`
- `repurpose_generation_requests`

### Step 2
Create an entitlement service:

- `IPlanEntitlementService`
- `IUsageCounterService`

Responsibilities:
- resolve current workspace plan
- verify feature access
- verify quota remaining
- increment counters atomically

### Step 3
Perform checks before request execution:
- workspace subscription active
- plan allows requested feature
- quota available

### Step 4
Increment counters in the same transaction as successful request completion and idempotency persistence.

### Step 5
Protect against double increment on retries by linking usage increment to the idempotent request record or stored request status.

Commands

Example:

```/dev/null/commands.txt#L1-6
curl -X POST http://localhost:5000/api/v1/ai/ideas/generate \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: usage-check-001" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Generate onboarding ideas\",\"count\":2}"
```

Code Example

Example service contract:

```/dev/null/IUsageCounterService.cs#L1-20
public interface IUsageCounterService
{
    Task EnsureAvailableAsync(
        Guid workspaceId,
        string counterKey,
        int requestedUnits,
        CancellationToken cancellationToken);

    Task IncrementAsync(
        Guid workspaceId,
        string counterKey,
        int units,
        Guid sourceRequestId,
        CancellationToken cancellationToken);
}
```

Verification

- Confirm request is rejected when quota is exhausted.
- Confirm successful AI request increments usage exactly once.
- Retry the same idempotent request and confirm usage does not increment again.
- Confirm plan restrictions block unauthorized features.

---

## Task: Add audit logs for idea creation, update, delete, move, and AI billable actions

Purpose

Audit logs provide traceability for user actions and billable workflows. This is important for compliance, support, and debugging tenant-specific issues.

Implementation Steps

### Step 1
Reuse the Sprint 1/2 audit abstraction.

### Step 2
Emit audit entries for:
- idea group create/update/delete
- idea create/update/delete
- idea move
- AI idea generation request created/completed/failed
- repurpose request created/completed/failed

### Step 3
Capture structured metadata:
- `workspaceId`
- `userId`
- `entityType`
- `entityId`
- `action`
- `beforeJson`
- `afterJson`
- `correlationId`
- `idempotencyKey`

### Step 4
Make sure failures in audit logging do not silently hide primary business failures. Prefer transactional persistence if audit logs are stored in the same database.

Code Example

Example audit usage:

```/dev/null/AuditExample.cs#L1-22
await auditLogger.WriteAsync(new AuditLogEntry
{
    WorkspaceId = workspaceId,
    UserId = userId,
    EntityType = "idea",
    EntityId = idea.Id.ToString(),
    Action = "idea.move",
    BeforeJson = beforeJson,
    AfterJson = afterJson,
    CorrelationId = httpContext.TraceIdentifier,
    CreatedAt = DateTimeOffset.UtcNow
}, cancellationToken);
```

Verification

- Perform create, update, delete, and move actions.
- Confirm audit rows exist with correct entity/action values.
- Confirm AI and repurpose flows generate billable action audits.
- Confirm correlation/idempotency values are present when applicable.

---

## Task: Add idempotency handling to AI and repurpose generation endpoints

Purpose

Clients may retry AI/repurpose requests because of timeouts or network interruptions. Idempotency prevents duplicate records, double charges, and duplicate usage increments.

Implementation Steps

### Step 1
Reuse the idempotency infrastructure from Sprint 1.

### Step 2
Require or strongly support `Idempotency-Key` on:

- `POST /api/v1/ai/ideas/generate`
- `POST /api/v1/repurpose/generate`

### Step 3
Before processing:
- check if an idempotency record already exists for the same workspace, route, and key
- if a completed result exists, return stored response
- if a request is still processing, return safe in-progress response or conflict based on the API standard

### Step 4
Persist the final response body or a pointer to the persisted result so retries can replay safely.

### Step 5
Ensure usage counters and audit logging do not duplicate on replay.

Commands

Example:

```/dev/null/commands.txt#L1-15
curl -X POST http://localhost:5000/api/v1/ai/ideas/generate \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: same-request-123" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Generate landing page ideas\",\"count\":2}"

curl -X POST http://localhost:5000/api/v1/ai/ideas/generate \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: same-request-123" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Generate landing page ideas\",\"count\":2}"
```

Verification

- Send the same request twice with the same idempotency key.
- Confirm only one `ai_requests` row or one logical request result is created.
- Confirm usage increments once.
- Confirm replay returns the same normalized response safely.

---

## Task: Update Swagger and developer notes for all new contracts

Purpose

Day 3 introduces several new APIs and payloads. Swagger and developer notes must be updated so frontend and backend teams can integrate without reverse-engineering the implementation.

Implementation Steps

### Step 1
Add endpoint summaries, descriptions, request examples, and response examples for:

- idea groups
- ideas
- move/status operations
- AI generation
- repurpose generation

### Step 2
Document:
- auth requirements
- workspace scoping behavior
- concurrency handling
- idempotency behavior
- quota enforcement
- normalized AI response contract

### Step 3
Add developer notes explaining:
- why raw provider payloads are hidden
- how async queue processing will evolve
- how retries should be performed safely

ASP.NET Core Setup Task Requirements

Program.cs must include dependency injection, Swagger, auth, middleware, health checks, and endpoint registration.

Code Example

Example `Program.cs` setup:

```/dev/null/Program.cs#L1-85
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SigningKey"]!))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Default")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!)
    .AddRabbitMQ(sp =>
    {
        var configuration = sp.GetRequiredService<IConfiguration>();
        return $"{configuration["RabbitMq:Host"]}:{configuration["RabbitMq:Port"]}";
    }, name: "rabbitmq");

builder.Services.AddScoped<IAiProvider, MockAiProvider>();
builder.Services.AddScoped<IPlanEntitlementService, PlanEntitlementService>();
builder.Services.AddScoped<IUsageCounterService, UsageCounterService>();
builder.Services.AddScoped<IAiRequestQueue, RabbitMqAiRequestQueue>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapIdeaGroupEndpoints();
app.MapIdeaEndpoints();
app.MapAiEndpoints();
app.MapRepurposeEndpoints();

app.Run();
```

Verification

- Launch the API and open Swagger UI.
- Confirm all Day 3 endpoints appear with examples.
- Confirm response schemas are visible and accurate.
- Confirm developers can test authenticated endpoints from Swagger.

---

## Task: Add health checks for API, PostgreSQL, Redis, and RabbitMQ

Purpose

Health checks provide an operational readiness signal for local development, CI, containers, and future deployments.

Implementation Steps

### Step 1
Add health check packages:

- `AspNetCore.HealthChecks.NpgSql`
- `AspNetCore.HealthChecks.Redis`
- `AspNetCore.HealthChecks.Rabbitmq`

### Step 2
Register checks in `Program.cs`.

### Step 3
Expose the following endpoints:

- `/health`
- `/health/live`
- `/health/ready`

Suggested behavior:

- `/health`: overall status
- `/health/live`: app process is running
- `/health/ready`: verifies external dependencies

Commands

Example:

```/dev/null/commands.txt#L1-12
cd be

dotnet add src/api package AspNetCore.HealthChecks.NpgSql
dotnet add src/api package AspNetCore.HealthChecks.Redis
dotnet add src/api package AspNetCore.HealthChecks.Rabbitmq

curl http://localhost:5000/health
curl http://localhost:5000/health/live
curl http://localhost:5000/health/ready
```

Code Example

Example health check setup:

```/dev/null/HealthChecks.cs#L1-41
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
    .AddNpgSql(
        connectionString: builder.Configuration.GetConnectionString("Default")!,
        name: "postgres",
        tags: new[] { "ready" })
    .AddRedis(
        redisConnectionString: builder.Configuration.GetConnectionString("Redis")!,
        name: "redis",
        tags: new[] { "ready" })
    .AddRabbitMQ(
        rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMq")!,
        name: "rabbitmq",
        tags: new[] { "ready" });

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});
```

Infrastructure Task Requirements

Redis connection string format:

```/dev/null/appsettings.json#L1-8
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  }
}
```

Basic Redis test operation:

```/dev/null/redis-test.txt#L1-2
SET syncra:test ready
GET syncra:test
```

Basic PostgreSQL test query:

```/dev/null/postgres-check.sql#L1-1
select 1;
```

RabbitMQ connection string format:

```/dev/null/appsettings.json#L1-8
{
  "ConnectionStrings": {
    "RabbitMq": "amqp://guest:guest@localhost:5672"
  }
}
```

Verification

- `/health/live` returns healthy when the app starts.
- `/health/ready` returns healthy only when PostgreSQL, Redis, and RabbitMQ are reachable.
- Stop one dependency and confirm readiness fails while liveness still passes.

---

Deliverables:
- idea groups and ideas APIs with CRUD and move workflows
- AI request persistence and normalized generation contract
- repurpose request persistence and history model
- usage counter updates for AI/repurpose actions
- queue/worker stub for future async AI processing

Dependencies:
- Sprint 1 migrations, auth, workspace context, audit logging, and idempotency skeleton
- DTO alignment with frontend idea and AI workflows
- selected provider abstraction for future AI integration

Blocker Check:
- verify workspace filters are enforced on all idea queries and mutations
- verify usage counters update atomically and cannot double-increment on retries
- verify AI contracts do not leak provider-specific payload shapes to consumers
- verify move/status transitions are validated and do not allow invalid states

Test Criteria:
- idea group CRUD endpoints return expected responses and enforce auth/workspace scoping
- idea CRUD endpoints create, update, delete, and list records correctly
- move endpoint updates group/status correctly and handles conflict cases
- AI generate endpoint stores request history and returns normalized response shape
- repurpose endpoint stores request and result history correctly
- idempotency replay on AI/repurpose mutation endpoints returns safe duplicate behavior
- usage counters increment only once per successful billable request

End-of-Day Checklist:
- [ ] idea group tables created
- [ ] idea tables created
- [ ] idea group CRUD implemented
- [ ] idea CRUD implemented
- [ ] move/status workflow implemented
- [ ] AI request tables created
- [ ] AI generation endpoint contract implemented
- [ ] repurpose endpoint contract implemented
- [ ] usage counters enforced
- [ ] Swagger updated