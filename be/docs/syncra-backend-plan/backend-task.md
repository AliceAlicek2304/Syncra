# Syncra Backend Development Plan

**Owner:** Backend Team Lead / Backend Architect  
**Last Updated:** 2026-03-10  
**Sprint Duration:** 7 Days  
**Total Sprints:** 4  

---

## 1. Project Overview

### 1.1 Product Summary

Based on the frontend analysis, **Syncra** is an AI-assisted social content operations platform for solo creators, small teams, and power users. The current frontend demonstrates a production-like workflow with mock data and local state, but the intended product clearly requires a real backend to support:

- account and subscription management
- creator profile and brand voice settings
- linked social platform connections
- AI-assisted content ideation
- idea board / content pipeline management
- post drafting, scheduling, and publishing
- content repurposing across channels
- trend intelligence
- analytics aggregation and recommendations
- support ticketing / help workflows
- team collaboration and future approval flows

### 1.2 Core Product Capabilities Inferred from Frontend

The frontend reveals these major product capabilities:

1. **Authentication and workspace access**
   - Mock login/logout and protected routes
   - User profile with plan tier and email
   - Plan-aware product messaging

2. **Dashboard**
   - Reach, engagement, connected platforms, scheduled posts
   - Recent posts with status tracking
   - AI-generated recommendations

3. **Ideas management**
   - AI-generated ideas
   - Kanban-style idea workflow
   - Grouping, moving, editing, deleting ideas
   - Trend-driven idea generation

4. **Content creation and scheduling**
   - Multi-platform post composition
   - Platform-specific captions
   - Media upload and ordering
   - Save draft / schedule post / edit scheduled post
   - Calendar-based creation and drag-drop rescheduling

5. **Repurpose engine**
   - Transform long-form input into platform-specific assets
   - Generate multiple atomized content outputs
   - Optional extraction of insights / tips / quotes

6. **Analytics**
   - Reach, engagement, follower growth, posts by platform
   - Best time to post
   - AI insights based on performance

7. **Trend Radar**
   - Trending topics, categories, volume, sentiment
   - Popular hashtags
   - Trigger content generation from trends

8. **Settings**
   - Brand voice profile
   - Linked social accounts
   - Future billing / settings expansion

9. **Help Center**
   - FAQ / docs
   - Issue reporting
   - Support workflows
   - Future export/reporting/billing support

### 1.3 Backend Responsibilities

The backend must be responsible for:

- secure authentication and authorization
- user/workspace/team management
- persistent storage for ideas, posts, media, settings, and analytics snapshots
- orchestration of AI features
- social platform integration lifecycle
- scheduling and publishing workflows
- analytics ingestion and aggregation
- trend ingestion and recommendation generation
- notification and support workflows
- auditability, idempotency, retries, and observability
- enforcing plan limits and subscription entitlements

---

## 2. Recommended Backend Architecture

### 2.1 Recommended Technology Stack

Because the backend project already appears to be .NET-based, the recommended architecture should align with that direction.

#### Backend Framework
- **ASP.NET Core 8 Web API**
- Use **Minimal APIs** only for simple infrastructure endpoints
- Use **feature-based modular architecture** for business modules
- Use **MediatR-style CQRS** patterns where appropriate

#### API Architecture
- **REST API** as the primary public contract
- Optional internal async/event contracts for background processing
- GraphQL is not necessary for MVP because frontend workflows are CRUD-heavy and page-oriented

#### Database
- **PostgreSQL**
- Strong fit for relational workflows:
  - users
  - workspaces
  - ideas
  - posts
  - schedules
  - connected accounts
  - analytics snapshots
  - support tickets
  - subscriptions

#### Cache
- **Redis**
- For:
  - session/token metadata
  - idempotency key caching
  - API throttling counters
  - short-lived AI result caching
  - dashboard/analytics cache

#### Message Queue
- **RabbitMQ**
- Needed for:
  - post scheduling jobs
  - notification fan-out
  - analytics ingestion
  - trend refresh
  - AI task orchestration
  - webhook/event buffering

#### Background Job System
- **Hangfire** or **Quartz.NET**
- Recommended:
  - **Hangfire** for operational simplicity in 7-day delivery
- Use with PostgreSQL storage or Redis-backed queueing
- RabbitMQ remains the event backbone; Hangfire handles job orchestration and retries

#### Authentication Strategy
- **JWT Bearer Authentication**
- Support:
  - email/password
  - OAuth/social sign-in later
- Use:
  - short-lived access token
  - refresh token rotation
  - device/session tracking
- If external auth is preferred, **Auth0**, **Clerk**, or **AWS Cognito** are acceptable, but for speed and control in MVP, a native auth module is reasonable

#### File Storage
- **S3-compatible object storage**
- AWS S3, Cloudflare R2, or MinIO for dev/local
- Store:
  - uploaded media
  - thumbnails
  - AI reference files
  - exports/reports

#### AI Integration
- AI gateway module wrapping:
  - LLM provider for idea generation and repurposing
  - optional trend summarization provider
- Persist prompts/results metadata for traceability and billing control

#### Deployment Strategy
- **Dockerized services**
- **.NET Aspire** for local orchestration and service discovery
- Environment targets:
  - local: Aspire + Docker Compose
  - staging: container platform
  - production: Azure Container Apps / AWS ECS / Kubernetes
- MVP recommendation:
  - single deployable API + worker in separate containers
  - PostgreSQL, Redis, RabbitMQ managed if possible

