# Day 6 – Analytics, Trends, Notifications, and Support

Date / Time:
Day 6 of 7

Sprint:
Sprint 3 – Integrations

Focus Area:
Dashboard analytics, trend radar, notification consumption, support workflows, and cache-backed API responses.

Tasks:
- create persistence models and migrations for `analytics_snapshots`, `platform_metrics`, `heatmap_metrics`, `trend_topics`, `trend_hashtags`, `notifications`, `notification_deliveries`, and `support_tickets`
- add any required child tables such as support ticket comments, support ticket events, or analytics breakdown tables only if they are necessary for MVP delivery
- implement `GET /api/v1/analytics/overview` to return stable dashboard summary metrics by workspace and date range
- implement `GET /api/v1/analytics/platforms` for platform-level breakdowns such as reach, engagement, post count, and trend direction
- implement `GET /api/v1/analytics/heatmap` for time-bucketed performance visualization data
- define consistent filtering rules for analytics endpoints, including workspace scope, date range, platform, and status where relevant
- create `GET /api/v1/trends` and `GET /api/v1/trends/hashtags` endpoints with normalized response contracts
- design trend models so future ingestion jobs can refresh data without changing public response shapes
- implement `POST /api/v1/support/tickets`, `GET /api/v1/support/tickets`, and `GET /api/v1/support/tickets/{id}` with validation and standardized envelopes
- add support ticket ID generation, status tracking, severity/category fields, and audit trail support
- add notification consumer hooks for core events such as publish success, publish failure, support ticket created, and AI generation completed
- implement Redis-backed caching for dashboard-heavy endpoints, especially analytics overview and other high-read responses
- define TTL and invalidation rules so cached data stays useful without becoming misleading
- enforce workspace scoping, authorization, audit logging, and structured error handling across analytics, trends, notifications, and support endpoints
- update OpenAPI/Swagger documentation and backend integration notes for all APIs delivered today

---

## Task: Create persistence models and migrations for analytics, notifications, and support

### Purpose
This task creates the persistence layer required for dashboard analytics, trend discovery, notification delivery tracking, and support workflows. Without a stable schema, the API contracts delivered today will either be inconsistent or impossible to implement cleanly.

### Implementation Steps

#### Step 1
Create domain entities for:
- `AnalyticsSnapshot`
- `PlatformMetric`
- `HeatmapMetric`
- `TrendTopic`
- `TrendHashtag`
- `Notification`
- `NotificationDelivery`
- `SupportTicket`

#### Step 2
Add child entities only if they are needed for MVP behavior:
- `SupportTicketComment`
- `SupportTicketEvent`
- optional analytics breakdown rows such as daily or per-platform drilldown tables

#### Step 3
Define core required fields.

For `AnalyticsSnapshot`:
- `Id`
- `WorkspaceId`
- `FromUtc`
- `ToUtc`
- `TotalReach`
- `TotalEngagement`
- `TotalPosts`
- `EngagementRate`
- `GeneratedAtUtc`

For `PlatformMetric`:
- `Id`
- `WorkspaceId`
- `Platform`
- `FromUtc`
- `ToUtc`
- `Reach`
- `Engagement`
- `PostCount`
- `TrendDirection`
- `GeneratedAtUtc`

For `HeatmapMetric`:
- `Id`
- `WorkspaceId`
- `Platform`
- `DayOfWeek`
- `HourBucket`
- `Score`
- `PostCount`
- `WindowStartUtc`
- `WindowEndUtc`

For `TrendTopic` and `TrendHashtag`:
- `Id`
- `WorkspaceId` if trends are workspace-scoped, otherwise nullable/global
- `Platform`
- `Name`
- `Score`
- `Rank`
- `ObservedAtUtc`
- `Source`
- optional `MetadataJson`

For `Notification`:
- `Id`
- `WorkspaceId`
- `UserId` if user-targeted
- `Type`
- `Title`
- `Body`
- `Status`
- `PayloadJson`
- `CreatedAtUtc`
- `ReadAtUtc`

For `NotificationDelivery`:
- `Id`
- `NotificationId`
- `Channel`
- `Status`
- `AttemptCount`
- `LastAttemptAtUtc`
- `DeliveredAtUtc`
- `FailureReason`

For `SupportTicket`:
- `Id`
- `WorkspaceId`
- `TicketNumber`
- `RequesterUserId`
- `Subject`
- `Description`
- `Status`
- `Severity`
- `Category`
- `CreatedAtUtc`
- `UpdatedAtUtc`
- `ClosedAtUtc`

#### Step 4
Add EF Core configurations:
- table names in snake_case
- key constraints
- max lengths
- required columns
- JSON columns where appropriate
- indexes on `WorkspaceId`, `CreatedAtUtc`, `Platform`, `Status`
- unique index on `SupportTicket.TicketNumber`

#### Step 5
Create migration:
- generate migration from the infrastructure project
- inspect generated SQL
- verify foreign keys and indexes
- apply to local PostgreSQL

#### Step 6
Seed enough sample data to manually verify analytics and trends endpoints if real data sources are not ready.

### Commands

