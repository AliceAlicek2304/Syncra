# Phase 10: Research — Scheduling & Analytics

**Phase:** 10 — Scheduling & Analytics
**Researched:** 2026-05-08
**Status:** Complete

---

## Executive Summary

Phase 10 binds existing frontend Calendar + Analytics pages to real backend endpoints, and adds a real-time notification surface (SignalR + persisted read/unread). Backend already exposes analytics summary + heatmap endpoints and range-filtered posts query for calendar. SignalR + Notifications persistence not yet present.

---

## 1) Backend API Contract Audit

### 1.1 Scheduling / Posts

- `GET /api/v1/workspaces/{workspaceId}/posts`
  - Query:
    - `status?: string`
    - `scheduledFromUtc?: DateTime`
    - `scheduledToUtc?: DateTime`
    - `page?: int` (default 1)
    - `pageSize?: int` (default 20)
  - Returns: `IReadOnlyList<PostDto>`
    - `Id`, `Title`, `Content`, `Status`, `ScheduledAtUtc`, `PublishedAtUtc`, `IntegrationId`, `MediaIds[]`

- `PUT /api/v1/workspaces/{workspaceId}/posts/{postId}` supports updating `ScheduledAtUtc` via `UpdatePostDto`.

Calendar UI needs month-range fetch + optimistic mutations (reschedule, delete) mapped onto these endpoints.

### 1.2 Analytics

- `GET /api/v1/workspaces/{workspaceId}/analytics/summary?date={7|30|90}`
  - Returns `WorkspaceAnalyticsSummaryDto`:
    - `TotalReach: long`
    - `EngagementRate: double`
    - `FollowerGrowth: long`
    - `TotalPosts: int`
    - `WeeklyReach: WeeklyReachDto[]` (`WeekStart: "yyyy-MM-dd"`, `Reach: long`)

- `GET /api/v1/workspaces/{workspaceId}/analytics/heatmap?date={7|30|90}`
  - Returns `HeatmapDto` with `Slots: HeatmapSlotDto[]`:
    - `DayOfWeek: int` (0=Mon..6=Sun)
    - `Hour: int` (0–23, **UTC**)
    - `Score: int`

Frontend heatmap must expand to 7×24, compute intensity via relative max, then convert UTC hour -> local hour column.

---

## 2) Frontend Integration Surfaces

### 2.1 CalendarPage

- File: `fe/src/pages/app/CalendarPage.tsx`
- Current: mixes local CalendarContext posts + hardcoded `MOCK_POSTS`.
- Target: month-range query (TanStack Query) + optimistic reschedule/delete, keep visual layout frozen.

### 2.2 AnalyticsPage

- File: `fe/src/pages/app/AnalyticsPage.tsx`
- Current: hardcoded metric cards, weekly bars, platform breakdown table, static date badge.
- Target: bind to `analytics/summary`, add preset selector (7/30/90), skeleton states, computed range label.

### 2.3 Heatmap component

- File: `fe/src/components/Heatmap.tsx`
- Current: mock 7×8 intensity matrix.
- Target: 7×24 grid + tooltip + local-time mapping.

### 2.4 Global Notifications

- Placement target: `fe/src/pages/app/AppLayout.tsx`
- Need: `NotificationBell` component (bell + dropdown) + SignalR connection + persisted list API.

---

## 3) SignalR Notes (implementation guide)

### 3.1 Recommended hub route

Map hub under API prefix so Vite proxy works:
- Hub: `/api/v1/hubs/notifications`
- FE connects via `import.meta.env.BASE_URL + "api/v1/hubs/notifications"` (becomes `/Syncra/api/v1/hubs/notifications`)

### 3.2 JWT auth for websockets

Configure `JwtBearerOptions.Events.OnMessageReceived` to read `access_token` from query string for hub path, so `@microsoft/signalr` can authenticate.

### 3.3 Workspace scoping

Hub should add connections into a workspace group:
- Group name: `workspace:{workspaceId}`
- Derive workspaceId from route parameter or validated header/claim.

---

## 4) Risks / Known Gaps

- Notification persistence currently not implemented in domain/infrastructure.
- Vite dev proxy currently proxies only `/Syncra/api/*`; hub route must live under `/api` to avoid CORS work.
- Calendar time-zone correctness must be handled (UTC storage vs local rendering).
