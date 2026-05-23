---
phase: 28-inbox
plan: 02
subsystem: Inbox
tags:
  - inbox
  - comments
  - webhooks
  - zernio
  - TDD
requires:
  - 28-01 (inbox DM infrastructure)
provides:
  - INBX-03 (comment listing)
  - INBX-04 (reply to comment)
affects:
  - be/src/Syncra.Application (DTOs, Features, Interfaces)
  - be/src/Syncra.Domain (Entities, Interfaces)
  - be/src/Syncra.Infrastructure (Repositories, Services, Jobs, Persistence)
  - be/src/Syncra.Api (Controllers)
  - be/tests/Syncra.UnitTests (Api, Infrastructure)
tech-stack:
  added: []
  patterns:
    - DB-backed cursor pagination with timestamp cursor
    - Comment reply resolves local entity before Zernio API call
    - Mark-read uses domain entity method + IUnitOfWork
key-files:
  created:
    - be/src/Syncra.Domain/Entities/InboxComment.cs
    - be/src/Syncra.Infrastructure/Persistence/Configurations/InboxCommentConfiguration.cs
    - be/src/Syncra.Infrastructure/Persistence/Migrations/YYYYMMDDHHMMSS_AddInboxCommentEntity.cs
    - be/src/Syncra.Application/Features/Inbox/Queries/GetInboxCommentsQuery.cs
    - be/src/Syncra.Application/Features/Inbox/Queries/GetInboxCommentsQueryHandler.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/ReplyToInboxCommentCommand.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/ReplyToInboxCommentCommandHandler.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/MarkCommentReadCommand.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/MarkCommentReadCommandHandler.cs
    - be/tests/Syncra.UnitTests/Api/InboxControllerCommentsTests.cs
  modified:
    - be/src/Syncra.Infrastructure/Persistence/AppDbContext.cs
    - be/src/Syncra.Infrastructure/Persistence/Configurations/InboxCommentConfiguration.cs
    - be/src/Syncra.Application/DTOs/Inbox/InboxDtos.cs
    - be/src/Syncra.Application/Interfaces/IZernioClient.cs
    - be/src/Syncra.Infrastructure/Services/ZernioClient.cs
    - be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs
    - be/src/Syncra.Domain/Interfaces/IInboxRepository.cs
    - be/src/Syncra.Infrastructure/Repositories/InboxRepository.cs
    - be/src/Syncra.Api/Controllers/InboxController.cs
decisions:
  - "Comments listed from local DB (via webhook persistence) rather than proxied through Zernio API, enabling mark-read state and offline consistency"
  - "Reply to comment routes through local commentId (Guid) resolving post/account IDs from DB record, not from request body"
  - "ZernioClient comment methods (ListInboxCommentsAsync, ReplyToInboxCommentAsync) remain available for future live-sync needs"
metrics:
  duration: ~2h (interleaved across session)
  completed: 2026-05-23
---

# Phase 28 Plan 02: Inbox Comments — Summary

One-liner: InboxComment entity, comment.received webhook handler, Zernio comment list/reply client methods, and DB-backed comments API with mark-read — all TDD'd for INBX-03 and INBX-04.

## Tasks

### Task 1: InboxComment entity + migration (auto)

- Created `InboxComment.cs` entity with post preview denormalization fields, `SocialAccount` FK, `WorkspaceId` scoping, `IsRead`/`IsReply` flags, `MarkRead()` domain method
- Created EF configuration with unique `(workspace_id, zernio_comment_id)` index and `(workspace_id, received_at_utc DESC)` sort index
- Added `DbSet<InboxComment>` to `AppDbContext`, generated `AddInboxCommentEntity` migration
- **Verified:** Build succeeds, SQL validated against schema

### Task 2: comment.received webhook handler (TDD: RED → GREEN)

- **RED** (`cca17f5`): Added `CommentReceivedPayload` fixture JSON, tests for create/duplicate-skip/missing-account-skip
- **GREEN** (`1544127`): Implemented `HandleCommentReceivedAsync` — parses comment.id, post.id, post caption/thumbnail; resolves SocialAccount by workspace + externalAccountId; upserts InboxComment with dedup by ZernioCommentId; calls `IInboxNotifier` with type `comment`
- **Verified:** 16 inbox tests pass

### Task 3: Zernio comment list + reply client methods (TDD: RED → GREEN)

- **RED** (`8264b74`): Added `ZernioInboxCommentItemDto`, `ZernioInboxCommentsPageDto`, `ZernioReplyToCommentResponseDto`, interface method declarations, interface-declaration tests
- **GREEN** (`234e507`): Implemented `ListInboxCommentsAsync` via `CommentsApi.ListInboxCommentsAsync` and `ReplyToInboxCommentAsync` via `CommentsApi.ReplyToInboxPostAsync`; handles 402/403 billing gates with `ZernioBillingRequiredException`
- **Verified:** 16 inbox tests pass

### Task 4: Comments API on InboxController (TDD: RED → GREEN)

- **RED** (`4fd233e`): Controller tests for GET comments (success + empty), POST reply (success + billing gate), PATCH read (success + not-found)
- **GREEN** (`3f252b1`): 
  - `GetInboxCommentsQuery` + handler — lists from local DB with optional platform/accountId filters, cursor by `ReceivedAtUtc DESC`
  - `ReplyToInboxCommentCommand` + handler — resolves comment from DB by commentId, verifies workspace, calls Zernio with stored postId/accountId
  - `MarkCommentReadCommand` + handler — marks local comment record as read via domain `MarkRead()`
  - Controller routes: `GET comments`, `POST comments/{commentId}/reply`, `PATCH comments/{commentId}/read`
  - Repository: `GetCommentsAsync`, `GetCommentByIdAsync` on `IInboxRepository`
- **Verified:** 16 inbox tests pass

## Deviations from Plan

### Rule 2 — Added missing PATCH mark-read endpoint

The initial controller implementation omitted the `PATCH comments/{commentId}/read` mark-read endpoint specified in the plan (D-07). Added during execution with `MarkCommentReadCommand` + handler, following the same pattern as `MarkConversationReadCommand`.

### Implementation pivot: DB-based listing vs. Zernio proxy

Initial implementation listed comments via Zernio API proxy. Pivoted to DB-based listing during execution (fix to match plan spec). The Zernio client methods remain available for future live-sync needs.

## Test Summary

| Filter | Tests | Result |
|--------|-------|--------|
| `FullyQualifiedName~Inbox` | 16 | All Passed |
| Full suite | 240 | 234 Passed, 6 middleware disposal racers (pre-existing) |

## Threat Surface Scan

No new threat surface introduced beyond what was specified in the plan's threat model. All comment queries are workspace-scoped via `WorkspaceId`. Reply command verifies workspace ownership via local DB lookup before Zernio API call.

## Self-Check: PASSED

- All 7 commits present (3 feat + 2 test = 5 TDD-auto, 1 feat entity, 1 test + 1 feat controller = 7)
- `InboxComment.cs` exists and has `MarkRead()` method
- Controller has `GET`, `POST`, `PATCH` comment endpoints
- `IInboxRepository` has `GetCommentsAsync` and `GetCommentByIdAsync` methods
- All 16 inbox tests pass
- No accidental deletions in recent commits
- No untracked generated files