Example:
```/dev/null/commands.txt#L1-10
cd be

dotnet add src/Syncra.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add src/Syncra.Infrastructure package Microsoft.EntityFrameworkCore.Design

dotnet ef migrations add AddAnalyticsTrendsNotificationsSupport \
  --project src/Syncra.Infrastructure \
  --startup-project src/Syncra.Api

dotnet ef database update --project src/Syncra.Infrastructure --startup-project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-31
src
├── Syncra.Domain
│   ├── Analytics
│   │   └── Entities
│   │       ├── AnalyticsSnapshot.cs
│   │       ├── PlatformMetric.cs
│   │       └── HeatmapMetric.cs
│   ├── Trends
│   │   └── Entities
│   │       ├── TrendTopic.cs
│   │       └── TrendHashtag.cs
│   ├── Notifications
│   │   └── Entities
│   │       ├── Notification.cs
│   │       └── NotificationDelivery.cs
│   └── Support
│       └── Entities
│           ├── SupportTicket.cs
│           ├── SupportTicketComment.cs
│           └── SupportTicketEvent.cs
└── Syncra.Infrastructure
    └── Persistence
        ├── Configurations
        │   ├── AnalyticsSnapshotConfiguration.cs
        │   ├── PlatformMetricConfiguration.cs
        │   ├── HeatmapMetricConfiguration.cs
        │   ├── TrendTopicConfiguration.cs
        │   ├── TrendHashtagConfiguration.cs
        │   ├── NotificationConfiguration.cs
        │   ├── NotificationDeliveryConfiguration.cs
        │   └── SupportTicketConfiguration.cs
        └── Migrations
```

### Code Example

```/dev/null/SupportTicket.cs#L1-24
public sealed class SupportTicket
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid RequesterUserId { get; set; }
    public string TicketNumber { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string Status { get; set; } = "Open";
    public string Severity { get; set; } = "Medium";
    public string Category { get; set; } = "General";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset? ClosedAtUtc { get; set; }
}
```

```/dev/null/SupportTicketConfiguration.cs#L1-23
public sealed class SupportTicketConfiguration : IEntityTypeConfiguration<SupportTicket>
{
    public void Configure(EntityTypeBuilder<SupportTicket> builder)
    {
        builder.ToTable("support_tickets");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TicketNumber).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Subject).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Severity).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Category).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.TicketNumber).IsUnique();
        builder.HasIndex(x => new { x.WorkspaceId, x.Status });
        builder.HasIndex(x => x.CreatedAtUtc);
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

### Verification

- Run migrations successfully
- Confirm all required tables exist
- Confirm indexes exist for common query paths
- Confirm sample seed data can be inserted and queried
- Confirm support tickets can be uniquely identified by `TicketNumber`

Basic PostgreSQL test operation:
```/dev/null/postgres-test.sql#L1-4
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## Task: Add optional child tables only where required for MVP

### Purpose
This task prevents the team from overbuilding. The goal is to support MVP analytics and support workflows with only the minimum child tables necessary for stable business behavior.

### Implementation Steps

#### Step 1
Decide whether `SupportTicketComment` is needed in MVP:
- include it if support needs internal or requester-visible discussion
- skip it if only ticket create/list/detail is required today

#### Step 2
Decide whether `SupportTicketEvent` is needed:
- include it if status changes, assignments, or audit timeline must be stored separately
- otherwise rely on centralized audit logs plus basic ticket status

#### Step 3
Decide whether analytics breakdown rows are needed:
- add them only if overview/platform/heatmap endpoints cannot be served from the base tables

#### Step 4
Document these decisions directly in the sprint note so future developers understand why a child table was or was not created.

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet ef migrations add RefineAnalyticsSupportChildTables --project src/Syncra.Infrastructure --startup-project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-15
src
├── Syncra.Domain
│   └── Support
│       └── Entities
│           ├── SupportTicket.cs
│           ├── SupportTicketComment.cs
│           └── SupportTicketEvent.cs
└── Syncra.Infrastructure
    └── Persistence
        └── Configurations
            ├── SupportTicketConfiguration.cs
            ├── SupportTicketCommentConfiguration.cs
            └── SupportTicketEventConfiguration.cs
```

### Code Example

```/dev/null/SupportTicketEvent.cs#L1-16
public sealed class SupportTicketEvent
{
    public Guid Id { get; set; }
    public Guid SupportTicketId { get; set; }
    public string EventType { get; set; } = null!;
    public string Description { get; set; } = null!;
    public Guid? ActorUserId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
}
```

### Verification

- Confirm no unnecessary tables were added
- Confirm all created child tables are actually used by API or workflow logic
- Confirm migration history remains clean and understandable

---

## Task: Implement `GET /api/v1/analytics/overview`

### Purpose
This endpoint provides the dashboard’s top-level summary metrics. It should be stable, fast, workspace-scoped, and predictable for frontend binding.

### Implementation Steps

#### Step 1
Create `GetAnalyticsOverviewQuery` with inputs:
- `WorkspaceId`
- `FromUtc`
- `ToUtc`
- optional `Platform`

#### Step 2
Define a stable response contract including:
- date range
- total reach
- total engagement
- engagement rate
- total posts
- optional delta/trend values
- generated timestamp
- source indicator such as `cache` or `live` if useful

#### Step 3
Read from:
- precomputed snapshot tables if available
- or aggregate from raw/platform metrics if the snapshot is missing

#### Step 4
Apply validation:
- `FromUtc <= ToUtc`
- max date range window if needed, such as 90 days
- workspace scoping is mandatory

#### Step 5
Wrap response in the project’s standardized envelope if one exists.

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Api
curl "http://localhost:5000/api/v1/analytics/overview?fromUtc=2025-01-01T00:00:00Z&toUtc=2025-01-31T23:59:59Z"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-13
src
├── Syncra.Application
│   └── Analytics
│       ├── Queries
│       │   ├── GetAnalyticsOverviewQuery.cs
│       │   └── GetAnalyticsOverviewQueryHandler.cs
│       └── Dtos
│           └── AnalyticsOverviewDto.cs
└── Syncra.Api
    └── Endpoints
        └── AnalyticsEndpoints.cs
```

