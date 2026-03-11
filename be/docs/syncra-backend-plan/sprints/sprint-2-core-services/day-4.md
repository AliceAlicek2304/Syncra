# Day 4 – Posts, Media, and Calendar Scheduling

Date / Time:
Day 4 of 7

Sprint:
Sprint 2 – Core Services

Focus Area:
Post composition, media metadata, draft/edit flows, calendar querying, and scheduling operations.

Tasks:
- create persistence models and migrations for `posts`, `post_variants`, `post_media`, `post_schedules`, and any required `post_status_history` records
- implement post CRUD endpoints with workspace scoping, soft delete behavior, and standardized success/error envelopes
- implement draft save and edit flows to support the frontend content composer workflow
- implement platform-specific post variant persistence for multi-platform captions, hashtags, and content variants
- validate platform rules for caption length, required fields, media compatibility, and scheduling constraints
- implement media metadata persistence including file name, MIME type, size, storage key, upload status, ordering, and preview references
- integrate the object storage adapter for signed upload and signed download flows without exposing privileged credentials
- add upload validation for file type, extension, size, and maximum media count per post
- implement `GET /api/v1/calendar/posts` for calendar rendering with filtering by date range, status, and platform
- implement `POST /api/v1/calendar/posts` if needed for create-and-schedule workflow alignment with frontend behavior
- implement `PUT /api/v1/calendar/posts/{id}/schedule` for first-time scheduling
- implement `PUT /api/v1/calendar/posts/{id}/reschedule` for drag-drop and edit-based rescheduling
- normalize all scheduled timestamps to UTC and preserve timezone context separately if required
- enforce optimistic concurrency for post edits and schedule/reschedule operations using `version`
- add audit logging for post create, update, delete, schedule, reschedule, and media attach/remove operations
- ensure idempotency considerations are applied to create-and-schedule and publish-adjacent mutation paths
- update Swagger/OpenAPI and backend integration notes for posts, media, and calendar contracts

---

## Task: Create persistence models and migrations for posts, media, variants, schedules, and status history

Purpose

This task creates the database foundation for post composition, multi-platform content variants, media attachments, and scheduling workflows. The schema must support drafts, edits, platform-specific content, auditability, soft deletes, and conflict-safe scheduling.

Implementation Steps

### Step 1
Create domain entities for the post module:

- `Post`
- `PostVariant`
- `PostMedia`
- `PostSchedule`
- `PostStatusHistory`

Recommended responsibilities:

- `Post`: root aggregate for a composed content item
- `PostVariant`: platform-specific caption/content customization
- `PostMedia`: media metadata attached to a post
- `PostSchedule`: scheduling record and scheduling state
- `PostStatusHistory`: append-only record of status transitions

Recommended base fields across mutable entities:

- `Id`
- `WorkspaceId`
- `CreatedAt`
- `UpdatedAt`
- `DeletedAt` where soft delete is required
- `Version` for optimistic concurrency on `Post` and `PostSchedule`

### Step 2
Design the table fields explicitly.

Suggested `posts` fields:

- `id`
- `workspace_id`
- `idea_id` nullable if a post originates from an idea
- `title`
- `internal_notes`
- `status` such as `draft`, `scheduled`, `ready_to_publish`, `published`, `failed`, `archived`
- `primary_platform` optional
- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`
- `version`

Suggested `post_variants` fields:

- `id`
- `post_id`
- `workspace_id`
- `platform`
- `caption`
- `hashtags_json`
- `metadata_json`
- `created_at`
- `updated_at`

Suggested `post_media` fields:

- `id`
- `post_id`
- `workspace_id`
- `file_name`
- `original_file_name`
- `mime_type`
- `extension`
- `size_bytes`
- `storage_key`
- `preview_storage_key`
- `upload_status`
- `sort_order`
- `width`
- `height`
- `duration_seconds`
- `created_at`
- `updated_at`
- `deleted_at`

Suggested `post_schedules` fields:

- `id`
- `post_id`
- `workspace_id`
- `scheduled_for_utc`
- `timezone_id`
- `local_scheduled_for`
- `status`
- `last_rescheduled_at`
- `scheduled_by_user_id`
- `rescheduled_by_user_id`
- `created_at`
- `updated_at`
- `version`

Suggested `post_status_history` fields:

- `id`
- `post_id`
- `workspace_id`
- `from_status`
- `to_status`
- `reason`
- `changed_by_user_id`
- `created_at`

### Step 3
Add EF Core configurations for each entity with:

- explicit table names in `snake_case`
- required constraints
- max lengths
- indexes for workspace-scoped queries
- foreign keys with restricted deletes where appropriate
- concurrency configuration for `Version`

Recommended indexes:

- `posts(workspace_id, status, deleted_at, updated_at)`
- `posts(workspace_id, created_at)`
- `post_variants(post_id, platform)` unique
- `post_media(post_id, sort_order, deleted_at)`
- `post_schedules(workspace_id, scheduled_for_utc, status)`
- `post_status_history(post_id, created_at desc)`

### Step 4
Register new `DbSet<>` entries in the DbContext and apply all entity configurations.

### Step 5
Create a migration and review the generated SQL/schema carefully before applying.

### Step 6
Apply the migration to PostgreSQL and verify table creation, foreign keys, indexes, and concurrency columns.

Commands

Example:

```/dev/null/commands.txt#L1-16
cd be

dotnet ef migrations add AddPostsMediaCalendarScheduling \
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

```/dev/null/tree.txt#L1-26
backend
 ├ api
 │  ├ Endpoints
 │  ├ Middleware
 │  └ Program.cs
 ├ application
 │  └ Posts
 │     ├ Commands
 │     ├ Queries
 │     ├ Dtos
 │     ├ Validators
 │     └ Services
 ├ domain
 │  └ Posts
 │     ├ Post.cs
 │     ├ PostVariant.cs
 │     ├ PostMedia.cs
 │     ├ PostSchedule.cs
 │     ├ PostStatusHistory.cs
 │     └ Enums
 ├ infrastructure
 │  ├ Persistence
 │  │  ├ Configurations
 │  │  ├ Migrations
 │  │  └ ApplicationDbContext.cs
 │  └ Storage
 ├ tests
 └ deploy
```

Code Example

Example `Post` entity skeleton:

```/dev/null/Post.cs#L1-34
public sealed class Post
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid? IdeaId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string InternalNotes { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string? PrimaryPlatform { get; set; }

    public Guid CreatedByUserId { get; set; }
    public Guid UpdatedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public int Version { get; set; }

    public List<PostVariant> Variants { get; set; } = [];
    public List<PostMedia> Media { get; set; } = [];
    public PostSchedule? Schedule { get; set; }
}
```

Example EF configuration:

```/dev/null/PostConfiguration.cs#L1-43
public sealed class PostConfiguration : IEntityTypeConfiguration<Post>
{
    public void Configure(EntityTypeBuilder<Post> builder)
    {
        builder.ToTable("posts");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.InternalNotes)
            .HasMaxLength(4000);

        builder.Property(x => x.Status)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.PrimaryPlatform)
            .HasMaxLength(50);

        builder.Property(x => x.Version)
            .IsConcurrencyToken();

        builder.HasIndex(x => new { x.WorkspaceId, x.Status, x.DeletedAt, x.UpdatedAt });
        builder.HasIndex(x => new { x.WorkspaceId, x.CreatedAt });
    }
}
```

Configuration Example

PostgreSQL connection string format:

```/dev/null/appsettings.json#L1-7
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres"
  }
}
```

Docker compose example for PostgreSQL, Redis, and RabbitMQ:

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

- Run the migration successfully.
- Confirm `posts`, `post_variants`, `post_media`, `post_schedules`, and `post_status_history` exist.
- Confirm the unique index on `post_variants(post_id, platform)` exists.
- Confirm `version` is present on `posts` and `post_schedules`.
- Insert one post and related rows manually or through the API and verify FK relationships.

Basic PostgreSQL test query:

```/dev/null/postgres-test.sql#L1-7
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'posts', 'post_variants', 'post_media', 'post_schedules', 'post_status_history'
  );
```

---

## Task: Implement post CRUD endpoints with workspace scoping, soft delete behavior, and standardized success/error envelopes

Purpose

Posts are the central content object for the composer and calendar features. CRUD endpoints must enforce workspace isolation, consistent error handling, and soft deletion so the frontend can safely manage content without cross-tenant leakage or destructive deletes.

Implementation Steps

### Step 1
Create DTOs for:

- `CreatePostRequest`
- `UpdatePostRequest`
- `PostResponse`
- `PostListItemResponse`
- `DeletePostResponse`

Suggested fields for create/update:

- `title`
- `internalNotes`
- `primaryPlatform`
- `ideaId` optional
- `status` only if allowed by business rules
- `version` on update

### Step 2
Implement endpoints:

- `POST /api/v1/posts`
- `GET /api/v1/posts`
- `GET /api/v1/posts/{id}`
- `PUT /api/v1/posts/{id}`
- `DELETE /api/v1/posts/{id}`

Every endpoint must:

- require authentication
- resolve current `workspace_id` from claims/context
- ignore soft-deleted records by default
- use standard response envelopes for success and failure
- return `404` for records not visible in current workspace

### Step 3
On create:

- set `workspace_id` from current request context
- set `status = draft` unless another initial state is intentionally supported
- set audit and timestamp fields
- initialize `version = 1`

### Step 4
On update:

- load the post by `id + workspace_id + deleted_at is null`
- apply allowed field changes only
- increment `version`
- write a status history row if status changed
- update audit fields and timestamps

### Step 5
On delete:

- soft delete by setting `deleted_at`
- optionally soft delete dependent `post_media`
- leave status history intact
- ensure deleted posts do not appear in list or calendar queries

Commands

Example:

```/dev/null/commands.txt#L1-14
curl -X POST http://localhost:5000/api/v1/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Q2 launch teaser\",\"internalNotes\":\"Draft for review\",\"primaryPlatform\":\"instagram\"}"

curl http://localhost:5000/api/v1/posts \
  -H "Authorization: Bearer <token>"

curl -X DELETE http://localhost:5000/api/v1/posts/00000000-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer <token>"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-18
application
 └ Posts
    ├ Dtos
    │  ├ CreatePostRequest.cs
    │  ├ UpdatePostRequest.cs
    │  ├ PostResponse.cs
    │  └ PostListItemResponse.cs
    ├ Validators
    │  ├ CreatePostRequestValidator.cs
    │  └ UpdatePostRequestValidator.cs
    ├ Commands
    │  ├ CreatePostCommand.cs
    │  ├ UpdatePostCommand.cs
    │  └ DeletePostCommand.cs
    └ Queries
       ├ GetPostByIdQuery.cs
       └ ListPostsQuery.cs
```

Code Example

Example endpoint skeleton:

```/dev/null/PostEndpoints.cs#L1-72
public static class PostEndpoints
{
    public static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/posts")
            .RequireAuthorization()
            .WithTags("Posts");

        group.MapGet("/", async (
            HttpContext httpContext,
            ApplicationDbContext db,
            CancellationToken cancellationToken) =>
        {
            var workspaceId = httpContext.GetRequiredWorkspaceId();

            var items = await db.Posts
                .Where(x => x.WorkspaceId == workspaceId && x.DeletedAt == null)
                .OrderByDescending(x => x.UpdatedAt)
                .Select(x => new PostListItemResponse(
                    x.Id,
                    x.Title,
                    x.Status,
                    x.PrimaryPlatform,
                    x.UpdatedAt,
                    x.Version))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Success(items));
        });

        return app;
    }
}
```

Verification

- Create a post and confirm it appears in the post list.
- Fetch the same post by ID and confirm workspace scoping works.
- Delete the post and confirm it no longer appears in active queries.
- Confirm error envelopes are standardized for invalid or missing records.

---

## Task: Implement draft save and edit flows for the content composer workflow

Purpose

The frontend content composer needs a safe draft workflow where users can save partial work repeatedly before scheduling or publishing. This task ensures incomplete content can be persisted without forcing final validation too early.

Implementation Steps

### Step 1
Define the draft behavior clearly.

Recommended rules:

- drafts can exist with partial content
- drafts may have zero variants initially
- drafts may have media metadata attached before scheduling
- drafts can be updated multiple times
- scheduling validation is stricter than draft validation

### Step 2
Add dedicated command handlers or service methods for:

- `SaveDraftAsync`
- `EditDraftAsync`

