---
phase: 28-inbox
plan: 03
subsystem: api
tags:
  - zernio
  - inbox
  - reviews
  - webhook
  - tdd

requires:
  - phase: 28-02
    provides: inbox comment entity patterns, IInboxRepository, ZernioClient infrastructure
  - phase: 28-01
    provides: inbox DM entity patterns, DTO patterns, SignalR notification patterns

provides:
  - InboxReview entity with EF configuration and migration
  - review.new webhook handler in ProcessZernioWebhookJob
  - GET /workspaces/{id}/inbox/reviews list endpoint with StarRating
  - POST /workspaces/{id}/inbox/reviews/{reviewId}/reply endpoint
  - PATCH /workspaces/{id}/inbox/reviews/{reviewId}/read endpoint
  - ZernioClient review methods (ListInboxReviewsAsync, ReplyToInboxReviewAsync)

affects:
  - 28-04 (remaining inbox plan - likely SignalR integration)

tech-stack:
  added:
    - Zernio SDK ReviewsApi (ListInboxReviews, ReplyToInboxReview)
  patterns:
    - Review webhook follows same dedup/cache pattern as comments
    - Review API routes follow DTO → Query/Command → Controller pipeline
    - StarRating exposed in GET response as nullable double

key-files:
  created:
    - be/src/Syncra.Domain/Entities/InboxReview.cs
    - be/src/Syncra.Infrastructure/Persistence/Configurations/InboxReviewConfiguration.cs
    - be/src/Syncra.Application/Features/Inbox/Queries/GetInboxReviewsQuery.cs
    - be/src/Syncra.Application/Features/Inbox/Queries/GetInboxReviewsQueryHandler.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/ReplyToInboxReviewCommand.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/ReplyToInboxReviewCommandHandler.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/MarkReviewReadCommand.cs
    - be/src/Syncra.Application/Features/Inbox/Commands/MarkReviewReadCommandHandler.cs
    - be/src/Syncra.Infrastructure/Persistence/Migrations/20260523_add_inbox_review_entity.cs
  modified:
    - be/src/Syncra.Infrastructure/Persistence/AppDbContext.cs
    - be/src/Syncra.Application/Interfaces/IZernioClient.cs
    - be/src/Syncra.Infrastructure/Services/ZernioClient.cs
    - be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs
    - be/src/Syncra.Application/DTOs/Inbox/InboxDtos.cs
    - be/src/Syncra.Api/Controllers/InboxController.cs

key-decisions:
  - "Followed existing inbox comment pattern (entity → config → DbSet → repo → DTOs → query/command → controller)"
  - "Review duplication detection uses unique index on (WorkspaceId, ZernioReviewId), same as comments"
  - "StarRating exposed as nullable double in InboxReviewDto for read-only display"
  - "Reply flow calls Zernio API first, updates local HasReply state only on success"
  - "Billing gate (402/403) handled via existing ZernioBillingRequiredException pattern"

patterns-established:
  - "Review webhook handling mirrors comment webhook: dedup by ZernioReviewId, CDN cache busting, SignalR notification"
  - "Review controller routes follow same URL namespace under /workspaces/{id}/inbox/reviews"

requirements-completed:
  - INBX-05

duration: 35min
completed: 2026-05-23
---

# Phase 28 (Inbox) Plan 3: Inbox Reviews Summary

**InboxReview entity with EF migration, review.new webhook handler, and review list/reply/read API endpoints using Zernio ReviewsApi, following TDD with RED-GREEN commits**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-23T22:36:00Z (approx)
- **Completed:** 2026-05-23T23:11:05Z
- **Tasks:** 3 (Tasks 2 and 3 used TDD with RED → GREEN)
- **Files modified:** 22 (13 source, 9 test)

## Accomplishments