### Code Example

```/dev/null/GetAnalyticsOverviewQuery.cs#L1-19
public sealed record GetAnalyticsOverviewQuery(
    Guid WorkspaceId,
    DateTimeOffset FromUtc,
    DateTimeOffset ToUtc,
    string? Platform) : IRequest<AnalyticsOverviewDto>;

public sealed record AnalyticsOverviewDto(
    DateTimeOffset FromUtc,
    DateTimeOffset ToUtc,
    long TotalReach,
    long TotalEngagement,
    decimal EngagementRate,
    int TotalPosts,
    string DataSource,
    DateTimeOffset GeneratedAtUtc);
```

### Verification

- Call endpoint with a valid workspace and date range
- Confirm response fields are stable and consistently populated
- Confirm cross-workspace data is never returned
- Confirm invalid date ranges are rejected with validation errors

---

## Task: Implement `GET /api/v1/analytics/platforms`

### Purpose
This endpoint supports platform-specific dashboard sections such as reach by platform, engagement by platform, and trend direction.

### Implementation Steps

#### Step 1
Create `GetPlatformAnalyticsQuery` with:
- workspace id
- date range
- optional platform filter
- optional status filter if analytics depend on published status

#### Step 2
Group or read data by platform:
- Instagram
- LinkedIn
- X
- TikTok
- or whichever platforms exist in the current MVP

#### Step 3
Return stable rows with:
- platform
- reach
- engagement
- post count
- engagement rate
- trend direction
- comparison delta if available

#### Step 4
Keep response shape normalized even if some platforms have no data.

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Api
curl "http://localhost:5000/api/v1/analytics/platforms?fromUtc=2025-01-01T00:00:00Z&toUtc=2025-01-31T23:59:59Z"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Application
│   └── Analytics
│       ├── Queries
│       │   ├── GetPlatformAnalyticsQuery.cs
│       │   └── GetPlatformAnalyticsQueryHandler.cs
│       └── Dtos
│           └── PlatformAnalyticsDto.cs
└── Syncra.Api
    └── Endpoints
        └── AnalyticsEndpoints.cs
```

### Code Example

```/dev/null/PlatformAnalyticsDto.cs#L1-12
public sealed record PlatformAnalyticsDto(
    string Platform,
    long Reach,
    long Engagement,
    decimal EngagementRate,
    int PostCount,
    string TrendDirection,
    decimal? DeltaPercent);
```

### Verification

- Call endpoint with seeded platform data
- Confirm platform rows aggregate correctly
- Confirm platform filter narrows results correctly
- Confirm empty platforms are handled predictably

---

## Task: Implement `GET /api/v1/analytics/heatmap`

### Purpose
This endpoint provides time-bucketed visualization data that the frontend can use to render “best time to post” or performance heatmaps.

### Implementation Steps

#### Step 1
Create `GetAnalyticsHeatmapQuery` with:
- workspace id
- date range
- optional platform
- bucket strategy if needed

#### Step 2
Use stable buckets:
- day of week `0-6` or named day values
- hour bucket `0-23`

#### Step 3
Return normalized cells:
- day
- hour
- score
- post count
- optional engagement totals

#### Step 4
Make sure the response shape does not change if future ingestion logic becomes more advanced.

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Api
curl "http://localhost:5000/api/v1/analytics/heatmap?fromUtc=2025-01-01T00:00:00Z&toUtc=2025-01-31T23:59:59Z"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Application
│   └── Analytics
│       ├── Queries
│       │   ├── GetAnalyticsHeatmapQuery.cs
│       │   └── GetAnalyticsHeatmapQueryHandler.cs
│       └── Dtos
│           └── HeatmapCellDto.cs
└── Syncra.Api
    └── Endpoints
        └── AnalyticsEndpoints.cs
```

### Code Example

```/dev/null/HeatmapCellDto.cs#L1-10
public sealed record HeatmapCellDto(
    int DayOfWeek,
    int HourBucket,
    decimal Score,
    int PostCount,
    long Engagement);
```

### Verification

- Call endpoint with a valid date range
- Confirm each row maps to a stable day/hour bucket
- Confirm data can drive a frontend heatmap without additional transformation
- Confirm workspace scoping is enforced

---

## Task: Define consistent filtering rules for analytics endpoints

### Purpose
Analytics endpoints must behave consistently. If one endpoint handles filters differently from another, the dashboard will show contradictory results.

### Implementation Steps

#### Step 1
Standardize accepted query parameters:
- `fromUtc`
- `toUtc`
- `platform`
- `status` if relevant
- optional pagination only where response is list-like

#### Step 2
Create a shared request validation model or validator that can be reused across analytics endpoints.

#### Step 3
Define default behavior:
- if date range omitted, use a safe default such as last 30 days
- all queries are workspace-scoped
- unknown platforms return validation error rather than silently failing

#### Step 4
Document filter behavior in Swagger and backend notes.

