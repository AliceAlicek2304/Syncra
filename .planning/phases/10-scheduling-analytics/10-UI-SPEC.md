---
phase: 10
slug: scheduling-analytics
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-08
---

# Phase 10 — UI Design Contract

> Visual + interaction contract for Phase 10: Scheduling & Analytics.
> Scope: Calendar + Analytics pages + Heatmap binding + global Notifications UI.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Vanilla CSS + CSS Modules) |
| Preset | not applicable |
| Component library | none (custom components) |
| Icon library | `lucide-react` |
| Body font | `Inter` (weights 400, 500, 600, 700) |
| Display/title font | `Outfit` (weights 400–900) |
| Color scheme | dark-only |

---

## Design Tokens (source of truth: `fe/src/index.css`)

Executors MUST use CSS variables. Do NOT hardcode new hex values.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-dark` | `#03060c` | Page background |
| `--bg-card` | `rgba(13,17,28,0.4)` | Glass card surfaces |
| `--border-glass` | `rgba(255,255,255,0.08)` | Default card/input borders |
| `--border-glow` | `rgba(139,92,246,0.2)` | Hover/focus borders |
| `--purple-300` | `#c4b5fd` | Subtle text accents |
| `--purple-400` | `#a78bfa` | Hover states, active borders |
| `--purple-500` | `#8b5cf6` | Primary accent |
| `--purple-600` | `#7c3aed` | Pressed states |
| `--pink-500` | `#ec4899` | Gradient pair / destructive soft |
| `--cyan-400` | `#22d3ee` | Info / success accents |
| `--text-primary` | `#ffffff` | Primary text |
| `--text-secondary` | `#cbd5e1` | Secondary text |
| `--text-muted` | `#64748b` | Placeholder, metadata |
| `--gradient-brand` | `linear-gradient(135deg, #8b5cf6, #d946ef)` | Buttons, icon backgrounds |
| `--gradient-hero` | `linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #22d3ee 100%)` | Gradient text only |

### 60/30/10 Rule

| Role | Token | Share |
|------|-------|-------|
| Dominant | `--bg-dark` + `--bg-card` | 60% |
| Secondary | `--border-glass`, `--text-secondary` | 30% |
| Accent | `--purple-500`, `--gradient-brand` | 10% |

Accent reserved for: primary CTAs, selected states, active nav items, badges. Not for every interactive element.

---

## Spacing Scale

All spacing MUST be multiples of 4px.

Existing app page padding baseline: `28px 28px 0` (keep unless layout already differs).

---

## Typography

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| Page title | Outfit | 22px | 800 | 1.2 |
| Section heading | Outfit | 16–18px | 700 | 1.3 |
| Body text | Inter | 14px | 400 | 1.6 |
| Label/meta | Inter | 13px | 500 | 1.4 |
| Muted/hint | Inter | 13px | 400 | 1.4 |
| Caption/badge | Inter | 12px | 700 | 1.0 |

---

## Global UI Patterns

### Glass Card Pattern

All cards MUST use global `.glass-card` class (`fe/src/index.css`).

### Skeleton Loading Pattern

Use existing `<Skeleton />` (`fe/src/components/Skeleton.tsx`). No spinners.

---

## Component-Specific Contracts

### 1) Calendar Page (`fe/src/pages/app/CalendarPage.tsx`) — Visual Freeze + Data Binding

Phase 10 wires Calendar to real Scheduling API. Visual layout stays.

**Must NOT change:**
- View switcher UI (Month/Week/Day)
- Month grid layout + right-side detail panel
- Drag-to-reschedule interaction pattern (drop commits immediately)

**Allowed additions (required for binding):**
- Skeleton loading overlay on month/week/day surfaces while month range fetch in-flight
- Error toast on failed optimistic mutation (reschedule/delete)
- Subtle “Saving…” micro-indicator during mutation (text only; `--text-muted`; no spinner)

**Calendar loading spec:**
- When month posts query `isLoading`:
  - Keep shell visible (header + toolbar) and show skeletons in calendar card area.
  - Disable navigation buttons only if needed to avoid query stampede; if disabled, keep opacity >= 0.6.

**Mutation feedback spec:**
- On drag-drop reschedule:
  - Optimistic move in UI immediately.
  - If API fails: rollback visual state, show toast: `Could not reschedule post. Please try again.`

---

### 2) Analytics Page (`fe/src/pages/app/AnalyticsPage.tsx`) — Preset Date Range + Live Metrics

Phase 10 binds all analytics cards/charts to backend metrics.

#### 2.1 Header — Date Range Preset Selector (D-06)

Replace static date badge with a preset selector:

**Control spec:**
- Location: right side of Analytics header (same row as date badge now)
- Base: pill/button with subtle glass bg
- Content: calendar icon + selected preset label + chevron
- Dropdown: glass card, 3 options

**Options (exact copy):**
- `Last 7 days`
- `Last 30 days`
- `Last 90 days`

**Selected state:**
- Selected option shows check icon + text color `--purple-300`

**Date badge:**
- After selection, show computed range label (e.g. `Apr 01 – Apr 07, 2026`) as muted subtext under preset OR inline right of it. Exact placement implementer choice, but must remain compact.

#### 2.2 Loading spec (D-07)

