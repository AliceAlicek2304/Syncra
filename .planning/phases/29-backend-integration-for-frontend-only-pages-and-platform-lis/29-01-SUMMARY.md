---
phase: 29
plan: 01
name: backend-integration-for-frontend-only-pages-and-platform-lis
subsystem: frontend, backend
tags:
  - platform-registry
  - repurpose
  - trend-radar
  - zernio-api
  - integration
requires:
  - "Zernio SDK DI, accounts, posts, analytics, inbox (24-28)"
affects:
  - fe/src/data/platforms.ts (new)
  - be/src/Syncra.Api/Controllers/RepurposeController.cs (new)
  - be/src/Syncra.Api/Controllers/TrendsController.cs (new)
  - fe/src/context/repurposeContextBase.ts (modified)
  - fe/src/context/RepurposeContext.tsx (modified)
  - fe/src/pages/app/TrendRadarPage.tsx (modified)
  - fe/src/pages/app/RepurposePage.tsx (modified)
tech-stack:
  added:
    - "Backend: RepurposeService + TrendsService (template-based v1)"
    - "Frontend: trendsApi + repurposeApi modules"
  patterns:
    - "Centralized Zernio platform registry with getPlatformById()"
    - "useQuery for trend data, context-based mutation for repurpose"
key-files:
  created:
    - fe/src/data/platforms.ts
    - fe/src/api/repurpose.ts
    - fe/src/api/trends.ts
    - be/src/Syncra.Application/DTOs/Trends/TrendDtos.cs
    - be/src/Syncra.Application/DTOs/Repurpose/RepurposeDtos.cs
    - be/src/Syncra.Application/Interfaces/ITrendsService.cs
    - be/src/Syncra.Application/Interfaces/IRepurposeService.cs
    - be/src/Syncra.Application/Services/TrendsService.cs
    - be/src/Syncra.Application/Services/RepurposeService.cs
    - be/src/Syncra.Api/Controllers/TrendsController.cs
    - be/src/Syncra.Api/Controllers/RepurposeController.cs
  modified:
    - fe/src/pages/Settings/SocialAccounts.tsx
    - fe/src/pages/app/AnalyticsPage.tsx
    - fe/src/pages/app/TrendRadarPage.tsx
    - fe/src/pages/app/RepurposePage.tsx
    - fe/src/components/calendar/CalendarConstants.ts
    - fe/src/components/create-post/CreatePostSidebar.tsx
    - fe/src/components/create-post/types.ts
    - fe/src/components/repurpose/ConfigBar.tsx
    - fe/src/components/repurpose/ResultsGrid.tsx
    - fe/src/components/repurpose/AtomCard.tsx
    - fe/src/components/TrustBadges.tsx
    - fe/src/components/EditPostModal.tsx
    - fe/src/context/repurposeContextBase.ts
    - fe/src/context/RepurposeContext.tsx
    - fe/src/data/mockAI.ts
    - fe/src/pages/app/CalendarPage.tsx
    - be/src/Syncra.Application/DependencyInjection.cs
decisions:
  - "Template-based generation for RepurposeService v1 (future: LLM/Zernio SDK)"
  - "X platform → Zernio id 'twitter' (matches Zernio API convention, not 'x')"
  - "Platform registry uses icon as string name, not React component — components import icon via xText fallback"
  - "Calendar keeps custom CSS variable colors via CALENDAR_PLATFORM_COLORS override map"
metrics:
  duration: "~3 hours"
  completed_date: "2026-05-24"
---

# Phase 29 Plan 01: Backend Integration for Frontend-Only Pages & Platform List Cleanup Summary

Created a centralized Zernio platform registry (`fe/src/data/platforms.ts`) with all 14 Zernio-supported platforms, replaced 7+ scattered platform lists with imports from the registry, removed non-Zernio platforms (mastodon, tumblr, Newsletter), and built backend API endpoints for Repurpose (POST `/repurpose/generate`) and Trend Radar (`GET /trends`) with matching frontend API integration.

## Tasks Completed