### Commands

Example:
```/dev/null/commands.txt#L1-3
cd be
dotnet build
dotnet run --project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-10
src
├── Syncra.Application
│   └── Analytics
│       ├── Filters
│       │   └── AnalyticsFilter.cs
│       └── Validation
│           └── AnalyticsFilterValidator.cs
└── Syncra.Api
    └── Endpoints
        └── AnalyticsEndpoints.cs
```

### Code Example

```/dev/null/AnalyticsFilter.cs#L1-10
public sealed record AnalyticsFilter(
    DateTimeOffset? FromUtc,
    DateTimeOffset? ToUtc,
    string? Platform,
    string? Status);
```

### Verification

- Verify same filter values produce aligned results across overview, platform, and heatmap endpoints
- Verify invalid platforms are rejected
- Verify omitted filters fall back to documented defaults

---

## Task: Implement `GET /api/v1/trends` and `GET /api/v1/trends/hashtags`

### Purpose
These endpoints provide normalized trend and hashtag radar data for discovery surfaces and future content inspiration features.

### Implementation Steps

#### Step 1
Create query handlers:
- `GetTrendTopicsQuery`
- `GetTrendHashtagsQuery`

#### Step 2
Define shared response patterns:
- `name`
- `platform`
- `score`
- `rank`
- `observedAtUtc`
- optional `source`
- optional `metadata`

#### Step 3
Support optional filters:
- platform
- date window
- limit

#### Step 4
Do not expose provider-specific ingestion payloads directly to consumers.

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet build
dotnet run --project src/Syncra.Api

curl "http://localhost:5000/api/v1/trends?platform=linkedin"
curl "http://localhost:5000/api/v1/trends/hashtags?platform=linkedin"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-14
src
├── Syncra.Application
│   └── Trends
│       ├── Queries
│       │   ├── GetTrendTopicsQuery.cs
│       │   ├── GetTrendTopicsQueryHandler.cs
│       │   ├── GetTrendHashtagsQuery.cs
│       │   └── GetTrendHashtagsQueryHandler.cs
│       └── Dtos
│           ├── TrendTopicDto.cs
│           └── TrendHashtagDto.cs
└── Syncra.Api
    └── Endpoints
        └── TrendEndpoints.cs
```

### Code Example

```/dev/null/TrendTopicDto.cs#L1-11
public sealed record TrendTopicDto(
    string Name,
    string Platform,
    decimal Score,
    int Rank,
    DateTimeOffset ObservedAtUtc,
    string? Source);
```

```/dev/null/TrendHashtagDto.cs#L1-11
public sealed record TrendHashtagDto(
    string Name,
    string Platform,
    decimal Score,
    int Rank,
    DateTimeOffset ObservedAtUtc,
    string? Source);
```

### Verification

- Call both endpoints with seeded data
- Confirm response shapes are normalized and stable
- Confirm provider/raw payload differences are hidden
- Confirm filters work consistently

---

## Task: Design trend models for future ingestion without changing public contracts

### Purpose
Trend ingestion is likely to evolve. The public API should remain stable even if future jobs pull from different providers or ranking algorithms.

### Implementation Steps

#### Step 1
Separate persistence/integration fields from public contract fields.

#### Step 2
Store optional ingestion metadata in separate columns such as:
- `Source`
- `ExternalId`
- `ObservedAtUtc`
- `MetadataJson`

#### Step 3
Map persistence models to public DTOs through an application-level projection or mapper.

#### Step 4
Do not let external provider names or payload structures leak directly into endpoint responses unless they are intentionally part of the API.

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
│   └── Trends
│       ├── Mapping
│       │   └── TrendDtoMapper.cs
│       └── Dtos
│           ├── TrendTopicDto.cs
│           └── TrendHashtagDto.cs
└── Syncra.Infrastructure
    └── Trends
        └── Ingestion
            └── TrendIngestionMetadata.cs
```

### Code Example

```/dev/null/TrendDtoMapper.cs#L1-17
public static class TrendDtoMapper
{
    public static TrendTopicDto ToDto(TrendTopic entity)
    {
        return new TrendTopicDto(
            entity.Name,
            entity.Platform,
            entity.Score,
            entity.Rank,
            entity.ObservedAtUtc,
            entity.Source);
    }
}
```

### Verification

- Confirm DTO shape does not depend on ingestion source
- Confirm ingestion metadata can change without breaking endpoint contracts
- Confirm mapper remains the only translation boundary

---

## Task: Implement `POST /api/v1/support/tickets`

### Purpose
This endpoint allows workspace users to open support tickets with validated, triage-ready information.

### Implementation Steps

#### Step 1
Create `CreateSupportTicketCommand` with:
- workspace id
- requester user id
- subject
- description
- severity
- category

#### Step 2
Validate:
- subject required and length-limited
- description required
- severity in allowed set
- category in allowed set

#### Step 3
Generate human-readable ticket number such as:
- `SUP-2025-000001`
- or `TCK-000001`
Use a deterministic strategy that avoids collisions.

#### Step 4
Persist ticket with default status such as `Open` or `New`.

#### Step 5
Write audit log and publish `SupportTicketCreated` event if notification hooks depend on it.

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be
dotnet build
dotnet run --project src/Syncra.Api

curl -X POST http://localhost:5000/api/v1/support/tickets \
  -H "Content-Type: application/json" \
  -d "{\"subject\":\"Publishing failed\",\"description\":\"LinkedIn post failed after retry\",\"severity\":\"High\",\"category\":\"Publishing\"}"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-14
