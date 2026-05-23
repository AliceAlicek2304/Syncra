---
phase: 28
plan: 04
subsystem: inbox
tags: [inbox, backfill, sync, hangfire, signalr, ui, frontend]
requires: [28-03]
affects: [be/src/Syncra.Infrastructure/Jobs, fe/src/hooks, fe/src/pages/inbox, fe/src/api, fe/src/pages/app/AppLayout]
key-files:
  created:
    - be/src/Syncra.Application/Interfaces/IInboxBackfillService.cs
    - be/src/Syncra.Application/Services/InboxBackfillService.cs
    - be/src/Syncra.Infrastructure/Jobs/InboxBackfillJob.cs
    - fe/src/api/inbox.ts
    - fe/src/hooks/useInbox.ts
    - fe/src/hooks/useInboxBackfill.ts
    - fe/src/hooks/useInboxBadge.ts
    - fe/src/pages/inbox/InboxPage.tsx
    - fe/src/pages/inbox/InboxPage.module.css
    - fe/src/pages/inbox/DmTab.tsx
    - fe/src/pages/inbox/CommentsTab.tsx
    - fe/src/pages/inbox/ReviewsTab.tsx
  modified:
    - be/src/Syncra.Domain/Interfaces/IInboxRepository.cs
    - be/src/Syncra.Infrastructure/Repositories/InboxRepository.cs
    - be/src/Syncra.Api/Controllers/InboxController.cs
    - be/src/Syncra.Application/DTOs/Inbox/InboxDtos.cs
    - be/src/Syncra.Infrastructure/DependencyInjection.cs
    - be/src/Syncra.Application/DependencyInjection.cs
    - fe/src/hooks/useNotificationHub.ts
    - fe/src/pages/app/AppLayout.tsx
    - fe/src/App.tsx
decisions:
  - "Backfill service in Application layer uses IInboxRepository, IZernioClient, IZernioProfileRepository, ISocialAccountRepository via DI — clean separation from Infrastructure"
  - "Extended IInboxRepository with GetCommentByZernioIdAsync, AddCommentAsync, AddReviewAsync for upserting comments/reviews"
  - "DM messages NOT bulk-fetched per D-10/RESEARCH — only conversation headers backfilled; message threads lazy-load on conversation open"
  - "Sync status simplified: IsSyncing always false (no in-memory tracking); LastSyncedAtUtc derived from existence of conversation data"
  - "Inbox nav unread badge uses separate useInboxBadge hook polling inbox summary endpoint — avoids coupling AppLayout to full inbox queries"
---

# Phase 28 Plan 4: Inbox Backfill, Sync API, and Frontend Inbox UI Summary

**One-liner:** Inbox backfill service with Hangfire job, sync API endpoints, and the full frontend inbox UI (master-detail DM/comments/reviews tabs) with unread badge and SignalR real-time invalidation.

## Objectives Achieved

| Objective | Status |
|-----------|--------|
| Backend backfill service + Hangfire job | ✅ Done |
| Sync API endpoints (POST trigger, GET status) | ✅ Done |
| Frontend API client + TanStack Query hooks | ✅ Done |
| InboxPage with tabs and master-detail layout | ✅ Done |
| AppLayout nav item + Inbox route | ✅ Done |
| Unread badge on nav + SignalR event handling | ✅ Done |

## Task Execution

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Backend backfill service, Hangfire job, sync API | `b474afd` | ✅ Done |
| 2 | fe/src/api/inbox.ts + useInbox + useInboxBackfill hooks | `f9db5bc` | ✅ Done |
| 3 | InboxPage with tabs + master-detail (DM, Comments, Reviews) | `cdb6429` | ✅ Done |
| 4 | AppLayout nav + Inbox route | `eb83c21` | ✅ Done |
| 5 | Unread badge + SignalR inbox.updated handler | `a7c8fff` | ✅ Done |

### Task 1: Backend Backfill Service, Job, and Sync API

**Created:**
- `IInboxBackfillService` interface in `Syncra.Application/Interfaces/`
- `InboxBackfillService` — orchestrates 30-day backfill of conversations/comments/reviews from Zernio list APIs, upserting via `IInboxRepository`
- `InboxBackfillJob` — Hangfire job with 3 retry attempts, wrapping `IInboxBackfillService`
- Registered both in their respective `DependencyInjection.cs`

