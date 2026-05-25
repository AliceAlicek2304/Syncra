# Codebase Concerns

**Analysis Date:** 2026-05-25

## Tech Debt

### localStorage-based Post Persistence Instead of Server API

**Issue:** The calendar context (`CalendarContext.tsx`) uses `localStorage` as the primary data store for scheduled posts, with `JSON.parse`/`JSON.stringify` serialization. Errors are swallowed with only `console.error`.

**Files:**
- `fe/src/context/CalendarContext.tsx` (lines 9-27)
- `fe/src/context/calendarContextBase.ts`

**Impact:** Posts created through the calendar flow are never persisted to the backend API. Data is lost on browser cache clear or device change. The production API endpoint (`fe/src/api/posts.ts`) exists but is only used by `useCalendarPosts.ts` — the CalendarContext does not use it at all.

**Fix approach:** Migrate `CalendarProvider` to use TanStack Query mutations against `postsApi` (already wired up in `useCalendarPosts.ts`), then make `CalendarPage.tsx` the single source of truth.

### Mock Data Pervades Production UI

**Issue:** Multiple pages serve hardcoded mock data instead of calling real API endpoints. Features appear functional but return canned responses.

**Files:**
- `fe/src/data/mockAI.ts` — 274 lines of mock AI results (`MOCK_AI_RESULTS`, `MOCK_REPURPOSE_ATOMS`)
- `fe/src/data/mockCoachTrends.ts` — 332 lines of mock trend data
- `fe/src/pages/app/DashboardPage.tsx` (line 33) — `QUICK_STATS` hardcoded, query returns fake data after 1s delay
- `fe/src/pages/app/AnalyticsPage.tsx` (lines 10-17) — `PLATFORMS_DATA` hardcoded, `INSIGHTS` mocked
- `fe/src/pages/app/HelpPage.tsx` — FAQ and search data hardcoded
- `fe/src/components/create-post/useCreatePostState.ts` (line 4) — imports `getMockResults` from `mockAI`

**Impact:** Users see fabricated analytics and AI suggestions. No backend integration is validated for these features. The UI creates an illusion of working features.

**Fix approach:** Replace each mock source with real TanStack Query calls. Remove mock data imports once backend endpoints are verified.

### GlassUpload Component is a UI Stub

**Issue:** `fe/src/components/GlassUpload.tsx` shows a polished drag-and-drop overlay but only calls `alert()` and `console.log` on drop. The full upload pipeline (presign, R2 upload, confirm) is wired up in `useR2Upload.ts` and `mediaApi` but not connected.

**File:** `fe/src/components/GlassUpload.tsx` (line 42-43)

**Impact:** Users can drag files but get a "Tính năng upload đang được tích hợp" alert. The upload UI exists before the integration is complete.

**Fix approach:** Wire `GlassUpload` to `useR2Upload` and `mediaApi.presignUpload`/`confirmUpload`.

### Fire-and-Forget Cache Eviction

**Issue:** `PublishService.cs` uses fire-and-forget tasks (`_ = _cache.RemoveAsync(...)`) for analytics cache invalidation. Exceptions are silently swallowed.

**Files:**
- `be/src/Syncra.Application/Services/PublishService.cs` (lines 181-182)

**Impact:** If Redis is unreachable, cache entries are not invalidated. The error is invisible. Stale analytics data persists until TTL expiry.

**Fix approach:** Await the cache operations in a background job or use a reliable pub/sub invalidation pattern. At minimum, log failures.

### IdempotencyFilter RequestHash is Empty

**Issue:** The `IdempotencyFilter` stores `RequestHash = string.Empty` instead of hashing the request body. This means the idempotency key can be reused with different payloads and return the old cached response.

**File:** `be/src/Syncra.Api/Filters/IdempotencyFilter.cs` (line 99)

**Impact:** Idempotency keys are not bound to request content. A client sending different request bodies with the same key gets a mismatched cached response.

**Fix approach:** Compute `SHA256(payload)` and store it. On repeat requests, compare hash and return 409 if mismatched.

### Large Component Files (Complexity Hotspots)

**Issue:** Several UI files exceed reasonable complexity thresholds, mixing rendering, state management, and business logic in single files.

**Files:**
- `fe/src/pages/app/CalendarPage.tsx` — 939 lines, ~21 `useState`/`useMemo`/`useCallback` calls, embedded component definitions (`VisualCard`), three view modes (month/week/day), drag-and-drop, tooltips, and detail panel
- `fe/src/pages/app/IdeasPage.tsx` — 606 lines, drag-and-drop kanban board with multiple nested sub-components
- `fe/src/components/create-post/useCreatePostState.ts` — 517 lines, single hook managing 20+ state variables
- `fe/src/components/AIIdeaGenerator.tsx` — 505 lines with multi-step wizard
- `fe/src/pages/app/HelpPage.tsx` — 489 lines of hardcoded FAQ/category data