src
├── Syncra.Application
│   └── Support
│       ├── Commands
│       │   ├── CreateSupportTicketCommand.cs
│       │   └── CreateSupportTicketCommandHandler.cs
│       ├── Dtos
│       │   └── SupportTicketDto.cs
│       └── Services
│           └── ISupportTicketNumberGenerator.cs
└── Syncra.Api
    └── Endpoints
        └── SupportEndpoints.cs
```

### Code Example

```/dev/null/CreateSupportTicketCommand.cs#L1-23
public sealed record CreateSupportTicketCommand(
    Guid WorkspaceId,
    Guid RequesterUserId,
    string Subject,
    string Description,
    string Severity,
    string Category) : IRequest<SupportTicketDto>;
```

```/dev/null/ISupportTicketNumberGenerator.cs#L1-10
public interface ISupportTicketNumberGenerator
{
    Task<string> GenerateAsync(CancellationToken cancellationToken);
}
```

### Verification

- Create a ticket successfully
- Confirm default status is assigned
- Confirm ticket number is generated and unique
- Confirm audit log entry exists

---

## Task: Implement `GET /api/v1/support/tickets`

### Purpose
This endpoint allows users or support staff to list workspace tickets without exposing other workspaces’ data.

### Implementation Steps

#### Step 1
Create `GetSupportTicketsQuery` with filters:
- workspace id
- status
- severity
- category
- page and page size if pagination exists

#### Step 2
Order results predictably, for example:
- newest first
- or open tickets first, then newest

#### Step 3
Return summary fields only:
- id
- ticket number
- subject
- status
- severity
- category
- created at
- updated at

#### Step 4
Apply strict workspace scoping.

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Api
curl "http://localhost:5000/api/v1/support/tickets?status=Open"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Application
│   └── Support
│       ├── Queries
│       │   ├── GetSupportTicketsQuery.cs
│       │   └── GetSupportTicketsQueryHandler.cs
│       └── Dtos
│           └── SupportTicketListItemDto.cs
└── Syncra.Api
    └── Endpoints
        └── SupportEndpoints.cs
```

### Code Example

```/dev/null/SupportTicketListItemDto.cs#L1-12
public sealed record SupportTicketListItemDto(
    Guid Id,
    string TicketNumber,
    string Subject,
    string Status,
    string Severity,
    string Category,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
```

### Verification

- List tickets for a workspace
- Confirm only that workspace’s tickets are returned
- Confirm filters narrow results correctly
- Confirm response order is stable

---

## Task: Implement `GET /api/v1/support/tickets/{id}`

### Purpose
This endpoint returns ticket detail for a single authorized support ticket and serves as the foundation for future support timeline and comment features.

### Implementation Steps

#### Step 1
Create `GetSupportTicketByIdQuery` with:
- workspace id
- ticket id

#### Step 2
Load ticket details plus optional comments/events if those child tables were included in MVP.

#### Step 3
Return:
- ticket metadata
- description
- status
- severity
- category
- created/updated timestamps
- optional event history
- optional comments

#### Step 4
Return `404` if ticket does not exist in the workspace.

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Api
curl "http://localhost:5000/api/v1/support/tickets/00000000-0000-0000-0000-000000000100"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Application
│   └── Support
│       ├── Queries
│       │   ├── GetSupportTicketByIdQuery.cs
│       │   └── GetSupportTicketByIdQueryHandler.cs
│       └── Dtos
│           └── SupportTicketDetailDto.cs
└── Syncra.Api
    └── Endpoints
        └── SupportEndpoints.cs