You can implement these behind the standard create/update endpoints if the semantics stay clear.

### Step 3
Allow partial updates for draft-safe fields:

- title
- internal notes
- primary platform
- variants
- hashtags
- media ordering

Do not require scheduling fields during draft save.

### Step 4
If the frontend expects an explicit draft endpoint, add:

- `POST /api/v1/posts/drafts`
- `PUT /api/v1/posts/drafts/{id}`

If not, document that normal `POST /api/v1/posts` and `PUT /api/v1/posts/{id}` support draft semantics.

### Step 5
Return the full aggregate shape needed by the composer:

- post root
- variants
- media metadata
- schedule state if present
- current version

Commands

Example:

```/dev/null/commands.txt#L1-12
curl -X POST http://localhost:5000/api/v1/posts/drafts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Draft campaign\",\"internalNotes\":\"Need hashtags later\"}"

curl -X PUT http://localhost:5000/api/v1/posts/drafts/00000000-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Updated draft campaign\",\"version\":1}"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-15
application
 └ Posts
    ├ Commands
    │  ├ SaveDraftCommand.cs
    │  └ EditDraftCommand.cs
    ├ Dtos
    │  ├ SaveDraftRequest.cs
    │  └ EditDraftRequest.cs
    ├ Services
    │  └ IPostDraftService.cs
    └ Validators
       └ SaveDraftRequestValidator.cs
```

Code Example

Example draft request:

```/dev/null/SaveDraftRequest.cs#L1-18
public sealed record SaveDraftRequest(
    string Title,
    string? InternalNotes,
    string? PrimaryPlatform,
    IReadOnlyList<UpsertPostVariantRequest>? Variants,
    IReadOnlyList<Guid>? MediaIds);
```

Verification

- Save a draft with partial content and confirm persistence succeeds.
- Edit the draft multiple times and confirm `version` increments correctly.
- Confirm a draft without scheduling data is accepted.
- Confirm the composer response returns variants and media metadata when present.

---

## Task: Implement platform-specific post variant persistence for multi-platform captions, hashtags, and content variants

Purpose

A single post may need different copy for different publishing targets. Platform-specific variants let the backend persist cleanly separated captions, hashtags, and metadata without forcing the frontend to flatten everything into one content blob.

Implementation Steps

### Step 1
Create platform variant DTOs:

- `UpsertPostVariantRequest`
- `PostVariantResponse`

Suggested fields:

- `platform`
- `caption`
- `hashtags`
- `metadata` for provider/platform-specific draft options

### Step 2
Persist one variant per platform per post.

Recommended rule:
- `(post_id, platform)` must be unique

### Step 3
On create/update:

- validate each platform value
- upsert the variant row if it already exists
- remove missing variants only if the request explicitly represents full replacement
- otherwise use patch semantics carefully

### Step 4
Store hashtags either as:
- JSON array column, or
- normalized table later

For Sprint 2, JSON array is acceptable if query complexity is low.

### Step 5
Return variants in all post detail responses so the composer can hydrate without additional calls.

Commands

Example:

```/dev/null/commands.txt#L1-13
curl -X PUT http://localhost:5000/api/v1/posts/00000000-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"title\":\"Launch content pack\",
        \"version\":2,
        \"variants\":[
          {\"platform\":\"linkedin\",\"caption\":\"Long-form B2B copy\",\"hashtags\":[\"#saas\",\"#growth\"]},
          {\"platform\":\"instagram\",\"caption\":\"Short visual-first caption\",\"hashtags\":[\"#launch\",\"#creator\"]}
        ]
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-13
application
 └ Posts
    ├ Dtos
    │  ├ UpsertPostVariantRequest.cs
    │  └ PostVariantResponse.cs
    ├ Services
    │  └ IPostVariantService.cs
    └ Validators
       └ UpsertPostVariantRequestValidator.cs
```

Code Example

Example variant entity skeleton:

```/dev/null/PostVariant.cs#L1-21
public sealed class PostVariant
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid WorkspaceId { get; set; }

    public string Platform { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public string HashtagsJson { get; set; } = "[]";
    public string MetadataJson { get; set; } = "{}";

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Post Post { get; set; } = null!;
}
```

Verification

- Save two variants for different platforms and confirm both persist.
- Attempt to save duplicate variants for the same platform and confirm validation or unique index rejection.
- Fetch post detail and confirm variants are returned in the expected order/shape.
- Confirm hashtags are preserved round-trip.

---

## Task: Validate platform rules for caption length, required fields, media compatibility, and scheduling constraints

Purpose

Each publishing target has different content and media rules. Centralized validation prevents invalid content from moving deeper into the pipeline and reduces frontend/backend mismatch.

Implementation Steps

### Step 1
Create a platform rules service such as `IPlatformRuleService`.

Its responsibilities should include:

- caption length validation
- required media counts or restrictions
- supported MIME types per platform
- scheduling restrictions if any
- maximum hashtag count if applicable

### Step 2
Define initial supported platforms, for example:

- `instagram`
- `linkedin`
- `x`
- `facebook`

Keep the rules configurable rather than hardcoding them across multiple handlers.

### Step 3
Create a configuration section for platform limits.

Suggested fields per platform:

- `maxCaptionLength`
- `allowedMimeTypes`
- `maxMediaCount`
- `requiresMedia`
- `supportsVideo`
- `supportsMultipleMedia`

### Step 4
Run loose validation for drafts and strict validation for scheduling.

Example:
- draft save may allow empty caption
- schedule operation must require valid caption and media compatibility

### Step 5
Return field-specific validation errors in a consistent API shape.

Configuration Example

Platform rules config:

```/dev/null/appsettings.json#L1-31
{
  "PlatformRules": {
    "instagram": {
      "MaxCaptionLength": 2200,
      "AllowedMimeTypes": [ "image/jpeg", "image/png", "video/mp4" ],
      "MaxMediaCount": 10,
      "RequiresMedia": true,
      "SupportsVideo": true,
      "SupportsMultipleMedia": true
    },
    "linkedin": {
      "MaxCaptionLength": 3000,
      "AllowedMimeTypes": [ "image/jpeg", "image/png", "video/mp4" ],
      "MaxMediaCount": 1,
      "RequiresMedia": false,
      "SupportsVideo": true,
      "SupportsMultipleMedia": false
    }
  }
}
```