**Impact:** Difficult to test, refactor, or reason about. High cognitive load for new contributors. Components cannot be reused.

**Fix approach:** Extract sub-components and custom hooks. Move hardcoded data to separate files. Aim for <300 lines per file.

### eslint-disable Suppressions

**Issue:** Multiple files disable React hooks lint rules and refresh export rules, indicating structural issues.

**Files:**
- `fe/src/pages/app/CalendarPage.tsx` (line 314) — `react-hooks/exhaustive-deps`
- `fe/src/components/MultiPlatformEditor.tsx` (line 74) — `react-hooks/exhaustive-deps`
- `fe/src/components/EditPostModal.tsx` (line 45) — `react-hooks/set-state-in-effect`
- `fe/src/components/create-post/CreatePostEditor.tsx` (line 1) — full-file `react-hooks/refs`
- `fe/src/context/AuthContext.tsx`, `WorkspaceContext.tsx`, `ToastContext.tsx`, `BillingContext.tsx`, `createPostModalContext.tsx` — all suppress `react-refresh/only-export-components`

**Impact:** Lint rules exist to prevent bugs. Suppressing them hides real issues like missing dependencies in `useEffect`/`useCallback`.

**Fix approach:** Remove each suppression and fix the underlying dependency array or export structure.

---

## Security Considerations

### JWT Access Token Stored in localStorage

**Issue:** The access token (`syncra_access_token`) is persisted in `localStorage` and read on every API call. `localStorage` is accessible to any JavaScript executed in the same origin, making it vulnerable to XSS attacks.

**Files:**
- `fe/src/lib/axios.ts` (line 11)
- `fe/src/context/AuthContext.tsx` (lines 21, 28, 40, 50)
- `fe/src/utils/api.ts` (line 6)
- `fe/src/hooks/useNotificationHub.ts` (line 76)

**Impact:** Any XSS vulnerability (e.g., in user-generated content previews) compromises all tokens. Attacker can exfiltrate tokens and impersonate users.

**Recommendations:**
- Use httpOnly, Secure, SameSite cookies for token storage instead of localStorage
- Or store the token in an in-memory variable and use a refresh token flow with httpOnly cookie

### X OAuth Provider Uses Static PKCE Code Verifier with "plain" Method

**Issue:** `XOAuthProvider.cs` defines a hardcoded `CodeVerifier` constant and uses `code_challenge_method=plain`. The code verifier is a static, predictable string rather than a per-request generated secret.

**File:** `be/src/Syncra.Infrastructure/Social/Providers/XOAuthProvider.cs` (lines 18-19, 36)

**Impact:** PKCE protection is rendered ineffective. An attacker intercepting the authorization code can compute the code verifier trivially, bypassing the authorization code exchange protection.

**Recommendations:**
- Generate a cryptographically random code verifier per authorization request
- Store the challenge (hashed with S256) in the auth state
- Use `code_challenge_method=S256` instead of `plain`

### Test User Password in Seed Migration

**Issue:** The test user seed migration hardcodes `password = "Test@12345"` and stores it as a raw string in a migration file comment. While the database stores a BCrypt hash, anyone with access to the migration source can see the plaintext password.

**File:** `be/src/Syncra.Infrastructure/Persistence/Seed/UserSeedData.cs` (lines 9, 13)

**Impact:** Low severity in development, but this seed data could leak into production migrations. The plaintext password is visible in the git history.

**Recommendations:**
- Remove the password comment from code
- Use environment-specific seeding only in development
- Ensure this seed migration is not applied in production

### Sensitive Configuration as Plain Properties

**Issue:** Options classes for Stripe, Redis, and PostgreSQL store secrets as plain `string` properties. While these are bound from `IConfiguration` (not hardcoded), the connection string for Postgres is constructed by string concatenation.

**Files:**
- `be/src/Syncra.Application/Options/StripeOptions.cs` — `SecretKey`, `WebhookSecret`
- `be/src/Syncra.Application/Options/RedisOptions.cs` — `Password`, connection string construction using string interpolation
- `be/src/Syncra.Application/Options/PostgresOptions.cs` — `Password`, connection string via `$"Host={Host};Port={Port};..."`

**Impact:** Connection strings containing passwords risk exposure in exception messages, logging, or if the options object is serialized/returned in error responses. The `RedactingEnricher` only checks specific property names (`password`, `secret`) but not the connection strings themselves.