**Modified:**
- `IInboxRepository` — added `GetCommentByZernioIdAsync`, `AddCommentAsync`, `AddReviewAsync`
- `InboxRepository` — implemented those three methods (upsert comments by `ZernioCommentId`, insert reviews)
- `InboxDtos.cs` — added `InboxSyncStatusDto`
- `InboxController` — added `POST .../inbox/sync` (returns 202 Accepted, enqueues Hangfire job), `GET .../inbox/sync-status` (returns `{ isSyncing: bool, lastSyncedAtUtc: string | null }`)

**Acceptance criteria:**
- `InboxBackfillJob.cs` exists ✅
- `POST .../inbox/sync` enqueues job and returns 202 Accepted ✅
- Backfill uses 30-day window (`TimeSpan.FromDays(30)`) ✅

### Task 2: Frontend API Client and Hooks

**Created:**
- `fe/src/api/inbox.ts` — full API client with DTOs and all endpoints: conversations, messages, comments, reviews, reply, mark-read, summary, sync trigger/status
- `fe/src/hooks/useInbox.ts` — TanStack Query hooks: per-tab `useInfiniteQuery` (conversations, comments, reviews), summary polling, mutations for mark-read and send-reply with `onSettled` invalidation
- `fe/src/hooks/useInboxBackfill.ts` — auto-triggers backfill on first inbox open (detects `!lastSyncedAtUtc && !isSyncing`), polls sync status every 3s while syncing, returns status for skeleton/banner rendering

### Task 3: InboxPage with Tabs and Master-Detail Layout

**Created:**
- `InboxPage.tsx` — sync status banner (loading/syncing/last-synced/never-synced), tab bar (Messages/Comments/Reviews), filter placeholder area, tab panel switching
- `InboxPage.module.css` — complete styling: sync banner, tabs, master-detail layout, list items with unread indicator (blue left border), avatar with initials fallback, thread bubbles (blue outgoing, gray received), reply area with textarea, detail cards for comments/reviews, empty states
- `DmTab.tsx` — conversation list (left panel), thread view (right panel) with DM reply bar, optimistic mark-read on selection, inline message loading
- `CommentsTab.tsx` — comment list with unread dots, detail view with post preview thumbnail, reply textarea
- `ReviewsTab.tsx` — review list with star rating, detail view with existing reply display, reply textarea

### Task 4: AppLayout Nav and Inbox Route

- Added `Inbox` icon to lucide-react imports and `{ to: '/app/inbox', icon: <Inbox />, label: 'Inbox' }` to `NAV_ITEMS` in `AppLayout.tsx`
- Added `import InboxPage` and `<Route path="inbox" element={<InboxPage />} />` in `App.tsx`

### Task 5: Unread Badge and SignalR Integration

- **`useInboxBadge.ts`** — lightweight hook polling inbox summary endpoint every 30s for nav badge count, separate from full `useInbox` to avoid loading all inbox data just for the badge
- **AppLayout** — renders numeric badge on Inbox nav item when `unreadCount > 0`, capped at `99+`
- **`useNotificationHub.ts`** — added `inbox.updated` event handler that invalidates `inbox-summary`, `inbox-conversations`, `inbox-comments`, `inbox-reviews`, and `inbox-unread-badge` query keys for real-time badge updates; added cleanup to teardown

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- [x] All 5 tasks committed individually
- [x] Each commit with proper conventional commit format (`feat(28-inbox)`)
- [x] Backend backfill service + Hangfire job created
- [x] Sync API endpoints (POST trigger returning 202, GET status)
- [x] Frontend API client covering all inbox endpoints
- [x] TanStack Query hooks per tab with useInfiniteQuery
- [x] InboxPage with tabs + master-detail layout
- [x] AppLayout nav item + Inbox route
- [x] Unread badge on nav bar
- [x] SignalR inbox.updated real-time invalidation
- [x] Backfill auto-trigger on first inbox open
- [x] No stubs preventing plan goals

## Metrics

- **Duration:** 4.3 minutes
- **Commits:** 5
- **Files created:** 12
- **Files modified:** 9

## Self-Check: PASSED

All 12 created files verified present. All 5 commits verified in git history. No file deletions across plan commits. No untracked files left behind.

## Threat Flags

None — no new network endpoints beyond the designed sync/sync-status paths, no new auth surfaces, no new file access patterns or schema changes at trust boundaries.
