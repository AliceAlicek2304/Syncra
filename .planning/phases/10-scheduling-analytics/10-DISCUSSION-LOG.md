# Phase 10: Scheduling & Analytics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 10-Scheduling & Analytics
**Areas discussed:** Calendar Data Strategy, Analytics Chart Approach, Heatmap Binding, Live Notification System

---

## Calendar Data Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Per-month on navigate | Fetch all posts for the visible month when the user opens or navigates the calendar. | ✓ |
| Sliding window | Prefetch next/previous month in background. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic update | Update the calendar immediately on action, rollback if the API call fails. | ✓ |
| Refetch after mutation | Invalidate the month query after any mutation. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Drag commits on drop | Dropping on a new day fires a PATCH immediately. | ✓ |
| Drag opens confirm modal | Small popover confirms the new time before saving. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep + extend | CalendarContext stays as UI state manager, TanStack Query hooks sit underneath. | ✓ |
| Replace with query hooks | Rip out CalendarContext, drive everything from hooks directly. | |

**User's choice:** Fixed fetching per-month, optimistic updates, immediate drag-commits, and extending the existing Context.

---

## Analytics Chart Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Custom CSS (Enhanced) | Keep hand-rolled CSS bars but bind to real WeeklyReach data. | ✓ |
| Recharts / Nivo | Switch to a robust charting library. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Global Preset Selector | Single dropdown in the header (7/30/90 days). | ✓ |
| Per-card control | Each card has its own period selector. | |

| Option | Description | Selected |
|--------|-------------|----------|
| No drill-down | Cards are static summaries for now; deferred to Phase 13. | ✓ |
| Navigate to detail | Opens sub-page or modal for specific platform metrics. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton Overlays | Use glassmorphism skeletons matching the card shapes. | ✓ |
| Global Spinner | Single centered loader for the whole page. | |

**User's choice:** Enhanced CSS charts, global date presets, no drill-down, and skeleton loading states.

---

## Heatmap Binding

| Option | Description | Selected |
|--------|-------------|----------|
| Relative Max | intensity = Score / MaxScore. | ✓ |
| Fixed Scale | 5 posts = 100% intensity. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Local Time | Auto-convert UTC from API to browser local time. | ✓ |
| Raw UTC | Display hours as received from backend. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Simple Tooltip | "{Day}, {HH:mm} — {count} posts published". | ✓ |
| Static | Color only, no tooltip. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Workspace Global | Total across all platforms in workspace. | ✓ |
| Integration Specific | Changes based on platform selection. | |

**User's choice:** Relative normalization, local time conversion, interactive tooltips, and global workspace scope.

---

## Live Notification System

| Option | Description | Selected |
|--------|-------------|----------|
| SignalR | Real-time connection via NotificationHub. | ✓ |
| Long Polling | Periodic API calls to check for updates. | |

| Option | Description | Selected |
|--------|-------------|----------|
| All types | Post status, AI progress, Billing/System events. | ✓ |
| Post Status only | Only notify on publishing success/failure. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + Bell | Navbar icon (badge + dropdown) paired with Toast alerts. | ✓ |
| Only Toast | Temporary notifications with no history. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Database Persisted | Sync across devices, survive reloads. | ✓ |
| Local Persistence | localStorage only. | |

**User's choice:** SignalR implementation, broad notification coverage, Toast + Navbar Bell UI, and database persistence.

---

## the agent's Discretion

- Design of the SignalR hub protocol.
- Clamping and fallback logic for heatmap intensity.
- Visual styling of skeleton loaders.

## Deferred Ideas

- **Analytics Drill-down**: Clicking platform cards for filtered views (Phase 13).
- **Notification Management**: Bulk marking as read or filtering notifications (Future).