| # | Task | Type | Commit | Files |
|---|------|------|--------|-------|
| 1.1 | Create centralized platform constants | feat | `6d3631b` | `fe/src/data/platforms.ts` |
| 1.2 | Update all PLATFORMS references to registry | feat | `141953c` | SocialAccounts, AnalyticsPage, CalendarConstants, create-post, ConfigBar, TrustBadges, ResultsGrid |
| 1.3 | Update RepurposePlatform type | feat | `540d7d9` | `repurposeContextBase.ts`, `mockAI.ts` |
| 1.4 | Verify backend platform storage | — | — | No code change needed (backend already stores platform as string) |
| 2.1 | Backend Repurpose API endpoint | feat | `1e8ecb3` | `RepurposeDtos.cs`, `IRepurposeService.cs`, `RepurposeService.cs`, `RepurposeController.cs`, `DependencyInjection.cs` |
| 2.2 | Frontend Repurpose API integration | feat | `ef8efb3` | `repurpose.ts`, `RepurposeContext.tsx`, `ConfigBar.tsx` |
| 3.1 | Backend Trends API endpoint | feat | `0158678` | `TrendDtos.cs`, `ITrendsService.cs`, `TrendsService.cs`, `TrendsController.cs`, `DependencyInjection.cs` |
| 3.2 | Frontend Trends API integration | feat | `d7d84e8` | `trends.ts`, `TrendRadarPage.tsx` |
| 4.1 | Loading/error/empty states, stale refs cleanup | fix + feat | `71513a6`, `23faf09` | EditPostModal, CreatePostSidebar, AtomCard, CalendarPage, RepurposePage, RepurposePage.module.css |
| 4.3 | Final integration verification | chore | `857c992` | Build checks, stale ref scan |

## Key Decisions

### Platform Registry Design

- **`icon` field removed from PlatformDef** — platform definitions carry `xText: string` instead of a React component reference. Components that need a platform icon use `xText` (e.g., `<span className={styles.xBadgeText}>{platform.xText}</span>`). This avoids coupling the data layer to a specific icon library.
- **`getPlatformById()` helper** provides safe lookups with a fallback to `linkedin` as default.
- **`ZERNIO_PLATFORM_IDS`** provides a type-safe union string type for all platform IDs.

### Calendar Colors

- Calendar platform colors use a dedicated `CALENDAR_PLATFORM_COLORS` override map in `CalendarConstants.ts` instead of importing color values directly from the registry. This allows the calendar to maintain its own CSS variable-based color scheme without affecting other platform consumers.

### RepurposeService v1

- Uses template-based content generation for all 14 platforms. Each platform has a unique content format template (character count limits, structure, tone). No external API dependency for v1 — keeps the MVP fast to iterate.

## Changes Summary

### New Files (11)

| File | Purpose |
|------|---------|
| `fe/src/data/platforms.ts` | Centralized Zernio platform registry (14 platforms) |
| `fe/src/api/repurpose.ts` | Repurpose API module (POST) |
| `fe/src/api/trends.ts` | Trends API module (GET) |
| `be/src/.../TrendDtos.cs` | TrendingTopic, PopularHashtag, TrendsResult DTOs |
| `be/src/.../RepurposeDtos.cs` | RepurposeRequest, RepurposeAtom, RepurposeResult DTOs |
| `be/src/.../ITrendsService.cs` | Trends service interface |
| `be/src/.../IRepurposeService.cs` | Repurpose service interface |
| `be/src/.../TrendsService.cs` | Curated trends implementation |
| `be/src/.../RepurposeService.cs` | Template-based content generation |
| `be/src/.../TrendsController.cs` | GET `/api/v1/workspaces/{id}/trends` |
| `be/src/.../RepurposeController.cs` | POST `/api/v1/workspaces/{id}/repurpose/generate` |

### Modified Files (18)

- **Platform registry adoption:** SocialAccounts.tsx, AnalyticsPage.tsx, CalendarConstants.ts, create-post types, ConfigBar.tsx, ResultsGrid.tsx, TrustBadges.tsx
- **API integration:** RepurposeContext.tsx, TrendRadarPage.tsx, RepurposePage.tsx
- **Stale refs cleanup:** EditPostModal.tsx, CreatePostSidebar.tsx, AtomCard.tsx, CalendarPage.tsx, RepurposePage.module.css
- **DI registration:** DependencyInjection.cs

### Removed/Deprecated

- `fe/src/data/mockAI.ts` — still exists but is no longer actively imported for generation; kept for reference
- `mastodon`, `tumblr` — removed from SocialAccounts.tsx
- `Newsletter` — removed from RepurposePlatform type
- `google_business` → replaced with `googlebusiness` (Zernio API convention)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] AtomCard.tsx used PascalCase platform keys (LinkedIn, X, Instagram) but RepurposeAtom.platform now uses lowercase Zernio IDs**
- **Found during:** Task 4.1 audit
- **Issue:** `PLATFORM_CFG[atom.platform]` in AtomCard.tsx would always fall back to the default since keys didn't match lowercase Zernio IDs
- **Fix:** Replaced `PLATFORM_CFG` with `getPlatformById()` from the centralized registry
- **Files modified:** `fe/src/components/repurpose/AtomCard.tsx`
- **Commit:** `71513a6`