**Recommendations:**
- Use `DbContextOptions` construction inside the DI registration, not in the options class
- Use Managed Identity (Azure) or similar for production instead of connection string passwords
- Add a `SensitiveDataMasker` to the logging pipeline

---

## Performance Bottlenecks

### IntegrationTokenRefreshService Loads All Integrations

**Problem:** `RefreshExpiringIntegrationsAsync` calls `_integrationRepository.GetAllAsync()` which loads ALL integrations from the database into memory before filtering.

**File:** `be/src/Syncra.Application/Services/IntegrationTokenRefreshService.cs` (line 41)

**Cause:** The repository method returns `IEnumerable<Integration>` with no server-side filtering.

**Improvement path:** Add a `GetExpiringIntegrationsAsync(DateTime refreshBeforeUtc)` repository method that pushes the date filter to the database query.

### Unpaginated Notifications Polling

**Problem:** `useNotificationHub.ts` fetches notifications with `take: 50` hardcoded but no pagination or cursor-based fetching. As notification volume grows, this will fetch increasingly large payloads.

**File:** `fe/src/hooks/useNotificationHub.ts` (lines 18-22)

**Improvement path:** Add cursor-based pagination with `before`/`after` parameters. Only fetch unread and recent (last 7 days) notifications by default.

### Heavy CalendarPage Re-renders

**Problem:** `CalendarPage.tsx` has 21 state variables, multiple `useMemo` dependencies, and embedded component definitions (`VisualCard` defined inside the component body). Every state change triggers re-renders of the entire calendar grid.

**File:** `fe/src/pages/app/CalendarPage.tsx` (939 lines)

**Improvement path:**
- Extract `VisualCard`, `renderPostPill`, and view renderers to separate `React.memo` components
- Virtualize the calendar grid for months with many posts
- Split into smaller page sections (calendar header, grid body, detail panel)

---

## Fragile Areas

### CalendarPage.tsx — Single Point of Failure

**File:** `fe/src/pages/app/CalendarPage.tsx` (939 lines)

**Why fragile:** 939 lines of mixed concerns — view rendering (month/week/day), drag-and-drop, state management, API integration via `useCalendarPosts`, localStorage posts via `CalendarContext`, filtering, navigation, tooltip positioning, and inline error handling. The component defines `VisualCard` as an inner component, which is re-created on every render and breaks React reconciliation.

**Safe modification:**
- Extract `VisualCard`, month/week/day view renderers into separate files
- Move inline styles and gradient definitions to constants or CSS modules
- Add unit tests for each extracted component

**Test coverage:** No unit tests exist for `CalendarPage.tsx`. E2E tests (`phase11-core-flows.spec.ts`) exercise basic flows but don't cover edge cases (empty states, error states, drag-and-drop).

### IdeasPage.tsx — Complex Drag-and-Drop Kanban

**File:** `fe/src/pages/app/IdeasPage.tsx` (606 lines)

**Why fragile:** Integrates `@dnd-kit` (`DndContext`, `SortableContext`, drag overlays), TanStack Query mutations with optimistic updates, and inline `IdeaCard`/`GroupCard` sub-components. The drag-and-drop state management is tightly coupled with the page component.

**Safe modification:**
- Extract kanban board logic into a custom hook (`useIdeaBoard`)
- Separate `IdeaCard` and `GroupCard` into their own files
- Add tests for drag-and-drop state transitions

**Test coverage:** One test file (`fe/src/api/ideas.test.ts`) tests the API layer only. No component tests exist.

### Social Provider OAuth Implementations

**Files:**
- `be/src/Syncra.Infrastructure/Social/Providers/FacebookProvider.cs` (280 lines)
- `be/src/Syncra.Infrastructure/Social/Providers/XOAuthProvider.cs` (169 lines)
- `be/src/Syncra.Infrastructure/Social/Providers/TikTokOAuthProvider.cs`
- `be/src/Syncra.Infrastructure/Social/Providers/YouTubeProvider.cs`