- **InboxReview entity** — Domain entity, EF Core configuration with unique composite index on (WorkspaceId, ZernioReviewId), migration adding `inbox_reviews` table with all review fields (StarRating, ReviewerName, ReviewerImageUrl, Platform, HasReply, ReplyText, IsRead, etc.)
- **Review webhook handler** — `ProcessZernioWebhookJob.HandleReviewNewAsync` persisted InboxReview from Zernio webhooks, deduplication by ZernioReviewId, CDN cache invalidation
- **Review list API (GET)** — `GetInboxReviewsQuery` with workspace-scoped query, cursor pagination by ReceivedAtUtc, StarRating exposed in DTO
- **Review reply API (POST)** — `ReplyToInboxReviewCommand` with Zernio API call + local HasReply state update on success
- **Review read API (PATCH)** — `MarkReviewReadCommand` for IsRead toggle
- **TDD discipline** — Tasks 2 and 3: RED (failing test) → GREEN (implementation) demonstrated test-driven approach

## Task Commits

Each task was committed atomically:

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| 1 | feat | `d97eb83` | Add InboxReview entity, configuration, and migration |
| 2 (RED) | test | `90cfea6` | Add failing test for review.new webhook handler |
| 2 (GREEN) | feat | `e05b232` | Implement review.new webhook handler in ProcessZernioWebhookJob |
| 3 (RED) | test | `115d11e` | Add failing tests for review list, reply, and controller |
| 3 (GREEN) | feat | `48ce91c` | Implement review list/reply APIs and controller routes |

**No refactoring commits needed** — implementations followed established patterns cleanly.

## Files Created/Modified

### Source Files (13)
| File | Change | Purpose |
|------|--------|---------|
| `be/src/Syncra.Domain/Entities/InboxReview.cs` | **Created** | Domain entity: ZernioReviewId, SocialAccountId, Platform, ReviewerName, StarRating, ReviewText, HasReply, ReplyText, IsRead |
| `be/src/Syncra.Infrastructure/Persistence/Configurations/InboxReviewConfiguration.cs` | **Created** | EF config: table mapping, unique composite index, decimal precision |
| `be/src/Syncra.Infrastructure/Persistence/AppDbContext.cs` | Modified | Added `inbox_reviews` DbSet |
| `be/src/Syncra.Infrastructure/Persistence/Migrations/20260523_add_inbox_review_entity.cs` | **Created** | Migration — all columns, indexes, foreign keys |
| `be/src/Syncra.Application/DTOs/Inbox/InboxDtos.cs` | Modified | Added InboxReviewDto, InboxSendReviewReplyRequest/Response, ZernioInboxReviewItemDto, ZernioInboxReviewsPageDto, ZernioReplyToReviewResponseDto |
| `be/src/Syncra.Application/Interfaces/IZernioClient.cs` | Modified | Added ListInboxReviewsAsync, ReplyToInboxReviewAsync |
| `be/src/Syncra.Infrastructure/Services/ZernioClient.cs` | Modified | Added ReviewsApi integration with 402/403 billing gate handling |
| `be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs` | Modified | Added HandleReviewNewAsync for review.new/updated webhooks |
| `be/src/Syncra.Application/Features/Inbox/Queries/GetInboxReviewsQuery.cs` | **Created** | Query record with limit/cursor/platform/account filters |
| `be/src/Syncra.Application/Features/Inbox/Queries/GetInboxReviewsQueryHandler.cs` | **Created** | Maps entities to InboxReviewDto via IInboxRepository |
| `be/src/Syncra.Application/Features/Inbox/Commands/ReplyToInboxReviewCommand.cs` | **Created** | Command record with WorkspaceId, ReviewId, Message |
| `be/src/Syncra.Application/Features/Inbox/Commands/ReplyToInboxReviewCommandHandler.cs` | **Created** | Zernio API reply + local HasReply update |
| `be/src/Syncra.Application/Features/Inbox/Commands/MarkReviewReadCommand.cs` | **Created** | Command record |
| `be/src/Syncra.Application/Features/Inbox/Commands/MarkReviewReadCommandHandler.cs` | **Created** | IsRead toggle |
| `be/src/Syncra.Api/Controllers/InboxController.cs` | Modified | Added GET reviews, POST {id}/reply, PATCH {id}/read routes |