---

## 3. Backend Project Structure

Recommended structure:

```Syncra/be/syncra-backend-plan/backend-task.md#L1-40
backend
├── src
│   ├── api
│   ├── modules
│   ├── application
│   ├── domain
│   ├── infrastructure
│   ├── sharedNếu
│   ├── workers
│   └── contracts
├── migrations
├── tests
├── docs
└── deploy
```

### Folder Purposes

#### `src/api`
- HTTP entrypoint
- route registration
- middleware
- auth configuration
- OpenAPI/Swagger
- API versioning
- request/response DTOs

#### `src/modules`
Feature-based business slices, for example:
- `auth`
- `users`
- `workspaces`
- `ideas`
- `posts`
- `calendar`
- `repurpose`
- `analytics`
- `trends`
- `integrations`
- `notifications`
- `support`
- `billing`

Each module contains:
- commands/queries
- validators
- handlers
- endpoints
- repositories/contracts

#### `src/application`
- use cases
- orchestration services
- CQRS abstractions
- domain service coordination
- transaction boundaries

#### `src/domain`
- entities
- value objects
- enums
- domain events
- business rules
- aggregate roots

#### `src/infrastructure`
- EF Core/PostgreSQL persistence
- message broker adapters
- Redis cache adapters
- S3 storage adapter
- external AI provider clients
- social platform clients
- email provider
- webhook handlers

#### `src/shared`
- common exceptions
- middleware
- result types
- logging helpers
- pagination
- idempotency support
- tenant context
- auditing helpers
- constants

#### `src/workers`
- scheduled publishing worker
- analytics refresh worker
- notification worker
- trend sync worker
- AI background processor

#### `src/contracts`
- event schemas
- integration DTOs
- shared API contracts
- webhook payload contracts

#### `migrations`
- SQL or EF migrations
- seed/reference data
- migration notes

#### `tests`
- unit tests
- integration tests
- contract tests
- load/performance tests

#### `docs`
- architecture records
- API standards
- event catalog
- onboarding docs

#### `deploy`
- Dockerfiles
- compose files
- CI/CD manifests
- environment templates

---

## 4. Core Backend Modules

## 4.1 Auth Module

### Responsibilities
- user registration/login/logout
- token issue/refresh/revoke
- password reset
- email verification
- session management
- role and permission resolution

### Key Entities
- `users`
- `user_sessions`
- `refresh_tokens`
- `password_reset_tokens`
- `email_verification_tokens`

### Core APIs
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`

---

## 4.2 User / Profile Module

### Responsibilities
- manage personal profile
- manage creator settings
- plan visibility
- onboarding state
- avatar/profile metadata

### Key Entities
- `users`
- `user_profiles`
- `user_preferences`

### Core APIs
- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`
- `PUT /api/v1/users/me/preferences`
- `GET /api/v1/users/me/usage`

---

## 4.3 Workspace / Team Module

Frontend messaging references solo creators, small teams, and up to 10 team members on higher plans, so backend should support workspaces from the start.

### Responsibilities
- workspace creation
- membership
- roles
- invitations
- plan-scoped limits
- future approval flows

### Key Entities
- `workspaces`
- `workspace_members`
- `workspace_invitations`
- `roles`
- `permissions`

### Core APIs
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/current`
- `GET /api/v1/workspaces/current/members`
- `POST /api/v1/workspaces/current/invitations`
- `POST /api/v1/workspaces/current/invitations/{id}/accept`
- `PUT /api/v1/workspaces/current/members/{memberId}/role`
- `DELETE /api/v1/workspaces/current/members/{memberId}`

---

## 4.4 Subscription / Billing Module

The frontend includes pricing tiers, billing language, free plan limits, and cancellation messaging.

### Responsibilities
- plan catalog
- subscriptions
- billing cycle management
- quota enforcement
- entitlement checks
- payment webhook reconciliation

### Key Entities
- `plans`
- `subscriptions`
- `subscription_items`
- `billing_customers`
- `billing_invoices`
- `usage_counters`

### Core APIs
- `GET /api/v1/billing/plans`
- `GET /api/v1/billing/subscription`
- `POST /api/v1/billing/subscription/checkout`
- `POST /api/v1/billing/subscription/cancel`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/usage`

---

## 4.5 Brand Voice / Settings Module

### Responsibilities
- persist brand tone profile
- future brand kits
- writing style settings
- AI personalization inputs

### Key Entities
- `brand_profiles`
- `brand_voice_vectors`
- `brand_assets`

### Core APIs
- `GET /api/v1/settings/brand-voice`
- `PUT /api/v1/settings/brand-voice`
- `GET /api/v1/settings/brand-assets`
- `POST /api/v1/settings/brand-assets`

---

## 4.6 Social Integration Module

Settings page shows linked account states; help content implies direct publishing is coming soon.

### Responsibilities
- connect/disconnect social platforms
- OAuth token lifecycle
- account metadata sync
- publishing permissions
- webhook/event receipt

### Key Entities
- `social_accounts`
- `social_account_tokens`
- `social_account_scopes`
- `social_webhook_events`

### Supported Platforms for MVP
- LinkedIn
- X
- Instagram
- Facebook
- TikTok
- YouTube

### Core APIs
- `GET /api/v1/integrations/social-accounts`
- `POST /api/v1/integrations/{provider}/connect`
- `POST /api/v1/integrations/{provider}/callback`
- `DELETE /api/v1/integrations/social-accounts/{id}`
- `POST /api/v1/integrations/social-accounts/{id}/refresh`