Code Example

Example service contract:

```/dev/null/IPlatformRuleService.cs#L1-17
public interface IPlatformRuleService
{
    Task ValidateDraftAsync(PostDraftValidationContext context, CancellationToken cancellationToken);
    Task ValidateScheduleAsync(PostScheduleValidationContext context, CancellationToken cancellationToken);
}
```

Verification

- Save an invalid draft and confirm only draft-level rules are applied.
- Attempt to schedule a post with caption too long for a platform and confirm rejection.
- Attempt to attach unsupported media and confirm validation error.
- Attempt to exceed max media count and confirm rejection.

---

## Task: Implement media metadata persistence including file name, MIME type, size, storage key, upload status, ordering, and preview references

Purpose

Media must be tracked independently from binary storage so the application can validate uploads, order attachments, render previews, and support future asynchronous processing.

Implementation Steps

### Step 1
Create DTOs for media metadata operations:

- `CreatePostMediaRequest`
- `PostMediaResponse`
- `ReorderPostMediaRequest`
- `RemovePostMediaRequest`

### Step 2
Persist only metadata in the database. Do not store binary content in PostgreSQL.

Required fields to store:

- file name
- original file name
- MIME type
- extension
- size
- storage key
- preview storage key if generated
- upload status
- sort order

### Step 3
Define upload status values:

- `pending`
- `uploaded`
- `failed`
- `removed`

### Step 4
Allow media records to be created before the physical upload is fully complete if using signed upload flows.

### Step 5
Support reordering and removal while preserving auditability.

Commands

Example:

```/dev/null/commands.txt#L1-12
curl -X POST http://localhost:5000/api/v1/posts/00000000-0000-0000-0000-000000000001/media \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"fileName\":\"launch-banner.png\",
        \"originalFileName\":\"banner-final.png\",
        \"mimeType\":\"image/png\",
        \"sizeBytes\":524288
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-15
application
 └ Posts
    ├ Dtos
    │  ├ CreatePostMediaRequest.cs
    │  ├ PostMediaResponse.cs
    │  └ ReorderPostMediaRequest.cs
    ├ Commands
    │  ├ AttachPostMediaCommand.cs
    │  ├ RemovePostMediaCommand.cs
    │  └ ReorderPostMediaCommand.cs
    └ Validators
       └ CreatePostMediaRequestValidator.cs
```

Code Example

Example media entity:

```/dev/null/PostMedia.cs#L1-28
public sealed class PostMedia
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid WorkspaceId { get; set; }

    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public long SizeBytes { get; set; }

    public string StorageKey { get; set; } = string.Empty;
    public string? PreviewStorageKey { get; set; }
    public string UploadStatus { get; set; } = "pending";
    public int SortOrder { get; set; }

    public int? Width { get; set; }
    public int? Height { get; set; }
    public decimal? DurationSeconds { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
```

Verification

- Attach media metadata to a post and confirm a `post_media` row is created.
- Reorder multiple media rows and confirm `sort_order` updates.
- Remove a media record and confirm it no longer appears in active responses.
- Confirm only metadata is stored in the database.

---

## Task: Integrate the object storage adapter for signed upload and signed download flows without exposing privileged credentials

Purpose

Media uploads and downloads must use secure, time-limited signed operations so clients can interact with object storage directly without receiving privileged backend credentials.

Implementation Steps

### Step 1
Define an object storage abstraction such as `IObjectStorageService`.

Required methods:

- `CreateSignedUploadAsync`
- `CreateSignedDownloadAsync`
- `DeleteObjectAsync`
- optional `ObjectExistsAsync`

### Step 2
Add configuration for the storage provider.

Suggested config fields:

- `Provider`
- `Bucket`
- `Region`
- `PublicBaseUrl` optional
- `SignedUploadExpiryMinutes`
- `SignedDownloadExpiryMinutes`

### Step 3
Create an endpoint for signed upload initialization:

- `POST /api/v1/posts/{id}/media/uploads`

The flow should be:

1. validate post ownership/workspace
2. validate file metadata
3. create `post_media` row in `pending` state
4. generate storage key
5. generate signed upload instruction
6. return upload URL/fields and media metadata ID

### Step 4
Create an endpoint to confirm upload completion if needed:

- `POST /api/v1/posts/{id}/media/{mediaId}/complete`

This endpoint should mark the media as `uploaded` after verification.

### Step 5
Create a signed download endpoint if the frontend needs protected preview access:

- `GET /api/v1/posts/{id}/media/{mediaId}/download`

Never return root credentials, service role keys, or unrestricted storage tokens to the client.

Commands

Example:

```/dev/null/commands.txt#L1-12
curl -X POST http://localhost:5000/api/v1/posts/00000000-0000-0000-0000-000000000001/media/uploads \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"fileName\":\"teaser.mp4\",
        \"mimeType\":\"video/mp4\",
        \"sizeBytes\":10485760
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-16
infrastructure
 └ Storage
    ├ IObjectStorageService.cs
    ├ ObjectStorageOptions.cs
    ├ SignedUploadResult.cs
    ├ SignedDownloadResult.cs
    ├ S3ObjectStorageService.cs
    └ SupabaseObjectStorageService.cs
```

Code Example

Example service contract:

```/dev/null/IObjectStorageService.cs#L1-24
public interface IObjectStorageService
{
    Task<SignedUploadResult> CreateSignedUploadAsync(
        string storageKey,
        string mimeType,
        TimeSpan expiresIn,
        CancellationToken cancellationToken);

    Task<SignedDownloadResult> CreateSignedDownloadAsync(
        string storageKey,
        TimeSpan expiresIn,
        CancellationToken cancellationToken);

    Task DeleteObjectAsync(string storageKey, CancellationToken cancellationToken);
}
```

Configuration Example

Example storage config:

```/dev/null/appsettings.json#L1-13
{
  "ObjectStorage": {
    "Provider": "Supabase",
    "Bucket": "post-media",
    "Region": "local",
    "SignedUploadExpiryMinutes": 15,
    "SignedDownloadExpiryMinutes": 10
  }
}
```

Verification

- Request a signed upload and confirm the response contains a short-lived upload instruction.
- Confirm no privileged credentials are returned in the response.
- Upload a file using the signed instruction and mark it complete.
- Request a signed download URL and confirm it is time-limited.