### Test Files (9)
| File | Change | Tests |
|------|--------|-------|
| `be/tests/Syncra.Domain/Entities/InboxReviewEntityTests.cs` | **Created** | Entity creation, MarkRead, MarkReplied, UpdateReviewerInfo |
| `be/tests/Syncra.UnitTests/Infrastructure/Jobs/ProcessZernioWebhookJobReviewTests.cs` | **Created** | Webhook handler: create, duplicate, missing account, reply data |
| `be/tests/Syncra.UnitTests/Infrastructure/ZernioClientInboxReviewTests.cs` | **Created** | ZernioClient review method interface declarations |
| `be/tests/Syncra.UnitTests/Api/InboxControllerReviewTests.cs` | **Created** | GET reviews, POST reply, PATCH read, validation, pagination |
| `be/tests/Syncra.UnitTests/Application/Features/Inbox/Commands/ReplyToInboxReviewCommandTests.cs` | **Created** | Command handler with mock verification |
| `be/tests/Syncra.UnitTests/Application/Features/Inbox/Queries/GetInboxReviewsQueryTests.cs` | **Created** | Query handler with mock verification |

## Decisions Made

- **Followed existing inbox comment pattern** — Same architecture (entity → config → DbSet → repo → DTOs → query/command → controller) reused for reviews, reducing cognitive overhead for future maintainers.
- **Unique composite index for dedup** — `(WorkspaceId, ZernioReviewId)` unique index on `inbox_reviews`, identical to the comment dedup pattern. Prevents duplicate review persistence during webhook redelivery.
- **StarRating as nullable double** — Zernio SDK returns star rating as nullable double; exposed read-only in GET response. No write-rating endpoint needed (INBX-05 is read-only).
- **Reply calls Zernio first, updates local on success** — If Zernio API fails (billing, network), the local HasReply flag is NOT updated, keeping state consistent. Prevents phantom "replied" states.
- **Billing gate via existing pattern** — `ZernioApiException` with ErrorCode 402/403 maps to `ZernioBillingRequiredException` using the same `TryHandleBillingException` helper used in all other ZernioClient methods.

## Deviations from Plan

None — plan executed exactly as written. All task types (1x feat, 2x tdd with RED/GREEN) followed correctly. All verification criteria met:

- **INBX-05 satisfied** — review.new webhook persists InboxReview, review list shows star rating, reply calls Zernio API, read marks IsRead locally.
- **Test gates pass** — All 247 unit tests pass (including all 26 inbox tests).

### TDD Gate Compliance

- ✅ RED commit `90cfea6` exists before GREEN commit `e05b232` (Task 2)
- ✅ RED commit `115d11e` exists before GREEN commit `48ce91c` (Task 3)

## Issues Encountered

None — all tasks proceeded without blockers. Zernio Reviews API signatures were confirmed via SDK exploration before implementation began.

## User Setup Required

None — no external service configuration required. Existing Zernio account connection covers review API access.

## Next Phase Readiness

- Plan 28-03 completes the `review.new` webhook and review CRUD APIs.
- Plan 28-04 is the last inbox plan (likely SignalR broadcasting for new reviews/comments to match existing notification patterns).
- The full inbox subsystem now handles: DMs (28-01), comments (28-02), reviews (28-03).

---
## Self-Check: PASSED

- ✅ All 10 key files exist (summary, entity, config, queries, commands, handler, controller)
- ✅ All 5 commits verified in git history (feat entity, test webhook, feat webhook, test api, feat api)
- ✅ All 247 unit tests pass

*Phase: 28-inbox*
*Completed: 2026-05-23*