---

## 4.7 Idea Module

The Ideas page shows:
- AI-generated ideas
- board groups
- status movement
- edit/delete
- bulk add from AI generator

### Responsibilities
- idea CRUD
- kanban grouping
- status transitions
- AI-generated idea persistence
- tagging/filtering later

### Key Entities
- `idea_groups`
- `ideas`
- `idea_sources`
- `idea_tags`

### Core APIs
- `GET /api/v1/ideas`
- `POST /api/v1/ideas`
- `PUT /api/v1/ideas/{id}`
- `DELETE /api/v1/ideas/{id}`
- `POST /api/v1/ideas/{id}/move`
- `GET /api/v1/idea-groups`
- `POST /api/v1/idea-groups`
- `PUT /api/v1/idea-groups/{id}`
- `DELETE /api/v1/idea-groups/{id}`

---

## 4.8 AI Idea Generation Module

### Responsibilities
- generate content ideas from prompt, tone, niche, audience, goal
- accept optional reference files
- return multi-platform ideas
- persist generation history
- track token usage and latency

### Key Entities
- `ai_requests`
- `ai_generations`
- `ai_generation_items`
- `ai_reference_files`

### Core APIs
- `POST /api/v1/ai/ideas/generate`
- `GET /api/v1/ai/ideas/history`
- `GET /api/v1/ai/ideas/history/{id}`

---

## 4.9 Trend Radar Module

### Responsibilities
- ingest trend signals
- store topics, hashtag trends, categories, sentiment
- personalize trends by niche/workspace
- trigger content generation from trends

### Key Entities
- `trend_topics`
- `trend_hashtags`
- `trend_snapshots`
- `user_trend_preferences`

### Core APIs
- `GET /api/v1/trends`
- `GET /api/v1/trends/hashtags`
- `GET /api/v1/trends/preferences`
- `PUT /api/v1/trends/preferences`
- `POST /api/v1/trends/{trendId}/generate-ideas`

---

## 4.10 Post Composer / Content Module

The create-post flow implies platform-specific caption management, hashtags, media, draft/schedule state, and edit flows.

### Responsibilities
- store content drafts
- support multi-platform variants
- attach media
- validate platform constraints
- transform captions per platform
- publish/schedule metadata

### Key Entities
- `posts`
- `post_variants`
- `post_media`
- `post_hashtags`
- `post_status_history`

### Core APIs
- `POST /api/v1/posts`
- `GET /api/v1/posts`
- `GET /api/v1/posts/{id}`
- `PUT /api/v1/posts/{id}`
- `DELETE /api/v1/posts/{id}`
- `POST /api/v1/posts/{id}/duplicate`
- `POST /api/v1/posts/{id}/submit-for-approval` (future-ready)

---

## 4.11 Calendar / Scheduling Module

The calendar page implies:
- month/week/day views
- scheduled/published/draft status
- drag-drop rescheduling
- create from date cell
- edit scheduled content

### Responsibilities
- scheduling engine
- rescheduling
- publish time normalization
- timezone handling
- future recurring scheduling

### Key Entities
- `post_schedules`
- `publishing_jobs`
- `calendar_views` (optional saved filters)
- `timezone_preferences`

### Core APIs
- `GET /api/v1/calendar/posts`
- `POST /api/v1/calendar/posts`
- `PUT /api/v1/calendar/posts/{id}/schedule`
- `PUT /api/v1/calendar/posts/{id}/reschedule`
- `POST /api/v1/calendar/posts/{id}/publish-now`
- `GET /api/v1/calendar/overview`

---

## 4.12 Publishing Module

Help page states direct publishing is coming soon. Backend should isolate it as a module.

### Responsibilities
- dispatch scheduled posts to platform connectors
- record platform publish outcomes
- retries/failures
- webhook-driven status updates

### Key Entities
- `publish_attempts`
- `publish_results`
- `external_post_refs`

### Core APIs
- `POST /api/v1/publishing/posts/{id}/publish-now`
- `GET /api/v1/publishing/posts/{id}/attempts`

---

## 4.13 Repurpose Module

### Responsibilities
- accept long-form source text
- generate multiple output atoms per platform
- support tone selection
- support atom-only extraction
- persist generation history

### Key Entities
- `repurpose_jobs`
- `repurpose_results`
- `repurpose_atoms`

### Core APIs
- `POST /api/v1/repurpose/generate`
- `GET /api/v1/repurpose/history`
- `GET /api/v1/repurpose/history/{id}`

---

## 4.14 Analytics Module

Frontend analytics implies:
- overview metrics
- platform breakdown
- weekly trends
- best time to post
- AI insights

### Responsibilities
- ingest social performance data
- aggregate by workspace/user/platform/date
- compute dashboard KPIs
- generate insights and heatmaps
- provide cached snapshots

### Key Entities
- `analytics_snapshots`
- `analytics_metrics`
- `platform_metrics`
- `post_metrics`
- `heatmap_metrics`
- `insight_cards`

### Core APIs
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/platforms`
- `GET /api/v1/analytics/heatmap`
- `GET /api/v1/analytics/insights`
- `GET /api/v1/analytics/posts/{id}`

---

## 4.15 Notification Module

### Responsibilities
- in-app notifications
- email notifications
- job result notifications
- publish failure alerts
- support ticket updates

### Key Entities
- `notifications`
- `notification_templates`
- `notification_deliveries`

### Core APIs
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/preferences`