```

### Code Example

```/dev/null/SupportTicketDetailDto.cs#L1-18
public sealed record SupportTicketDetailDto(
    Guid Id,
    string TicketNumber,
    string Subject,
    string Description,
    string Status,
    string Severity,
    string Category,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
```

### Verification

- Request an existing ticket in the same workspace
- Confirm detail response is complete
- Request a ticket from another workspace and confirm rejection or `404`
- Confirm optional comments/events appear only if implemented

---

## Task: Add support ticket ID generation, status tracking, severity/category fields, and audit trail support

### Purpose
Support workflows need triage-friendly identifiers and states so tickets can be referenced, prioritized, and audited consistently.

### Implementation Steps

#### Step 1
Define allowed statuses:
- `New`
- `Open`
- `InProgress`
- `Resolved`
- `Closed`

#### Step 2
Define allowed severities:
- `Low`
- `Medium`
- `High`
- `Critical`

#### Step 3
Define allowed categories:
- `General`
- `Billing`
- `Publishing`
- `Integrations`
- `AI`
- `Analytics`

#### Step 4
Implement ticket number generation with uniqueness guarantee:
- sequence-backed if available
- or transactional generator table
- or unique retry loop with deterministic format

#### Step 5
Write audit entries for:
- ticket created
- status changed
- ticket closed

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet ef database update --project src/Syncra.Infrastructure --startup-project src/Syncra.Api
```

### Code Example

```/dev/null/SupportTicketStatus.cs#L1-9
public static class SupportTicketStatuses
{
    public const string New = "New";
    public const string Open = "Open";
    public const string InProgress = "InProgress";
    public const string Resolved = "Resolved";
    public const string Closed = "Closed";
}
```

### Verification

- Create multiple tickets and confirm unique ticket numbers
- Confirm only allowed status/severity/category values are accepted
- Confirm audit logs capture creation and status transitions

---

## Task: Add notification consumer hooks for core events

### Purpose
Notification hooks allow the system to react to important product events without tightly coupling producers and consumers. This is the foundation for in-app notifications, email notifications, or future webhooks.

### Implementation Steps

#### Step 1
Identify core events to consume:
- `PostPublished`
- `PostPublishFailed`
- `SupportTicketCreated`
- `AiGenerationCompleted`

#### Step 2
Implement idempotent consumers or handlers:
- check whether the event has already been processed
- avoid duplicate notification creation
- persist delivery attempt metadata if notifications are sent externally

#### Step 3
Create notification records with:
- workspace id
- user id or recipient scope
- type
- title
- body
- payload json
- created timestamp

#### Step 4
Optionally enqueue channel delivery rows:
- in-app
- email
- webhook
- push

### Commands

Example:
```/dev/null/commands.txt#L1-5
cd be
dotnet build
dotnet run --project src/Syncra.Workers
# observe notification creation after replaying a known event
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-16
src
├── Syncra.Application
│   └── Notifications
│       ├── Handlers
│       │   ├── PostPublishedNotificationHandler.cs
│       │   ├── PostPublishFailedNotificationHandler.cs
│       │   ├── SupportTicketCreatedNotificationHandler.cs
│       │   └── AiGenerationCompletedNotificationHandler.cs
│       └── Dtos
│           └── NotificationDto.cs
└── Syncra.Infrastructure
    └── Notifications
        └── Delivery
            └── NotificationDeliveryService.cs
```

### Code Example

```/dev/null/PostPublishFailedNotificationHandler.cs#L1-28
public sealed class PostPublishFailedNotificationHandler : INotificationHandler<PostPublishFailed>
{
    private readonly IAppDbContext _dbContext;

    public PostPublishFailedNotificationHandler(IAppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task Handle(PostPublishFailed notification, CancellationToken cancellationToken)
    {
        bool alreadyExists = await _dbContext.Notifications.AnyAsync(
            x => x.WorkspaceId == notification.WorkspaceId &&
                 x.Type == "PostPublishFailed" &&
                 x.PayloadJson.Contains(notification.PublishAttemptId.ToString()),
            cancellationToken);

        if (alreadyExists)
        {
            return;
        }

        _dbContext.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            WorkspaceId = notification.WorkspaceId,
            Type = "PostPublishFailed",
            Title = "Post publishing failed",
            Body = $"Publishing failed for post {notification.PostId}",
            CreatedAtUtc = DateTimeOffset.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
```

### Verification

- Replay one event of each supported type
- Confirm a notification record is created once
- Replay the same event and confirm duplicate side effects do not occur
- Confirm notification rows contain correct workspace context

---

## Task: Implement Redis-backed caching for dashboard-heavy endpoints

### Purpose
Analytics endpoints are read-heavy and often expensive to compute. Redis-backed caching reduces database pressure and improves API responsiveness.

### Implementation Steps

#### Step 1
Choose which endpoints to cache first:
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/platforms`
- optionally `GET /api/v1/analytics/heatmap`
- trends endpoints if data is refreshed periodically rather than per-request

#### Step 2
Create a cache key strategy that includes:
- workspace id
- endpoint name
- normalized date range
- platform filter
- status filter if applicable

#### Step 3
On request:
- try Redis first
- if hit, deserialize and return
- if miss, compute, store with TTL, and return

#### Step 4
Keep cache serialization contract aligned with response DTOs.

#### Step 5
Log cache hits, misses, and writes with structured metadata.

### Commands

Example:
```/dev/null/commands.txt#L1-7
cd be
dotnet add src/Syncra.Infrastructure package StackExchange.Redis
dotnet build
dotnet run --project src/Syncra.Api

redis-cli -p 6379
KEYS analytics:*
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-14
src
├── Syncra.Application
│   └── Analytics
│       └── Services
│           └── IAnalyticsCacheService.cs
└── Syncra.Infrastructure
    └── Caching
        ├── AnalyticsCacheService.cs
        ├── CacheKeyFactory.cs
        └── CacheSerializationService.cs
```

### Code Example

```/dev/null/IAnalyticsCacheService.cs#L1-17
public interface IAnalyticsCacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken);
    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken);
    string BuildOverviewKey(Guid workspaceId, DateTimeOffset fromUtc, DateTimeOffset toUtc, string? platform);
}
```

### Configuration Examples

Redis connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false"
  }
}
```

### Verification

- Call overview endpoint twice with same filters
- Confirm second response is served from cache path
- Confirm Redis keys are created with expected naming
- Confirm cached response deserializes cleanly

Basic Redis test operation:
```/dev/null/redis-test.txt#L1-4
redis-cli -p 6379
SET analytics:test warm
GET analytics:test
```

---

## Task: Define TTL and invalidation rules for cache-backed responses

### Purpose
Caching only helps if it remains trustworthy. TTL and invalidation rules ensure data remains useful without misleading the dashboard after important updates.

### Implementation Steps

#### Step 1
Define endpoint-specific TTLs, for example:
- analytics overview: 5 minutes
- platform breakdown: 5 minutes
- heatmap: 10 minutes
- trends: 15 minutes if trends are batch-refreshed