While summary query loading:
- Metric cards: skeleton for number + delta line
- Weekly reach chart: skeleton bars matching bar positions
- Heatmap: skeleton grid overlay (same final dimensions)
- Platform breakdown table: 6 skeleton rows

---

### 3) Heatmap (`fe/src/components/Heatmap.tsx`) — 7×24 Grid + Local Time + Tooltips

Replace mock `HEAT_DATA` with API-bound slots.

**Grid dimensions:**
- Rows: 7 days (Mon–Sun)
- Columns: 24 hours (0–23)
- X-axis labels: show tick labels every 3 hours: `00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00`

**Intensity (D-08):**
- `intensity = score / maxScore` (relative max per-view)
- Clamp to `[0, 1]`
- If `maxScore <= 0`: treat all intensity as `0`

**UTC → Local conversion (D-09):**
- Convert slot hour values from API UTC to browser local time before placing into 24 columns.

**Tooltip (D-10):**
- On hover/focus of any cell, show tooltip:
  - Format: `{Day}, {HH:mm} — {count} posts published`
  - Tooltip style: small glass card; 12px Inter; `--text-secondary`; border `--border-glass`

**Color scale:**
- 0: `rgba(255,255,255,0.03)`
- >0: `rgba(139, 92, 246, 0.12 + intensity * 0.58)`
- For intensity >= 0.75: add subtle outer glow `box-shadow: 0 0 0 1px var(--border-glow)`

---

### 4) Live Notifications (SignalR) — Bell + Dropdown + Toast

Phase 10 introduces real-time notifications.

#### 4.1 Global Entry Point (D-14)

Add a Notification Bell accessible from all `/app/*` routes.

**Placement:**
- Inside `AppLayout` main area, fixed top-right (above page content), or in a small topbar container.
- Must not cover primary page header content on desktop; on small screens can overlay with `z-index` + padding.

**Bell button spec:**
- Hit area: 40×40
- Background: `rgba(255,255,255,0.04)`
- Border: `1px solid var(--border-glass)`
- Hover: border `--purple-400`

**Unread badge spec:**
- Badge: 8px dot (no number in Phase 10)
- Color: `--pink-500`
- Position: top-right corner of bell

#### 4.2 Dropdown spec

- Container: glass-card, width 320px (desktop), full-width (mobile)
- Header row:
  - Title: `Notifications` (Outfit 16px 700)
  - Optional small action link: `Mark all as read` (Inter 12px; `--text-muted`) (optional; allowed)
- List:
  - Max visible height: 360px, scroll
  - Item row: 12px/13px Inter text, 12px muted timestamp
  - Unread indicator: small 6px dot at left or right

**Empty state copy:**
- Heading: `No notifications yet`
- Body: `We'll let you know when something important happens.`

#### 4.3 Toast spec

Any incoming real-time notification MAY also show a toast via `useToast()`.

**Toast copy:**
- Post publish success: `Post published successfully.`
- Post publish failure: `Post failed to publish. Check details and try again.`
- Generic: `You have a new notification.`

---

## Copywriting Contract (new/modified strings)

| Element | Copy |
|---------|------|
| Analytics preset label | `Last 7 days` / `Last 30 days` / `Last 90 days` |
| Notifications dropdown title | `Notifications` |
| Notifications empty heading | `No notifications yet` |
| Notifications empty body | `We'll let you know when something important happens.` |
| Calendar reschedule error toast | `Could not reschedule post. Please try again.` |

---

## Interaction & Animation Contracts

| Interaction | Spec |
|-------------|------|
| Dropdown open | `opacity 0→1`, `translateY(-4px→0)`, 160–200ms ease |
| Dropdown close | reverse, 120–160ms |
| Heatmap cell hover | subtle border/glow only; no scale |
| Skeleton pulse | use existing `<Skeleton>` component |

No Framer Motion in Phase 10.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| `lucide-react` | Bell, ChevronDown, Calendar icons | not required |
| `@tanstack/react-query` | `useQuery`, `useMutation` | not required |
| `axios` | existing API client | not required |
| `@microsoft/signalr` | SignalR connection for notifications | **required** (new dependency) |

No other new npm packages should be added in Phase 10.

---

## New Files to Create (expected)

| File | Type | Purpose |
|------|------|---------|
| `fe/src/api/analytics.ts` | API module | Analytics summary + heatmap endpoints |
| `fe/src/api/notifications.ts` | API module | Notifications list + read/unread actions |
| `fe/src/hooks/useCalendarPosts.ts` | hook | Month-range calendar query + optimistic mutations |
| `fe/src/hooks/useAnalyticsSummary.ts` | hook | Date preset → summary query |
| `fe/src/hooks/useNotificationHub.ts` | hook | SignalR connect/reconnect + event handling |
| `fe/src/components/NotificationBell.tsx` | component | Bell + dropdown |
| `fe/src/components/NotificationBell.module.css` | CSS Module | Notification styles |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — new strings specified
- [x] Dimension 2 Visuals: PASS — glass-card + skeleton overlays mandated
- [x] Dimension 3 Color: PASS — token-based scale + badge colors defined
- [x] Dimension 4 Typography: PASS — aligns with Inter/Outfit table
- [x] Dimension 5 Spacing: PASS — 4px grid, compact dropdown spec
- [x] Dimension 6 Registry Safety: PASS — only 1 new dependency explicitly declared

**Approval:** approved 2026-05-08