---

## Task: Add upload validation for file type, extension, size, and maximum media count per post

Purpose

Uploads must be validated before storage instructions are issued so the backend can reject unsupported files early and keep media usage aligned with platform rules and system constraints.

Implementation Steps

### Step 1
Create a file upload validation service such as `IUploadValidationService`.

Validation responsibilities:

- extension allowlist
- MIME type allowlist
- size upper bound
- max files per post
- consistency between MIME type and extension

### Step 2
Add configuration for upload limits.

Suggested fields:

- `AllowedExtensions`
- `AllowedMimeTypes`
- `MaxFileSizeBytes`
- `MaxMediaPerPost`

### Step 3
Validate upload requests before creating storage keys or signed URLs.

### Step 4
If the post already contains media:
- count only active non-deleted media
- reject requests exceeding `MaxMediaPerPost`

### Step 5
Return descriptive validation failures that frontend can map to form errors.

Configuration Example

Upload validation config:

```/dev/null/appsettings.json#L1-14
{
  "Uploads": {
    "AllowedExtensions": [ ".jpg", ".jpeg", ".png", ".mp4" ],
    "AllowedMimeTypes": [ "image/jpeg", "image/png", "video/mp4" ],
    "MaxFileSizeBytes": 20971520,
    "MaxMediaPerPost": 10
  }
}
```

Code Example

Example service contract:

```/dev/null/IUploadValidationService.cs#L1-16
public interface IUploadValidationService
{
    Task ValidateAsync(
        UploadValidationRequest request,
        int existingMediaCount,
        CancellationToken cancellationToken);
}
```

Verification

- Try uploading an allowed image and confirm acceptance.
- Try uploading a blocked extension and confirm rejection.
- Try uploading a file over the maximum size and confirm rejection.
- Try adding media beyond max count and confirm rejection.

---

## Task: Implement `GET /api/v1/calendar/posts` for calendar rendering with filtering by date range, status, and platform

Purpose

The calendar view needs a fast, predictable API that returns scheduled content across a date range with optional filtering. This endpoint drives the frontend calendar UI and must be workspace-safe and query-efficient.

Implementation Steps

### Step 1
Define query parameters:

- `fromUtc`
- `toUtc`
- `status` optional
- `platform` optional

Optional future filters:
- `postId`
- `createdByUserId`

### Step 2
Query `posts` joined with `post_schedules` and optionally variants.

Requirements:

- workspace scoping must be enforced
- only non-deleted posts
- include schedule data
- support filtering by schedule range
- support filtering by post status and platform

### Step 3
Create a response shape optimized for calendar rendering.

Suggested fields:

- `postId`
- `title`
- `status`
- `scheduledForUtc`
- `timezoneId`
- `primaryPlatform`
- `platforms`
- `mediaPreviewUrl` optional
- `version`

### Step 4
Add pagination only if range size becomes too large. For the first implementation, keep date windows bounded and documented.

### Step 5
Ensure UTC timestamps are returned consistently in ISO 8601 format.

Commands

Example:

```/dev/null/commands.txt#L1-6
curl "http://localhost:5000/api/v1/calendar/posts?fromUtc=2025-01-01T00:00:00Z&toUtc=2025-01-31T23:59:59Z&status=scheduled&platform=linkedin" \
  -H "Authorization: Bearer <token>"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-12
application
 └ Posts
    ├ Queries
    │  ├ GetCalendarPostsQuery.cs
    │  └ CalendarPostItemResponse.cs
    └ Validators
       └ GetCalendarPostsQueryValidator.cs
```

Code Example

Example response shape:

```/dev/null/CalendarPostItemResponse.cs#L1-16
public sealed record CalendarPostItemResponse(
    Guid PostId,
    string Title,
    string Status,
    DateTimeOffset ScheduledForUtc,
    string? TimezoneId,
    string? PrimaryPlatform,
    IReadOnlyList<string> Platforms,
    string? MediaPreviewUrl,
    int Version);
```

Verification

- Query a known date range and confirm scheduled posts are returned.
- Filter by status and confirm only matching posts appear.
- Filter by platform and confirm platform matching works.
- Confirm soft-deleted posts do not appear.
- Confirm all timestamps are returned in UTC.

---

## Task: Implement `POST /api/v1/calendar/posts` for create-and-schedule workflow alignment

Purpose

Some frontend calendar flows create a post directly from the calendar surface. This endpoint simplifies create-and-schedule behavior and reduces client-side orchestration.

Implementation Steps

### Step 1
Confirm whether the frontend expects a dedicated create-and-schedule endpoint. If yes, implement:

- `POST /api/v1/calendar/posts`

### Step 2
Define request payload with:
- base post fields
- variant payloads
- media references
- scheduling payload
- optional idempotency support

### Step 3
Within a single transaction:
- create the post
- create variants/media links
- validate scheduling
- create the schedule row
- update post status to `scheduled`
- write status history and audit logs

### Step 4
If the same logical request may be retried, attach idempotency handling.

### Step 5
Return the full scheduled post aggregate.

Commands

Example:

```/dev/null/commands.txt#L1-17
curl -X POST http://localhost:5000/api/v1/calendar/posts \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: create-schedule-001" \
  -H "Content-Type: application/json" \
  -d "{
        \"title\":\"Calendar quick create\",
        \"primaryPlatform\":\"linkedin\",
        \"scheduledForLocal\":\"2025-02-05T09:00:00\",
        \"timezoneId\":\"Asia/Ho_Chi_Minh\",
        \"variants\":[
          {\"platform\":\"linkedin\",\"caption\":\"Scheduled from calendar\"}
        ]
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-12
application
 └ Posts
    ├ Commands
    │  └ CreateScheduledPostCommand.cs
    ├ Dtos
    │  └ CreateScheduledPostRequest.cs
    └ Validators
       └ CreateScheduledPostRequestValidator.cs
```

Code Example

Example request shape:

```/dev/null/CreateScheduledPostRequest.cs#L1-18
public sealed record CreateScheduledPostRequest(
    string Title,
    string? PrimaryPlatform,
    string ScheduledForLocal,
    string TimezoneId,
    IReadOnlyList<UpsertPostVariantRequest> Variants,
    IReadOnlyList<Guid>? MediaIds);
```

Verification