---

## 4.16 Support Module

The help page includes issue reporting and ticket IDs.

### Responsibilities
- support ticket intake
- categorization and severity
- status tracking
- internal assignment hooks
- user communication history

### Key Entities
- `support_tickets`
- `support_ticket_comments`
- `support_ticket_attachments`
- `support_ticket_events`

### Core APIs
- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`
- `GET /api/v1/support/tickets/{id}`
- `POST /api/v1/support/tickets/{id}/comments`

---

## 4.17 Audit Log Module

### Responsibilities
- audit sensitive actions
- actor tracking
- before/after metadata
- compliance and debugging support

### Key Entities
- `audit_logs`

### Core APIs
- `GET /api/v1/audit-logs`
- internal-only query endpoints for admins/support

---

## 5. Database Design Rules

## 5.1 Mandatory Columns

Every non-reference table **MUST** contain:

- `id UUID PRIMARY KEY`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`
- `version INTEGER NOT NULL DEFAULT 1`

Additionally, most business tables **SHOULD** contain:

- `created_by UUID NULL`
- `updated_by UUID NULL`
- `workspace_id UUID NOT NULL`
- `tenant_id UUID NULL` for future multi-tenant expansion
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`

### Notes
- `deleted_at IS NULL` means active record
- `version` is required for optimistic locking
- use server-side defaults for timestamps where possible

## 5.2 Naming Conventions

- tables: `snake_case`, plural preferred
- columns: `snake_case`
- foreign keys: `{referenced_table_singular}_id`
- indexes: `ix_{table}_{column(s)}`
- unique constraints: `uq_{table}_{column(s)}`
- foreign keys: `fk_{table}_{referenced_table}_{column}`

## 5.3 Foreign Key Rules

- all relational references must use FK constraints
- use `ON DELETE RESTRICT` for critical business data
- use `ON DELETE CASCADE` only for safe child tables like join tables or ephemeral mappings
- never hard-delete parent rows if downstream business audit needs exist

## 5.4 Indexing Rules

Every table must have:
- PK index on `id`
- index on `workspace_id` if workspace-scoped
- index on `created_at`

Add indexes for:
- FKs
- status fields used in filtering
- date/time query fields
- unique identifiers from integrations
- idempotency keys
- lookup fields such as `email`, `provider`, `external_account_id`

Composite index examples:
- `(workspace_id, status, created_at desc)`
- `(workspace_id, scheduled_for)`
- `(workspace_id, platform, published_at)`
- `(provider, external_account_id)`

## 5.5 Soft Delete Policy

- use `deleted_at` for soft delete
- no physical delete for:
  - users
  - posts
  - ideas
  - subscriptions
  - support tickets
  - analytics snapshots
- hard delete allowed only for:
  - expired tokens
  - temporary caches
  - failed transient staging rows
  - non-auditable temp artifacts

## 5.6 Audit Logging Rules

Audit all:
- auth events
- subscription changes
- role changes
- post creation/edit/schedule/publish
- social account connect/disconnect
- support ticket status changes
- AI generation requests if billable
- destructive actions

Audit log payload should include:
- actor_id
- workspace_id
- action
- entity_type
- entity_id
- request_id
- ip_address
- user_agent
- old_values JSONB
- new_values JSONB
- occurred_at

## 5.7 Idempotency Rules

The following operations require idempotency keys:
- subscription checkout initiation
- publish-now actions
- scheduled job dispatch
- social webhook ingestion
- AI billable generation
- support ticket creation from unstable clients if retried

Store:
- `idempotency_key`
- `request_hash`
- `response_snapshot`
- `status`
- `expires_at`

## 5.8 Multi-Tenant / Workspace Support

Even if MVP is single-workspace-per-user, database should be workspace-scoped now.

Rules:
- every business entity belongs to `workspace_id`
- all queries must filter by authorized workspace
- cross-workspace access must be denied by application and repository layer
- unique constraints should often be scoped by workspace

## 5.9 Timezone Rules

- store all datetimes in UTC
- keep user/workspace timezone preference separately
- convert for display only at API response layer when needed
- scheduling must normalize `scheduled_for_utc`

## 5.10 JSONB Usage Rules

Use JSONB only for:
- provider payload snapshots
- prompt metadata
- analytics provider raw payloads
- flexible metadata

Do **not** use JSONB instead of proper normalized relationships for:
- posts
- users
- ideas
- subscriptions
- memberships

---

## 6. Important API Endpoints

## 6.1 Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## 6.2 Users / Profile

- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`
- `PUT /api/v1/users/me/preferences`
- `GET /api/v1/users/me/usage`

## 6.3 Workspaces / Team

- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/current`
- `GET /api/v1/workspaces/current/members`
- `POST /api/v1/workspaces/current/invitations`
- `PUT /api/v1/workspaces/current/members/{memberId}/role`

## 6.4 Billing

- `GET /api/v1/billing/plans`
- `GET /api/v1/billing/subscription`
- `POST /api/v1/billing/subscription/checkout`
- `POST /api/v1/billing/subscription/cancel`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/usage`

## 6.5 Social Integrations

- `GET /api/v1/integrations/social-accounts`
- `POST /api/v1/integrations/{provider}/connect`
- `GET /api/v1/integrations/{provider}/callback`
- `DELETE /api/v1/integrations/social-accounts/{id}`