#### Step 2
Define invalidation triggers:
- analytics snapshot refresh job runs
- new publish result affects a near-real-time metric
- support or notification endpoints generally should not use analytics caches

#### Step 3
Keep invalidation simple for MVP:
- prefer short TTL + coarse invalidation rather than complex partial updates

#### Step 4
Document the strategy in code comments and integration notes.

### Commands

Example:
```/dev/null/commands.txt#L1-3
cd be
dotnet build
dotnet run --project src/Syncra.Api
```

### Code Example

```/dev/null/AnalyticsCacheOptions.cs#L1-11
public sealed class AnalyticsCacheOptions
{
    public int OverviewSeconds { get; set; } = 300;
    public int PlatformsSeconds { get; set; } = 300;
    public int HeatmapSeconds { get; set; } = 600;
    public int TrendsSeconds { get; set; } = 900;
}
```

### Verification

- Confirm cache entries expire after configured TTL
- Confirm refreshed analytics jobs invalidate or replace stale keys
- Confirm dashboard does not continue serving stale values indefinitely

---

## Task: Enforce workspace scoping, authorization, audit logging, and structured error handling

### Purpose
Day 6 endpoints touch potentially sensitive data such as support tickets, analytics, and notifications. The system must enforce strict workspace scoping and consistent failure behavior.

### Implementation Steps

#### Step 1
Ensure all queries and commands receive workspace id from authenticated context, not from untrusted client input alone.

#### Step 2
Apply authorization consistently:
- analytics only for authorized workspace members
- support tickets only for same-workspace users
- trends endpoint behavior documented if global rather than workspace-specific

#### Step 3
Write audit logs for:
- support ticket creation
- major operational analytics refresh actions if exposed via API
- notification processing failures if they affect supportability

#### Step 4
Use standardized error envelopes for:
- validation failures
- unauthorized access
- not found
- conflict
- unexpected failure

#### Step 5
Add structured logs with:
- workspace id
- endpoint name
- correlation id
- entity id when available

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-14
src
├── Syncra.Api
│   ├── Middleware
│   │   ├── WorkspaceContextMiddleware.cs
│   │   ├── ExceptionHandlingMiddleware.cs
│   │   └── CorrelationIdMiddleware.cs
│   └── Endpoints
│       ├── AnalyticsEndpoints.cs
│       ├── TrendEndpoints.cs
│       └── SupportEndpoints.cs
└── Syncra.Application
    └── Common
        └── Security
            └── IWorkspaceContext.cs
```

### Code Example

```/dev/null/ExceptionHandlingMiddleware.cs#L1-28
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = "validation_failed", details = ex.Errors });
        }
    }
}
```

### Verification

- Request cross-workspace ticket and confirm rejection
- Request analytics with unauthorized credentials and confirm rejection
- Confirm errors are returned in consistent envelope format
- Confirm audit and structured logs include workspace/correlation context

---

## Task: Update OpenAPI/Swagger documentation and backend integration notes

### Purpose
Swagger and integration notes ensure frontend, QA, and future backend developers can consume the new APIs without reverse engineering the implementation.

### Implementation Steps

#### Step 1
Document all new endpoints:
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/platforms`
- `GET /api/v1/analytics/heatmap`
- `GET /api/v1/trends`
- `GET /api/v1/trends/hashtags`
- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`
- `GET /api/v1/support/tickets/{id}`

#### Step 2
Add request and response examples.

#### Step 3
Document filter defaults, cache behavior, workspace scoping, and any seeded/mock data assumptions.

#### Step 4
Add backend notes describing:
- analytics data source assumptions
- trend ingestion assumptions
- support ticket lifecycle
- notification event dependencies
- cache TTL and invalidation policy

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Api
# open /swagger
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-8
docs
└── integrations
    ├── analytics-api-notes.md
    ├── trends-api-notes.md
    ├── support-api-notes.md
    └── caching-strategy.md
```

### Code Example

```/dev/null/Program.cs#L1-22
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Syncra API",
        Version = "v1",
        Description = "Analytics, trends, notifications, and support endpoints"
    });
});
```

### Verification

- Start API and open Swagger UI
- Confirm all Day 6 endpoints appear
- Confirm request and response schemas are accurate
- Confirm backend integration notes exist in the repository

---

## Task: Infrastructure baseline for PostgreSQL, Redis, and RabbitMQ

### Purpose
Day 6 depends on PostgreSQL for persistence, Redis for caching, and RabbitMQ for notification/event-driven consumers. All three infrastructure components must be available locally for realistic verification.

### Implementation Steps

#### Step 1
Create or reuse a Docker Compose file containing:
- PostgreSQL
- Redis
- RabbitMQ with management UI

#### Step 2
Map connection strings into API and worker configuration.

#### Step 3
Verify each dependency independently before running the app:
- connect to PostgreSQL
- perform Redis set/get
- publish a RabbitMQ smoke-test message

#### Step 4
Use the same services for local API and worker execution.

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
```/dev/null/commands.txt#L1-5
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
SET day6:analytics ready
GET day6:analytics
```

Basic RabbitMQ test publisher:
```/dev/null/RabbitMqSmokeTest.cs#L1-24
var factory = new ConnectionFactory
{
    Uri = new Uri("amqp://syncra:syncra@localhost:5672")
};

using IConnection connection = factory.CreateConnection();
using IModel channel = connection.CreateModel();

channel.QueueDeclare("notification-events", durable: true, exclusive: false, autoDelete: false);

byte[] body = Encoding.UTF8.GetBytes("{\"message\":\"hello-day6\"}");

channel.BasicPublish(
    exchange: "",
    routingKey: "notification-events",
    basicProperties: null,
    body: body);
```