- Create a scheduled post directly from the calendar endpoint.
- Confirm post, variants, and schedule rows are all created.
- Retry the same request with the same idempotency key and confirm duplicate creation does not occur.
- Confirm the returned post appears in calendar queries.

---

## Task: Implement `PUT /api/v1/calendar/posts/{id}/schedule` for first-time scheduling

Purpose

Draft posts must be schedulable after composition is complete. This endpoint transitions a post from draft/edit state into a scheduled state with validated UTC-safe timing.

Implementation Steps

### Step 1
Define request DTO:

- `scheduledForLocal`
- `timezoneId`
- `version`

Optional:
- `notes`
- `publishWindowStartUtc`
- `publishWindowEndUtc`

### Step 2
Load the post with workspace scoping and ensure:

- post exists
- post is not deleted
- post is not already scheduled unless overwrite is intentionally supported
- post passes strict platform and media validation

### Step 3
Convert local time + timezone into UTC.

Recommended behavior:
- store `scheduled_for_utc`
- store `timezone_id`
- optionally store original local timestamp string for UI reference

### Step 4
Create the `post_schedules` row and update post status to `scheduled`.

### Step 5
Write a status history row and audit entry.

Commands

Example:

```/dev/null/commands.txt#L1-10
curl -X PUT http://localhost:5000/api/v1/calendar/posts/00000000-0000-0000-0000-000000000001/schedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"scheduledForLocal\":\"2025-02-06T14:30:00\",
        \"timezoneId\":\"Asia/Ho_Chi_Minh\",
        \"version\":3
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-11
application
 └ Posts
    ├ Commands
    │  └ SchedulePostCommand.cs
    ├ Dtos
    │  └ SchedulePostRequest.cs
    └ Validators
       └ SchedulePostRequestValidator.cs
```

Code Example

Example scheduling logic skeleton:

```/dev/null/SchedulePostHandler.cs#L1-54
var workspaceId = httpContext.GetRequiredWorkspaceId();

var post = await db.Posts
    .Include(x => x.Variants)
    .Include(x => x.Media)
    .Include(x => x.Schedule)
    .FirstOrDefaultAsync(
        x => x.Id == id &&
             x.WorkspaceId == workspaceId &&
             x.DeletedAt == null,
        cancellationToken);

if (post is null)
{
    return Results.NotFound(ApiResponse.Fail("post_not_found", "Post was not found."));
}

if (post.Schedule is not null)
{
    return Results.BadRequest(ApiResponse.Fail("already_scheduled", "Post is already scheduled."));
}

await platformRuleService.ValidateScheduleAsync(
    PostScheduleValidationContext.From(post, request),
    cancellationToken);

var utcTimestamp = timeZoneService.ConvertLocalToUtc(request.ScheduledForLocal, request.TimezoneId);

post.Schedule = new PostSchedule
{
    Id = Guid.NewGuid(),
    WorkspaceId = workspaceId,
    ScheduledForUtc = utcTimestamp,
    TimezoneId = request.TimezoneId,
    LocalScheduledFor = request.ScheduledForLocal,
    Status = "scheduled",
    CreatedAt = DateTimeOffset.UtcNow,
    UpdatedAt = DateTimeOffset.UtcNow,
    Version = 1
};

post.Status = "scheduled";
post.UpdatedAt = DateTimeOffset.UtcNow;
post.Version += 1;
```

Verification

- Schedule a draft post successfully.
- Confirm the stored UTC value is correct for the provided timezone.
- Confirm post status changes to `scheduled`.
- Confirm a second first-time schedule call is rejected unless explicitly supported.

---

## Task: Implement `PUT /api/v1/calendar/posts/{id}/reschedule` for drag-drop and edit-based rescheduling

Purpose

Calendar drag-drop operations and edit flows need a dedicated reschedule path that updates timing safely, records audit history, and prevents conflicting edits.

Implementation Steps

### Step 1
Define request DTO with:
- `scheduledForLocal`
- `timezoneId`
- `version`
- `scheduleVersion` if schedule row tracks its own concurrency token

### Step 2
Load the post and schedule row with workspace scoping.

### Step 3
Apply optimistic concurrency checks before save.

### Step 4
Convert the local timestamp to UTC again and update:

- `scheduled_for_utc`
- `timezone_id`
- `local_scheduled_for`
- `last_rescheduled_at`
- `rescheduled_by_user_id`

### Step 5
Persist audit logs and status history if business logic requires reschedule events to be visible historically.

Commands

Example:

```/dev/null/commands.txt#L1-10
curl -X PUT http://localhost:5000/api/v1/calendar/posts/00000000-0000-0000-0000-000000000001/reschedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{
        \"scheduledForLocal\":\"2025-02-07T10:15:00\",
        \"timezoneId\":\"UTC\",
        \"version\":4,
        \"scheduleVersion\":1
      }"
```

Expected Folder Structure

```/dev/null/tree.txt#L1-11
application
 └ Posts
    ├ Commands
    │  └ ReschedulePostCommand.cs
    ├ Dtos
    │  └ ReschedulePostRequest.cs
    └ Validators
       └ ReschedulePostRequestValidator.cs
```

Code Example

Example update flow:

```/dev/null/ReschedulePostHandler.cs#L1-34
db.Entry(post)
    .Property(x => x.Version)
    .OriginalValue = request.Version;

db.Entry(post.Schedule!)
    .Property(x => x.Version)
    .OriginalValue = request.ScheduleVersion;

post.Schedule!.ScheduledForUtc = timeZoneService.ConvertLocalToUtc(
    request.ScheduledForLocal,
    request.TimezoneId);

post.Schedule.TimezoneId = request.TimezoneId;
post.Schedule.LocalScheduledFor = request.ScheduledForLocal;
post.Schedule.LastRescheduledAt = DateTimeOffset.UtcNow;
post.Schedule.UpdatedAt = DateTimeOffset.UtcNow;
post.Schedule.Version += 1;

post.UpdatedAt = DateTimeOffset.UtcNow;
post.Version += 1;
```

Verification

- Reschedule a scheduled post and confirm timing changes are persisted.
- Simulate drag-drop retry with stale version values and confirm `409 Conflict`.
- Confirm audit logs show a reschedule action.
- Confirm the calendar query reflects the new time.

---

