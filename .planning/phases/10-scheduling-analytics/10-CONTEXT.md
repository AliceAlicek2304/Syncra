# Phase 10: Scheduling & Analytics - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Connecting the frontend Calendar and Heatmap components to the real Scheduling and Analytics APIs, binding dashboard charts to live backend metrics, and implementing a real-time notification system using SignalR.

</domain>

<decisions>
## Implementation Decisions

### Calendar Data & Interaction
- **D-01:** Fetch post data per-month upon navigation. Use the `scheduledFromUtc` and `scheduledToUtc` range parameters on the `GetPosts` endpoint.
- **D-02:** Use optimistic updates for calendar actions (reschedule, delete). Revert and show error toast on API failure.
- **D-03:** Drag-to-reschedule commits immediately upon drop via a `PATCH` request to update `ScheduledAtUtc`, matching the D&D pattern from Phase 9.
- **D-04:** Keep and extend `CalendarContext` for UI state (navigation, selected day, drag state), while adding TanStack Query hooks underneath for data fetching.

### Analytics & Visuals
- **D-05:** Keep the custom CSS bar charts in `AnalyticsPage.tsx` but bind them to real `WeeklyReach` data from the backend.
- **D-06:** Implement a global date range preset selector (Last 7/30/90 days) in the Analytics header that updates all metrics and charts.
- **D-07:** Use glassmorphism skeleton overlays matching the card/chart shapes during loading states to maintain "Pro Max" UX standards.

### Heatmap Logic
- **D-08:** Intensity calculation: `intensity = Score / MaxScore` (Relative Max) per-view, ensuring the most active slots are always visually prominent.
- **D-09:** Automatically convert UTC hours from the API to the user's browser local time before rendering the 7×24 grid.
- **D-10:** Add interactive tooltips: `{Day}, {HH:mm} — {count} posts published`.
- **D-11:** Data reflects total activity across the entire workspace (Workspace Global).

### Live Notifications (SignalR)
- **D-12:** Implement a real-time `NotificationHub` using SignalR on the backend.
- **D-13:** Notifications cover Post status updates (success/fail), AI generation progress, and Billing/System events.
- **D-14:** UI consists of a Navbar Bell with an unread badge and dropdown list, paired with corner Toast notifications for immediate alerts.
- **D-15:** Read/Unread status is persisted in the database to ensure synchronization across devices and persistence after page reloads.

### the agent's Discretion
- Exact SignalR hub protocol design and payload structure.
- Implementation details for the UTC-to-Local conversion logic in the heatmap grid.
- Visual styling of the skeleton loaders.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend APIs
- `be/src/Syncra.Api/Controllers/AnalyticsController.cs` — Analytics and Heatmap endpoints.
- `be/src/Syncra.Api/Controllers/PostsController.cs` — Range-filtered post fetching and scheduling updates.
- `be/src/Syncra.Application/DTOs/Analytics/WorkspaceAnalyticsSummaryDto.cs` — Data structure for charts and heatmap.

### Frontend Components
- `fe/src/pages/app/CalendarPage.tsx` — Main calendar view (to be bound).
- `fe/src/pages/app/AnalyticsPage.tsx` — Main analytics view (to be bound).
- `fe/src/components/Heatmap.tsx` — Heatmap grid component (to be bound).
- `fe/src/context/CalendarContext.tsx` — UI state management for the calendar.

### Project Standards
- `.planning/PROJECT.md` — Vision and "Pro Max" UI standards.
- `.planning/REQUIREMENTS.md` — REQ-8.3, REQ-8.5, REQ-8.6 define this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Heatmap` component: Core logic exists, needs mapping from `HeatmapSlotDto`.
- `AnalyticsPage` CSS charts: Ready for binding to `WeeklyReach`.
- `CalendarContext`: Established UI state; extend with `useCalendarPosts`.

### Established Patterns
- **TanStack Query**: Use for all server state and optimistic updates.
- **ToastContext**: Use for immediate notification toasts.
- **Axios Interceptors**: Already handle `X-Workspace-Id` for multi-tenancy.

### Integration Points
- `NotificationHub`: New backend integration required.
- `AnalyticsController` connectivity for live dashboard metrics.

</code_context>

<specifics>
## Specific Ideas
- "Relative Max" normalization ensures the heatmap is always vibrant regardless of total post count.
- Local time conversion for the calendar/heatmap is critical for user scheduling accuracy.

</specifics>

<deferred>
## Deferred Ideas
- **Analytics Drill-down**: Clicking platform cards to filter metrics deferred to Phase 13.
- **Batch Actions**: Bulk notification management deferred to future maintenance.

</deferred>

---

*Phase: 10-Scheduling & Analytics*
*Context gathered: 2026-05-08*