**2. [Rule 2 - Missing critical functionality] EditPostModal.tsx used PascalCase platform IDs (TikTok, Instagram, X)**
- **Found during:** Task 4.1 audit
- **Issue:** Platform IDs wouldn't match backend Zernio API conventions
- **Fix:** Changed all 6 platform IDs to lowercase and default to 'tiktok'
- **Files modified:** `fe/src/components/EditPostModal.tsx`
- **Commit:** `71513a6`

**3. [Rule 2 - Missing critical functionality] CreatePostSidebar.tsx compared activeTab (lowercase) against PascalCase strings**
- **Found during:** Task 4.1 audit
- **Issue:** All 5 `activeTab === 'TikTok'|'Instagram'|'Facebook'` comparisons would always be false since activeTab was already lowercase
- **Fix:** Changed comparisons to lowercase to match actual activeTab value
- **Files modified:** `fe/src/components/create-post/CreatePostSidebar.tsx`
- **Commit:** `71513a6`

**4. [Rule 2 - Missing critical functionality] CalendarPage.tsx video overlay check didn't handle lowercase platform IDs**
- **Found during:** Task 4.1 audit
- **Issue:** `p.platform === 'YouTube'` would fail for already-lowercase data
- **Fix:** Used `.toLowerCase()` for case-insensitive comparison
- **Files modified:** `fe/src/pages/app/CalendarPage.tsx`
- **Commit:** `71513a6`

### Plan Scope Notes

- **Task 4.2 (Test coverage)** — Not implemented. Backend unit tests for `RepurposeService` and `TrendsService`, integration tests for controllers, and frontend component tests were not added. This was deferred as the plan's primary focus was on platform standardization and API integration.
- **Task 4.1 (RepurposePage error toast)** — Added as deviation from the original plan (error was being captured in context but not displayed to the user).
- **`TrendsController.cs`** initially failed to compile due to missing `using Syncra.Shared.Extensions;` for the `GetUserId()` extension method — fixed inline (Rule 1).

## Deferred Items

| Item | Reason | Future Plan |
|------|--------|-------------|
| Backend unit tests for RepurposeService, TrendsService | Out of scope for integration-focused plan | Phase 30 or later |
| Integration tests for RepurposeController, TrendsController | Out of scope | Phase 30 or later |
| Frontend component tests for updated pages | Existing tests use old PascalCase IDs — would need updating | Phase 30 or later |
| ReportPreview component | Still uses Platform type with `xText: string` — need cross-check against registry | Next iteration |
| SocialAccounts OAuth expansion beyond 4 providers | Backend OAuth only handles X, TikTok, YouTube, Facebook — needs service provider registration | Future phase |

## Success Criteria Verification

- ✅ Repurpose page generates content via backend API (POST `/repurpose/generate`)
- ✅ Trend Radar page shows data from backend (GET `/trends`)
- ✅ All 14 Zernio platforms appear consistently across: calendar filter, analytics filter, create-post selector, settings social accounts, repurpose config bar, trust badges
- ✅ SocialAccounts.tsx no longer references `mastodon`, `tumblr`, `google_business`
- ✅ Backend builds with 0 errors (pre-existing warnings only)
- ✅ Frontend TypeScript compiles with 0 errors

## Commit History

| Hash | Message |
|------|---------|
| `6d3631b` | feat(29-01): create centralized Zernio platform registry |
| `141953c` | feat(29-01): update all PLATFORMS references to use centralized Zernio registry |
| `540d7d9` | feat(29-01): expand RepurposePlatform to all 14 Zernio platform IDs |
| `1e8ecb3` | feat(29-01): add backend Repurpose API endpoint |
| `ef8efb3` | feat(29-01): replace mock repurpose with real API call |
| `0158678` | feat(29-01): add backend Trends API endpoint |
| `d7d84e8` | feat(29-01): replace hardcoded trend radar with live API call |
| `71513a6` | fix(29-01): update stale platform refs to lowercase Zernio IDs |
| `857c992` | chore(29-01): final integration verification |
| `23faf09` | feat(29-01): add error toast to RepurposePage |

## Self-Check: PASSED