## Task: Normalize all scheduled timestamps to UTC and preserve timezone context separately if required

Purpose

Scheduling logic becomes unreliable if local timestamps are stored inconsistently. UTC normalization guarantees comparison, sorting, and background execution remain predictable across user timezones.

Implementation Steps

### Step 1
Define the canonical rule:

- always store `scheduled_for_utc` in UTC
- store `timezone_id` as the original user timezone
- optionally store `local_scheduled_for` as a string or local datetime for UX reference

### Step 2
Introduce a time conversion service such as `ITimeZoneService`.

### Step 3
Use timezone identifiers consistently, preferably IANA IDs if the deployment stack supports them cleanly. If the .NET environment uses Windows IDs, standardize the conversion approach and document it.

### Step 4
Validate invalid or unknown timezone IDs with a descriptive error response.

### Step 5
Use UTC in all DB comparisons and all calendar query filtering.

Code Example

Example service contract:

```/dev/null/ITimeZoneService.cs#L1-12
public interface ITimeZoneService
{
    DateTimeOffset ConvertLocalToUtc(string localDateTime, string timezoneId);
    DateTimeOffset ConvertUtcToLocal(DateTimeOffset utcDateTime, string timezoneId);
}
```

Verification

- Schedule the same local time for two different timezones and confirm different UTC values are stored.
- Query the calendar by UTC range and confirm matching behavior is correct.
- Supply an invalid timezone ID and confirm validation failure.

---

## Task: Enforce optimistic concurrency for post edits and schedule/reschedule operations using `version`

Purpose

Multiple users may edit the same post or drag items around the calendar at the same time. Optimistic concurrency prevents silent overwrites and gives the frontend a standard conflict response.

Implementation Steps

### Step 1
Add `version` to:

- `posts`
- `post_schedules`

Treat them as concurrency tokens.

### Step 2
Include `version` in read/detail responses and require it back on update operations.

### Step 3
Before save, set original concurrency values from client-provided request data.

### Step 4
Catch `DbUpdateConcurrencyException` and return a standardized `409 Conflict` payload.

### Step 5
Document conflict handling in Swagger and integration notes.

Code Example

Example response DTO:

```/dev/null/PostResponse.cs#L1-20
public sealed record PostResponse(
    Guid Id,
    string Title,
    string Status,
    string? PrimaryPlatform,
    int Version,
    PostScheduleResponse? Schedule,
    IReadOnlyList<PostVariantResponse> Variants,
    IReadOnlyList<PostMediaResponse> Media);
```

Example concurrency handling:

```/dev/null/UpdatePostHandler.cs#L1-32
db.Entry(post)
    .Property(x => x.Version)
    .OriginalValue = request.Version;

try
{
    post.Title = request.Title;
    post.UpdatedAt = DateTimeOffset.UtcNow;
    post.Version += 1;

    await db.SaveChangesAsync(cancellationToken);
}
catch (DbUpdateConcurrencyException)
{
    return Results.Conflict(ApiResponse.Fail(
        "concurrency_conflict",
        "The post was modified by another request. Reload and try again."));
}
```

Verification

- Read a post twice.
- Update from client A.
- Retry update from client B using stale `version`.
- Confirm `409 Conflict`.
- Confirm latest persisted data remains unchanged by stale write.

---

## Task: Add audit logging for post create, update, delete, schedule, reschedule, and media attach/remove operations

Purpose

Audit logs are required for traceability, support investigations, and future compliance needs. Scheduling and media changes are important user-visible actions and should always be traceable.

Implementation Steps

### Step 1
Reuse the existing audit pipeline from prior sprint work.

### Step 2
Emit audit records for:

- `post.create`
- `post.update`
- `post.delete`
- `post.schedule`
- `post.reschedule`
- `post.media.attach`
- `post.media.remove`

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
Store before/after payloads carefully for scheduling and media changes so support teams can see exactly what changed.

Code Example

Example audit write:

```/dev/null/PostAuditExample.cs#L1-20
await auditLogger.WriteAsync(new AuditLogEntry
{
    WorkspaceId = workspaceId,
    UserId = userId,
    EntityType = "post",
    EntityId = post.Id.ToString(),
    Action = "post.reschedule",
    BeforeJson = beforeJson,
    AfterJson = afterJson,
    CorrelationId = httpContext.TraceIdentifier,
    CreatedAt = DateTimeOffset.UtcNow
}, cancellationToken);
```

Verification

- Create, edit, delete, schedule, and reschedule a post.
- Attach and remove media.
- Confirm corresponding audit records exist.
- Confirm correlation and idempotency fields are populated where relevant.

---

## Task: Ensure idempotency considerations are applied to create-and-schedule and publish-adjacent mutation paths

Purpose

Calendar quick-create and schedule-related operations may be retried by the frontend due to network issues or timeouts. Idempotency prevents duplicate posts, duplicate schedules, and duplicate audit or usage side effects.

Implementation Steps

### Step 1
Reuse the existing idempotency model introduced earlier in the project.

### Step 2
Apply idempotency to high-risk mutation endpoints such as:

- `POST /api/v1/calendar/posts`
- optional `POST /api/v1/posts`
- any future publish-adjacent action

### Step 3
On request start:
- check for an existing idempotency record by workspace, route, and key
- return stored response if request already completed
- reject or safely report in-progress state if still processing

### Step 4
Persist the final response or a pointer to the persisted aggregate.

### Step 5
Ensure downstream effects such as audit logging or usage accounting are not duplicated during replay.

Commands

Example:

```/dev/null/commands.txt#L1-14
curl -X POST http://localhost:5000/api/v1/calendar/posts \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: calendar-create-001" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Idempotent schedule create\",\"primaryPlatform\":\"linkedin\",\"scheduledForLocal\":\"2025-02-08T09:00:00\",\"timezoneId\":\"UTC\",\"variants\":[{\"platform\":\"linkedin\",\"caption\":\"One logical request\"}]}"

curl -X POST http://localhost:5000/api/v1/calendar/posts \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: calendar-create-001" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Idempotent schedule create\",\"primaryPlatform\":\"linkedin\",\"scheduledForLocal\":\"2025-02-08T09:00:00\",\"timezoneId\":\"UTC\",\"variants\":[{\"platform\":\"linkedin\",\"caption\":\"One logical request\"}]}"
```