### Verification

- Confirm PostgreSQL accepts connections and migrations run
- Confirm Redis set/get works
- Confirm RabbitMQ management UI opens at `http://localhost:15672`
- Confirm a test message can be published to a queue

---

## Task: ASP.NET Core setup for analytics, trends, notifications, and support

### Purpose
The API and worker runtime must register the services needed for analytics queries, support commands, caching, event consumers, Swagger, and health checks.

### Implementation Steps

#### Step 1
Register:
- DbContext
- application handlers
- analytics query services
- support ticket services
- Redis cache services
- RabbitMQ event/consumer services
- audit logging services
- health checks

#### Step 2
Enable Swagger in development.

#### Step 3
Register authentication, authorization, workspace context, and exception handling middleware.

#### Step 4
Map analytics, trends, and support endpoints.

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

```/dev/null/Program.cs#L1-69
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<IAnalyticsCacheService, AnalyticsCacheService>();
builder.Services.AddScoped<ISupportTicketNumberGenerator, SupportTicketNumberGenerator>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization();

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(GetAnalyticsOverviewQuery).Assembly);
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Postgres")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!)
    .AddRabbitMQ(rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMq"));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");

app.MapAnalyticsEndpoints();
app.MapTrendEndpoints();
app.MapSupportEndpoints();

app.Run();
```

### Verification

- Start API successfully
- Open Swagger UI
- Confirm analytics, trends, and support endpoints are mapped
- Confirm DI resolves cache and support services
- Confirm middleware order is correct

---

## Task: Add health checks for readiness and liveness

### Purpose
Health checks allow developers, operators, and deployment systems to verify whether the application is alive and whether required dependencies are reachable.

### Implementation Steps

#### Step 1
Install health check packages for:
- PostgreSQL
- Redis
- RabbitMQ

#### Step 2
Register dependency checks with tags such as `ready`.

#### Step 3
Expose:
- `/health`
- `/health/ready`
- `/health/live`

#### Step 4
Keep liveness independent from downstream dependencies so the process can still report as alive while readiness fails.

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

```/dev/null/Program.cs#L1-45
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

- `/health/live` returns healthy while the app process is running
- `/health/ready` returns unhealthy if PostgreSQL, Redis, or RabbitMQ is unavailable
- `/health` returns aggregate status
- Stop Redis or RabbitMQ and confirm readiness reflects failure

---

Deliverables:
- analytics overview endpoint with stable dashboard response contract
- platform breakdown and heatmap analytics endpoints
- trend topics and hashtag endpoints
- support ticket module with create, list, and detail flows
- notification consumer hooks for key product events
- Redis-backed dashboard caching strategy implemented
- updated API documentation for analytics, trends, notifications, and support modules

Dependencies:
- Day 5 social integration and publish pipeline scaffolding completed
- Redis available and stable for caching
- auth, workspace context, audit logging, and standardized API envelopes already in place
- agreed frontend expectations for dashboard analytics and support workflows
- event publishing patterns available for notification consumption

Blocker Check:
- verify analytics response contracts are stable enough for frontend binding without another major redesign
- verify cached responses have clear TTLs and do not hide recently updated critical data for too long
- verify support ticket fields are sufficient for triage without overbuilding internal support tooling
- verify notification consumers are idempotent and safe against duplicate event delivery
- verify workspace filters are applied consistently across analytics, trend, and support queries
- verify there is a clear fallback plan if real analytics data sources are incomplete and seeded or computed data must be used temporarily

Test Criteria:
- `GET /api/v1/analytics/overview` returns valid workspace-scoped summary data
- `GET /api/v1/analytics/platforms` returns correct platform-level aggregations and filters properly
- `GET /api/v1/analytics/heatmap` returns consistent time-bucketed data for the requested range
- `GET /api/v1/trends` and `GET /api/v1/trends/hashtags` return stable normalized payloads
- `POST /api/v1/support/tickets` creates a ticket with valid default status and generated ticket identifier
- `GET /api/v1/support/tickets` and `GET /api/v1/support/tickets/{id}` return only authorized workspace data
- notification consumer successfully processes at least one core event path and avoids duplicate side effects
- Redis cache stores and serves analytics responses correctly and expires them according to the defined strategy
- audit logs are written for support ticket creation and important operational actions
- unauthorized or cross-workspace requests are rejected correctly

End-of-Day Checklist:
- [ ] analytics tables created
- [ ] analytics overview endpoint implemented
- [ ] platform breakdown endpoint implemented
- [ ] heatmap endpoint implemented
- [ ] trend topics endpoint implemented
- [ ] hashtag trends endpoint implemented
- [ ] support ticket tables created
- [ ] support ticket create/list/detail endpoints implemented
- [ ] support ticket number generation implemented
- [ ] notification consumer hooks added
- [ ] Redis caching enabled for dashboard-heavy endpoints
- [ ] cache TTL and invalidation strategy documented
- [ ] workspace scoping validated
- [ ] audit logging added for support flows
- [ ] health endpoints `/health`, `/health/ready`, and `/health/live` working
- [ ] Swagger/OpenAPI updated
- [ ] backend integration notes updated