## 6.6 Ideas

- `GET /api/v1/ideas`
- `POST /api/v1/ideas`
- `PUT /api/v1/ideas/{id}`
- `DELETE /api/v1/ideas/{id}`
- `POST /api/v1/ideas/{id}/move`
- `GET /api/v1/idea-groups`
- `POST /api/v1/idea-groups`
- `PUT /api/v1/idea-groups/{id}`
- `DELETE /api/v1/idea-groups/{id}`

## 6.7 AI

- `POST /api/v1/ai/ideas/generate`
- `POST /api/v1/repurpose/generate`
- `GET /api/v1/ai/history`
- `GET /api/v1/ai/history/{id}`

## 6.8 Trends

- `GET /api/v1/trends`
- `GET /api/v1/trends/hashtags`
- `PUT /api/v1/trends/preferences`
- `POST /api/v1/trends/{trendId}/generate-ideas`

## 6.9 Posts / Composer

- `GET /api/v1/posts`
- `POST /api/v1/posts`
- `GET /api/v1/posts/{id}`
- `PUT /api/v1/posts/{id}`
- `DELETE /api/v1/posts/{id}`
- `POST /api/v1/posts/{id}/duplicate`

## 6.10 Calendar / Scheduling

- `GET /api/v1/calendar/posts`
- `POST /api/v1/calendar/posts`
- `PUT /api/v1/calendar/posts/{id}/schedule`
- `PUT /api/v1/calendar/posts/{id}/reschedule`
- `POST /api/v1/calendar/posts/{id}/publish-now`
- `GET /api/v1/calendar/overview`

## 6.11 Analytics

- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/platforms`
- `GET /api/v1/analytics/heatmap`
- `GET /api/v1/analytics/insights`

## 6.12 Notifications

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{id}/read`
- `PUT /api/v1/notifications/preferences`

## 6.13 Support

- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`
- `GET /api/v1/support/tickets/{id}`
- `POST /api/v1/support/tickets/{id}/comments`

---

## 7. Event-Driven Architecture

Event-driven processing is recommended for non-blocking workflows, especially scheduling, analytics, notifications, integrations, and AI orchestration.

## 7.1 Event Types

### Auth / User Events
- `UserRegistered`
- `UserVerified`
- `UserLoggedIn`
- `UserProfileUpdated`

### Workspace / Billing Events
- `WorkspaceCreated`
- `WorkspaceMemberInvited`
- `WorkspaceMemberJoined`
- `SubscriptionCreated`
- `SubscriptionUpgraded`
- `SubscriptionCancelled`
- `UsageLimitExceeded`

### Ideas / AI Events
- `IdeaCreated`
- `IdeaMoved`
- `AIIdeaGenerationRequested`
- `AIIdeaGenerationCompleted`
- `RepurposeGenerationRequested`
- `RepurposeGenerationCompleted`

### Post / Scheduling Events
- `PostCreated`
- `PostUpdated`
- `PostDraftSaved`
- `PostScheduled`
- `PostRescheduled`
- `PostPublishRequested`
- `PostPublished`
- `PostPublishFailed`

### Integration / Analytics Events
- `SocialAccountConnected`
- `SocialAccountDisconnected`
- `SocialMetricsIngested`
- `AnalyticsSnapshotGenerated`
- `TrendSnapshotRefreshed`

### Support / Notification Events
- `NotificationRequested`
- `SupportTicketCreated`
- `SupportTicketUpdated`

## 7.2 Publisher / Consumer Map

| Event | Publisher | Consumer |
|---|---|---|
| `UserRegistered` | Auth Module | Notification, Billing, Audit |
| `WorkspaceCreated` | Workspace Module | Billing, Audit |
| `AIIdeaGenerationRequested` | AI API | AI Worker |
| `AIIdeaGenerationCompleted` | AI Worker | Idea Module, Notification |
| `RepurposeGenerationRequested` | Repurpose API | AI Worker |
| `PostScheduled` | Calendar Module | Scheduler Worker, Notification |
| `PostPublishRequested` | Scheduler Worker / API | Publishing Worker |
| `PostPublished` | Publishing Worker | Analytics, Notification, Audit |
| `PostPublishFailed` | Publishing Worker | Notification, Retry Worker, Audit |
| `SocialMetricsIngested` | Integration Worker | Analytics Aggregator |
| `TrendSnapshotRefreshed` | Trend Worker | Recommendation Engine |

## 7.3 Retry Policy

- max immediate retries: `3`
- retry intervals:
  - attempt 1: `30s`
  - attempt 2: `2m`
  - attempt 3: `10m`
- after failures exceed threshold:
  - route to dead-letter queue
  - create alert
  - mark source entity with recoverable error state

## 7.4 Idempotency Rules for Events

Every event consumer must:
- persist processed event ID
- reject duplicate delivery
- ensure side effects are safe on replay
- use deterministic entity lookup for external references

Event envelope should include:
- `event_id`
- `event_type`
- `occurred_at`
- `correlation_id`
- `causation_id`
- `workspace_id`
- `version`
- `payload`

---

## 8. Background Jobs

Required background jobs for MVP and near-MVP readiness:

### 8.1 Scheduling Jobs
- enqueue scheduled posts for publishing
- detect due posts
- transition status from `scheduled` to `publishing`

### 8.2 Publishing Jobs
- publish content to social providers
- retry transient failures
- persist provider response and external post ID

### 8.3 Analytics Jobs
- sync social metrics periodically
- aggregate dashboard metrics
- build heatmap metrics
- compute AI insight suggestions

### 8.4 Trend Jobs
- refresh trend topics and hashtags
- classify sentiment/category
- update niche-specific recommendations

### 8.5 AI Jobs
- async idea generation
- async repurpose generation
- post-process outputs into normalized result sets

### 8.6 Notification Jobs
- send welcome emails
- send publish success/failure alerts
- send support ticket confirmations
- send billing notices

### 8.7 Maintenance Jobs
- clean expired sessions and refresh tokens
- archive stale webhook payloads
- compact audit partitions if applicable
- remove expired idempotency records

---

## 9. Retry and Idempotency Policies

## 9.1 Retry Rules

Use exponential backoff for:
- social API calls
- AI provider calls
- payment webhooks
- queue consumers
- email delivery

Recommended backoff:
- `1s`
- `5s`
- `15s`
- `60s`
- `300s`

Retry only for:
- 429
- timeouts
- transient 5xx
- connection resets

Do **not** retry blindly for:
- validation failures
- auth failures without refresh flow
- quota exceeded
- malformed requests

## 9.2 Dead-Letter Policy

Move failed messages/jobs to DLQ after max retries. Each DLQ item must retain:
- original payload
- failure reason
- retry count
- first failure timestamp
- last failure timestamp
- correlation ID

## 9.3 Idempotency Requirements

Use idempotency key headers for mutation endpoints:

- `POST /billing/subscription/checkout`
- `POST /ai/ideas/generate`
- `POST /repurpose/generate`
- `POST /calendar/posts`
- `POST /calendar/posts/{id}/publish-now`
- webhook endpoints

## 9.4 Concurrency Control

Use optimistic concurrency with `version` for:
- posts
- ideas
- brand voice settings
- support tickets
- workspace membership changes

On conflict, return `409 Conflict` with standardized payload.

---

## 10. Testing Strategy

## 10.1 Unit Tests
Cover:
- domain rules
- validators
- mapping logic
- scheduling calculations
- platform caption constraints
- entitlement checks
- retry classification
- idempotency helper behavior

## 10.2 Integration Tests
Cover:
- API + database
- auth middleware
- repository behavior
- migrations
- transaction boundaries
- queue publish/consume flow
- file storage adapter contracts

## 10.3 API Tests
Cover:
- request validation
- status codes
- pagination/filtering
- auth access control
- rate limiting
- error envelopes
- version headers

## 10.4 Contract Tests
Cover:
- event schema compatibility
- webhook payload parsing
- provider client adapters
- AI provider response normalization

## 10.5 Load Tests
Cover:
- dashboard endpoints
- analytics overview
- post list/calendar queries
- AI generation throughput
- scheduler throughput at publish bursts

## 10.6 Security Tests
Cover:
- JWT validation
- refresh token rotation
- workspace isolation
- broken object level authorization
- upload validation
- webhook signature validation
- injection and mass assignment risks

## 10.7 Testing Checklist

- [ ] endpoint validation covers bad payloads
- [ ] auth required endpoints reject anonymous access
- [ ] workspace isolation is enforced
- [ ] database constraints reject invalid references
- [ ] optimistic locking conflict tested
- [ ] idempotency replay tested
- [ ] retry and DLQ behavior tested
- [ ] upload limits validated
- [ ] error responses are standardized
- [ ] scheduling timezone conversion tested
- [ ] race conditions tested for publish/reschedule flows

---

## 11. 7-Day Agile Roadmap

## Sprint 1 (Day 1-2) – Architecture & Core Setup

### Day 1 - Backend Foundation
#### Tasks
- finalize backend architecture
- create solution structure
- set up ASP.NET API project conventions
- configure PostgreSQL, Redis, RabbitMQ
- add base middleware:
  - error handling
  - logging
  - correlation ID
  - auth skeleton
- configure Swagger/OpenAPI
- create health endpoints
- define database standards and base entity model

#### Deliverables
- running API skeleton
- environment configuration templates
- shared library scaffolding
- base database connection working

#### Checklist
- [ ] solution structure created
- [ ] configuration per environment works
- [ ] health check endpoint returns success
- [ ] Swagger available
- [ ] database connection verified
- [ ] Redis connection verified
- [ ] RabbitMQ connection verified
- [ ] base entity/audit conventions documented

### Day 2 - Identity, Workspace, and Persistence Base
#### Tasks
- implement auth module skeleton
- implement user/profile module skeleton
- implement workspace module skeleton
- set up JWT auth and refresh token model
- create initial migrations
- seed plans/reference tables
- add audit log infrastructure
- add request idempotency middleware skeleton

#### Deliverables
- auth-ready persistence layer
- first migration package
- secured `/auth/me` and `/users/me` endpoints

#### Checklist
- [ ] migrations apply successfully
- [ ] auth tables created
- [ ] workspace tables created
- [ ] JWT issuing works
- [ ] protected route works
- [ ] audit pipeline stores events
- [ ] seed plans available

---

## Sprint 2 (Day 3-4) – Core Product Services

### Day 3 - Ideas, AI Requests, and Repurpose
#### Tasks
- implement idea groups and idea CRUD
- implement move/delete/edit workflows
- build AI request persistence
- implement AI idea generation endpoint contract
- implement repurpose generation endpoint contract
- add worker stub for AI jobs
- enforce plan-based AI usage counters

#### Deliverables
- functional idea APIs
- AI generation request/response contract
- repurpose persistence model

#### Checklist
- [ ] ideas CRUD works
- [ ] idea groups CRUD works
- [ ] move endpoint works
- [ ] AI request tables created
- [ ] AI generation endpoint returns normalized mock/provider response
- [ ] repurpose endpoint stores history
- [ ] usage counters increment correctly

### Day 4 - Posts, Composer, Calendar, Media
#### Tasks
- implement posts module
- implement post variants and media metadata
- implement draft/save/edit flows
- implement calendar query endpoint
- implement schedule/reschedule endpoints
- add object storage integration
- add upload validation and signed upload/download flow

#### Deliverables
- posts and scheduling APIs
- media upload flow
- calendar-ready query model

#### Checklist
- [ ] post CRUD works
- [ ] draft save works
- [ ] schedule endpoint works
- [ ] reschedule endpoint works
- [ ] calendar query returns grouped data
- [ ] uploads stored in object storage
- [ ] file type/size validation enforced

---

## Sprint 3 (Day 5-6) – Integrations, Analytics, and Operations

### Day 5 - Social Integrations and Publishing Pipeline
#### Tasks
- implement social account model
- implement OAuth connect/disconnect flow skeleton
- implement publish-now command pipeline
- add scheduler worker for due posts
- add publish attempt tracking
- add notification hooks for publish outcomes

#### Deliverables
- integration management APIs
- publish pipeline skeleton
- scheduler worker operational

#### Checklist
- [ ] social account CRUD works
- [ ] OAuth callback flow scaffolded
- [ ] publish-now endpoint works
- [ ] scheduled worker picks due posts
- [ ] publish attempts persisted
- [ ] failure paths emit events

### Day 6 - Analytics, Trends, and Support
#### Tasks
- implement analytics overview endpoints
- create platform metrics and heatmap models
- create trend topics/hashtags endpoints
- implement support ticket create/list/detail APIs
- add notification event consumers
- add dashboard caching strategy

#### Deliverables
- dashboard analytics API
- trend radar API
- support ticket module

#### Checklist
- [ ] analytics overview returns stable response
- [ ] platform breakdown endpoint works
- [ ] heatmap endpoint works
- [ ] trends endpoint works
- [ ] hashtag trends endpoint works
- [ ] support ticket creation works
- [ ] dashboard caching active

---

## Sprint 4 (Day 7) – Hardening, QA, and Deployment

### Day 7 - Hardening and Release Readiness
#### Tasks
- complete integration tests
- finalize retry and DLQ handling
- add rate limiting
- add metrics and tracing
- finalize OpenAPI docs
- add CI pipeline checks
- run load smoke tests
- prepare staging deployment
- review security checklist

#### Deliverables
- release candidate backend
- deployment-ready configuration
- documented API and operational runbook

#### Checklist
- [ ] CI passes
- [ ] migrations run in staging
- [ ] tracing and metrics enabled
- [ ] rate limiting enabled
- [ ] integration tests pass
- [ ] load smoke test completed
- [ ] API docs published
- [ ] deployment guide ready

---

## 12. Daily Execution Checklist

## Day 1 Checklist
- [ ] repo structure finalized
- [ ] API project bootstrapped
- [ ] PostgreSQL wired
- [ ] Redis wired
- [ ] RabbitMQ wired
- [ ] Swagger enabled
- [ ] health checks added
- [ ] logging/correlation middleware added

## Day 2 Checklist
- [ ] auth entities created
- [ ] user profile entities created
- [ ] workspace entities created
- [ ] JWT auth configured
- [ ] refresh token flow scaffolded
- [ ] first migrations applied
- [ ] plan seed data inserted
- [ ] audit log persistence added

## Day 3 Checklist
- [ ] idea entities created
- [ ] idea endpoints implemented
- [ ] AI request entities created
- [ ] AI generate endpoint implemented
- [ ] repurpose endpoint implemented
- [ ] plan usage counters enforced
- [ ] background worker contract added

## Day 4 Checklist
- [ ] post entities created
- [ ] media entities created
- [ ] file storage adapter implemented
- [ ] draft flow implemented
- [ ] schedule flow implemented
- [ ] reschedule flow implemented
- [ ] calendar aggregation endpoint implemented

## Day 5 Checklist
- [ ] social account entities created
- [ ] connect/disconnect endpoints implemented
- [ ] OAuth callback scaffolded
- [ ] publish pipeline implemented
- [ ] scheduler worker runs
- [ ] publish attempt audit stored
- [ ] publish failure notification event emitted

## Day 6 Checklist
- [ ] analytics models created
- [ ] analytics overview endpoint implemented
- [ ] heatmap endpoint implemented
- [ ] trends endpoint implemented
- [ ] support ticket endpoints implemented
- [ ] notification consumer implemented
- [ ] dashboard caching verified

## Day 7 Checklist
- [ ] integration tests passing
- [ ] retries/DLQ configured
- [ ] metrics and tracing exposed
- [ ] rate limiting enabled
- [ ] API docs reviewed
- [ ] staging deploy successful
- [ ] rollback plan documented
- [ ] release sign-off completed

---

## 13. Quality Standards

## 13.1 API Versioning
- all endpoints must be versioned under `/api/v1`
- breaking changes require `/api/v2`
- versioning must be visible in OpenAPI docs

## 13.2 Error Response Format

Use a standard envelope:

```Syncra/be/syncra-backend-plan/backend-task.md#L780-790
{
  "success": false,
  "error": {
    "code": "post_conflict",
    "message": "The post was modified by another request.",
    "details": [],
    "correlationId": "req_123"
  }
}
```

Rules:
- no raw exception messages in production
- all errors must include machine-readable code
- include correlation ID for traceability

## 13.3 Success Response Format

Recommended envelope:

```Syncra/be/syncra-backend-plan/backend-task.md#L795-803
{
  "success": true,
  "data": {},
  "meta": {
    "correlationId": "req_123"
  }
}
```

## 13.4 Logging Format
Use structured JSON logging with:
- timestamp
- level
- service
- environment
- correlation_id
- user_id
- workspace_id
- route
- duration_ms
- exception_type
- message

## 13.5 Observability
Must include:
- OpenTelemetry tracing
- Prometheus metrics
- health checks
- queue depth monitoring
- job failure monitoring
- DB connection pool metrics
- publish success/failure metrics
- AI request latency metrics

## 13.6 Security Standards
- JWT validation on all protected endpoints
- refresh token rotation
- password hashing with strong algorithm
- secrets in environment/secret manager only
- webhook signature verification
- upload MIME and extension validation
- OWASP top 10 review before release
- role-based authorization for workspace/team features

## 13.7 Code Review Requirements
No PR may merge unless:
- [ ] tests pass
- [ ] migration impact reviewed
- [ ] auth/authorization impact reviewed
- [ ] logging added for key mutations
- [ ] error handling is standardized
- [ ] idempotency considered for new mutations
- [ ] retry behavior considered for integrations
- [ ] OpenAPI docs updated
- [ ] backward compatibility reviewed

## 13.8 Commit Conventions
Use conventional commits:
- `feat:`
- `fix:`
- `refactor:`
- `test:`
- `docs:`
- `chore:`

Examples:
- `feat(auth): add refresh token rotation`
- `feat(posts): implement schedule and reschedule endpoints`
- `fix(calendar): normalize utc schedule conversion`

---

## 14. Recommended Initial Database Entity List

This is the practical MVP-first entity list to implement in order:

### Identity / Access
- `users`
- `user_profiles`
- `refresh_tokens`
- `user_sessions`

### Workspace / Billing
- `workspaces`
- `workspace_members`
- `plans`
- `subscriptions`
- `usage_counters`

### Content / Ideas
- `idea_groups`
- `ideas`
- `posts`
- `post_variants`
- `post_media`
- `post_schedules`
- `publish_attempts`

### AI / Repurpose / Trends
- `ai_requests`
- `ai_generations`
- `repurpose_jobs`
- `repurpose_atoms`
- `trend_topics`
- `trend_hashtags`

### Analytics / Support / Ops
- `analytics_snapshots`
- `platform_metrics`
- `heatmap_metrics`
- `notifications`
- `support_tickets`
- `audit_logs`
- `idempotency_records`

---

## 15. Execution Priorities

### Priority 1 - Must Ship in 7 Days
- auth
- users/profile
- workspace base
- ideas
- posts
- calendar scheduling
- media storage
- AI idea generation endpoint
- repurpose endpoint
- analytics overview
- trends overview
- support ticketing
- notifications skeleton
- audit logging
- observability baseline

### Priority 2 - Should Be Scaffolded
- subscription/billing integration
- social account OAuth flow
- publishing pipeline
- scheduler worker
- AI async workers
- retry/DLQ

### Priority 3 - Post-MVP
- direct multi-platform publishing
- approval flows
- team collaboration comments
- white-label reports
- custom integrations
- API access for customers
- export reports
- advanced role matrix

---

## 16. Final Recommendations

1. **Do not build everything as microservices immediately.**  
   For a 7-day delivery target, use a **modular monolith** with clean module boundaries, shared database, and async workers.

2. **Design for event-driven expansion now.**  
   Even if initial deployment is one API + one worker, keep event contracts explicit.

3. **Implement workspace scoping from day one.**  
   The frontend already hints at teams, plans, and usage limits.

4. **Treat AI as a billable, auditable subsystem.**  
   Persist requests, responses, latency, and usage.

5. **Prioritize scheduling, analytics, and content persistence over full social publishing.**  
   The frontend already says direct posting is still evolving, so publishing can be scaffolded while the rest becomes production-ready.

6. **Use strict idempotency and optimistic locking for all mutation-heavy modules.**  
   This will prevent duplicate posts, duplicate jobs, and race conditions in schedule/edit workflows.

7. **Make API contracts stable before deep UI integration.**  
   The frontend is rich enough that backend DTO drift will become expensive quickly.

---

## 17. Definition of Done

A backend task is considered complete only when:

- [ ] business logic is implemented
- [ ] database changes are migrated
- [ ] endpoint or worker is documented
- [ ] auth and authorization are enforced
- [ ] validation and error handling are added
- [ ] structured logs are emitted
- [ ] tests are added and passing
- [ ] observability hooks are included
- [ ] idempotency/retry implications are reviewed
- [ ] code review is approved

---

## 18. Handoff Note for Backend Team

This roadmap is derived directly from the current frontend behavior and product signals. Some frontend data is still mocked, but the interaction patterns clearly define the backend surface area. The backend team should use this document as the implementation baseline, then refine endpoint DTOs and schema details in parallel with frontend integration.

**Immediate next action:** start Sprint 1 Day 1 by converting this document into implementation tickets grouped by module and owner.