Verification

- Send the same create-and-schedule request twice with the same idempotency key.
- Confirm only one post and one schedule are created.
- Confirm replay returns the same response envelope.
- Confirm audit side effects are not duplicated.

---

## Task: Update Swagger/OpenAPI and backend integration notes for posts, media, and calendar contracts

Purpose

The frontend cannot integrate quickly if endpoints, payloads, and validation rules are undocumented. Swagger and backend notes make the contracts explicit and reduce rework during integration.

Implementation Steps

### Step 1
Document all new endpoints:

- posts CRUD
- draft save/edit flows
- media upload init/complete/download
- calendar query
- schedule/reschedule
- create-and-schedule if implemented

### Step 2
Add request/response examples for:

- post detail response
- media upload init response
- schedule request
- reschedule request
- calendar list response
- conflict error response

### Step 3
Document:
- authentication requirements
- workspace scoping behavior
- soft delete behavior
- concurrency requirements
- UTC normalization rule
- upload validation rules
- idempotency behavior

### Step 4
Update developer notes explaining:
- why binary upload is direct-to-storage
- how signed uploads work
- which validation rules are draft-only vs schedule-time strict rules

ASP.NET Core Setup Task Requirements

Program.cs must include dependency injection, Swagger, middleware registration, auth, health checks, and endpoint registration.

Code Example

Example `Program.cs` setup:

```/dev/null/Program.cs#L1-95
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

builder.Services.Configure<ObjectStorageOptions>(
    builder.Configuration.GetSection("ObjectStorage"));
builder.Services.Configure<PlatformRulesOptions>(
    builder.Configuration.GetSection("PlatformRules"));
builder.Services.Configure<UploadOptions>(
    builder.Configuration.GetSection("Uploads"));

builder.Services.AddScoped<IObjectStorageService, SupabaseObjectStorageService>();
builder.Services.AddScoped<IPlatformRuleService, PlatformRuleService>();
builder.Services.AddScoped<IUploadValidationService, UploadValidationService>();
builder.Services.AddScoped<ITimeZoneService, TimeZoneService>();

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Default")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!)
    .AddRabbitMQ(builder.Configuration.GetConnectionString("RabbitMq")!);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapPostEndpoints();
app.MapPostMediaEndpoints();
app.MapCalendarPostEndpoints();

app.Run();
```

Verification

- Launch the API and open Swagger UI.
- Confirm all Day 4 endpoints appear.
- Confirm request and response examples are visible.
- Confirm conflict and validation error payloads are documented.
- Confirm developers can test secured endpoints from Swagger.

---

## Task: Add health checks for API, PostgreSQL, Redis, and RabbitMQ

Purpose

Health checks provide operational visibility for local development, CI, containers, and later deployment environments. Scheduling and media workflows depend on external systems, so readiness must validate them explicitly.

Implementation Steps

### Step 1
Add required health check packages:

- `AspNetCore.HealthChecks.NpgSql`
- `AspNetCore.HealthChecks.Redis`
- `AspNetCore.HealthChecks.Rabbitmq`

### Step 2
Register a basic self check and dependency checks in `Program.cs`.

### Step 3
Expose endpoints:

- `/health`
- `/health/live`
- `/health/ready`

Recommended behavior:

- `/health`: aggregate status
- `/health/live`: process-only liveness
- `/health/ready`: dependency readiness

### Step 4
Tag health checks so liveness does not fail when PostgreSQL, Redis, or RabbitMQ are down temporarily.

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

```/dev/null/HealthChecks.cs#L1-40
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

Basic RabbitMQ publisher test:

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
channel.QueueDeclare("syncra.posts.test", durable: true, exclusive: false, autoDelete: false);

var body = Encoding.UTF8.GetBytes("{\"message\":\"health-check-test\"}");
channel.BasicPublish("", "syncra.posts.test", body: body);
```

Verification

- `/health/live` returns healthy when the app starts.
- `/health/ready` returns healthy only when PostgreSQL, Redis, and RabbitMQ are reachable.
- Stop one dependency and confirm readiness fails while liveness still passes.

---

Deliverables:
- post domain schema and migration for posts, variants, media, and schedules
- working posts API with draft and edit support
- media metadata model and upload contract
- object storage integration pattern for signed uploads/downloads
- calendar query endpoint for scheduled content visualization
- schedule and reschedule endpoints with UTC-safe behavior
- updated API documentation for frontend/backend integration

Dependencies:
- Sprint 1 identity, workspace, audit, and idempotency foundations completed
- Day 3 core service patterns established for module structure, validation, and persistence
- PostgreSQL environment stable and migration pipeline working
- object storage environment available for development/testing
- agreed initial platform rules for supported publishing targets

Blocker Check:
- verify object storage configuration is available and not blocked by missing buckets, credentials, or CORS rules
- verify UTC normalization rules are agreed before implementing schedule persistence
- verify calendar response shape matches frontend rendering needs to avoid rework
- verify concurrency conflicts return standardized `409 Conflict` responses
- verify upload validation limits are defined clearly for size, type, and count
- verify draft/edit flow does not conflict with future publish pipeline design

Test Criteria:
- post CRUD endpoints work under authenticated, workspace-scoped access
- draft save persists post, variants, and media metadata correctly
- post edit flow updates only allowed fields and increments `version`
- signed upload flow returns valid upload instructions without leaking sensitive credentials
- invalid upload file types, file sizes, or media counts are rejected
- schedule endpoint stores `scheduled_for_utc` correctly
- reschedule endpoint updates scheduling data and preserves audit trail
- conflicting updates return `409 Conflict` with standardized error payload
- calendar query returns correct posts by range, status, and platform
- soft-deleted posts do not appear in active calendar and post listing queries

End-of-Day Checklist:
- [ ] `posts` table created
- [ ] `post_variants` table created
- [ ] `post_media` table created
- [ ] `post_schedules` table created
- [ ] post CRUD implemented
- [ ] draft save flow implemented
- [ ] edit flow implemented
- [ ] media metadata persistence implemented
- [ ] object storage adapter integrated
- [ ] upload validation enforced
- [ ] calendar query endpoint implemented
- [ ] schedule endpoint implemented
- [ ] reschedule endpoint implemented
- [ ] audit logging added for post mutations
- [ ] Swagger/OpenAPI updated