**Why fragile:** Each provider implements custom OAuth 2.0 flows with platform-specific quirks (Facebook's long-lived token exchange, X's PKCE, TikTok's special fields). Providers have `catch {}` / `catch { /* ignore */ }` blocks that swallow profile-fetching errors, masking integration failures. Facebook and X use hardcoded API version strings (`v20.0`, `v25.0`) that will become stale.

**Safe modification:**
- Add structured logging to catch blocks instead of swallowing
- Extract API version strings to configuration
- Add unit tests with HTTP mock handlers for each provider
- Implement retry with Polly (package already referenced: `Microsoft.Extensions.Http.Polly`)

**Test coverage:** Unit tests exist for publish adapters (TikTok, X, YouTube) but only in the `be/tests/` directory. No tests for OAuth flow error states.

---

## Scaling Limits

### Single-Threaded Job Execution

**System:** Hangfire recurring jobs — `IntegrationTokenRefreshJob` and `DuePostPublishJob`.

**Files:**
- `be/src/Syncra.Infrastructure/Jobs/IntegrationTokenRefreshJob.cs`
- `be/src/Syncra.Infrastructure/Jobs/DuePostPublishJob.cs`

**Current capacity:** Single server, single Hangfire worker processing jobs sequentially per queue.

**Limit:** As user base grows, token refresh (looping through all integrations) and due-post publishing could take hours. No horizontal scaling (multiple server instances) configured.

**Scaling path:**
- Use Hangfire's `[DisableConcurrentExecution]` for safety, then enable multiple workers
- Partition jobs by workspace ID for parallel processing
- Add a cluster mode with shared PostgreSQL-backed state

---

## Test Coverage Gaps

### Frontend: 11 Unit Tests for 104 Source Files

**What's not tested:**
- All page components (CalendarPage, DashboardPage, IdeasPage, AnalyticsPage, etc.)
- All hooks except `useR2Upload` (no tests for `useCalendarPosts`, `useAnalyticsSummary`, `useNotificationHub`, `useSettings`)
- All context providers except `AuthContext` (no tests for `CalendarContext`, `WorkspaceContext`, `ToastContext`, `RepurposeContext`, etc.)
- Social preview components, AI coach, billing section
- The repurpose engine components

**Files with tests:**
- `fe/src/api/*.test.ts` (5 files — API layer only)
- `fe/src/components/PageWrapper.test.tsx`, `ProtectedRoute.test.tsx`, `SkeletonLoader.test.tsx`, `WidgetErrorFallback.test.tsx`
- `fe/src/context/AuthContext.test.tsx`
- `fe/src/hooks/useR2Upload.test.ts`

**Risk:** Core user flows (creating posts, scheduling, viewing calendar, AI generation) have no automated test coverage. Regressions can go undetected.

**Priority:** High

### Backend: Narrow Test Coverage Focus

**What's not tested:**
- Social provider OAuth implementations (FacebookProvider, XOAuthProvider, TikTokOAuthProvider, YouTubeProvider)
- PublishAdapterRegistry, AnalyticsAdapterRegistry
- IdempotencyFilter error cases
- NotificationDispatcher
- TenantResolutionMiddleware error paths (malformed GUID, non-existent workspace)
- CorrelationIdMiddleware

**What IS tested:**
- Domain value objects and entities (Post, ValueObjects)
- Post/CUD command handlers
- Auth command handlers (Login, Register)
- PublishService and WorkspaceAnalyticsService
- Subscription command handlers
- Infrastructure adapters (TikTok, X, YouTube publish adapters)
- Stripe/StripeService, SubscriptionRepository, PostRepository

**Risk:** OAuth integration points (where third-party API calls happen) have zero test coverage. Any change to provider implementations risks breaking OAuth flows for users.

**Priority:** Medium

### E2E Test Coverage

**What's tested:** 5 Playwright spec files covering UAT flows (phase8-10) and animation/core flows (phase11).

**Files:**
- `fe/tests/e2e/phase8-uat.spec.ts`
- `fe/tests/e2e/phase9-uat.spec.ts`
- `fe/tests/e2e/phase10-uat.spec.ts`
- `fe/tests/e2e/phase11-core-flows.spec.ts`
- `fe/tests/e2e/phase11-animations.spec.ts`

**Gap:** E2E tests run against mock/static data and do not validate real backend integration. No auth flow E2E coverage end-to-end.

---

## Missing Critical Features

### No Rate Limiting on Auth Endpoints

**Problem:** The `AuthController` has no rate limiting. Brute-force password attacks are not mitigated at the application layer.

**Files:** `be/src/Syncra.Api/Controllers/AuthController.cs`

**Blocks:** Production security baseline.

### Upload Feature Not Functional

**Problem:** `GlassUpload.tsx` (drag-and-drop overlay) and the full upload pipeline (presign → R2 → confirm) are partially wired but not connected. The UI shows a polished drop zone but does not actually upload files.

**Files:** `fe/src/components/GlassUpload.tsx`, `fe/src/hooks/useR2Upload.ts`, `fe/src/api/media.ts`, `fe/src/pages/app/MediaLibraryPage.tsx`

**Blocks:** Media library creation and post attachment workflows.

---

*Concerns audit: 2026-05-25*
