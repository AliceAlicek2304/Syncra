# Milestones: Syncra.NET

## v1.6 Logging & Observability (Shipped: 2026-05-23)

**Phases completed:** 1 phase (Phase 23), 3 plans, 18 tasks

**Key accomplishments:**

1. Production Serilog pipeline with async-wrapped rolling JSON file logging (daily rotation, 30-day retention, 100MB limit)
2. Environment-aware configuration — JSON in production, human-readable console at Debug level in development
3. Request-scoped UserId enrichment via middleware with fallback to OIDC `sub` claim
4. SensitiveDataDestructuringPolicies for 8 auth commands — passwords/tokens redacted to `***REDACTED***`
5. RequestBodyRedactionMiddleware with JSON parsing, sensitive field redaction, and stream rewinding
6. Extended RedactingEnricher keyword list from 5 to 15 entries (snake_case and camelCase variants)
7. Environment, MachineName, Application properties on every log event

**Stats:**

- Commits: 8 (feature) + 1 (merge)
- Files changed: 19 (created: 3, modified: 16)
- LOC: +686 / -33
- Duration: 2026-05-19 → 2026-05-20 (~1 day)

**Known deferred items at close:** 7 (see STATE.md Deferred Items)

---

## v1.5 Google Auth & Account Linking (Shipped: 2026-05-18)

**Phases completed:** 8 phases, 24 plans, 17 tasks

**Key accomplishments:**

1. Google OAuth login/signup with IAuthProvider multi-provider abstraction and ExternalLogin entity
2. Account linking with collision detection, password verification, and unlink in Settings
3. PostgreSQL + Redis token storage with lazy refresh and revocation detection
4. WCAG 2.2 AA compliant LoginModal with focus trapping, ARIA labels, and keyboard navigation via useFocusTrap hook
5. Allow apostrophes and special characters in workspace names (full stack)
6. Forgot/reset password flow with Postmark emails, SHA256 token hashing, rate limiting, and session invalidation
7. Change password in Settings with SecurityStamp JWT invalidation — all sessions revoked on password change
8. Email verification after registration with auto-login, expired token recovery, and resend UI in Settings

---

## v1.1 — Reliable Payments & Provider Abstraction

**Target:** 2026-05-15
**Status:** Planning

**Must-haves:**

1. Payment-provider abstraction (`IPaymentProvider` + registry)
2. Stripe/local DB data consistency (plans, customers, subscriptions)
3. Webhook reliability with idempotent processing
4. Frontend Checkout + Customer Portal flow for billing management
5. `.planning` documentation updated for the payment module

**Non-goals:**

1. No second payment gateway
2. No complex promotions logic

---

## v1.3 — Performance & Analytics Optimization

**Shipped:** 2026-05-13

**Scope:** 2 phases (12-13), 9 plans, all complete

**Key Accomplishments:**

1. Created composite DB indexes on `Posts(WorkspaceId, Status, PublishedAtUtc)` and `AuditLogs(WorkspaceId, CreatedAtUtc)` for analytics acceleration
2. Refactored analytics queries to use `.Select()` projections with `.AsNoTracking()`, eliminating unnecessary `Include(Media)` overhead
3. Implemented `AnalyticsCacheService` with Redis-backed cache-aside pattern (60-min TTL), cache invalidation on publish
4. Built 3-section CSV export (Summary, Heatmap, Posts) with date presets (7d/30d/90d/YTD) and custom date range
5. Fixed EF Core concurrency crash (`InvalidOperationException`) in CSV export by replacing `Task.WhenAll` with sequential `await`
6. Achieved 19/19 analytics tests passing, UAT complete for both phases

**Stats:**

- Commits: 8 (feature) + 2 (archive)
- Files changed: 53
- LOC: +3,010 / -565
- Duration: 2026-05-12 → 2026-05-13 (~1.5 days)

**Known Gaps:** None

**Deferred Items:** None

---

## v1.0 — Stability

**Shipped:** 2026-04-27
**Branch:** `improve-be`
**PR:** #14 — https://github.com/AliceAlicek2304/Syncra/pull/14

**Scope:** 3 phases, 12 plans, 13 task summaries

**Key Accomplishments:**

1. Hardened Stripe billing pipeline — idempotent webhooks, stateless service, signature validation
2. Optimized tenant resolution — Redis-cached `WorkspaceMember` lookups with 1h TTL
3. Database-level query optimization — eliminated in-memory filtering in `PostRepository`
4. Introduced `Result<T>` pattern across analytics services with standardized HTTP mapping
5. Decoupled services from environment variables via `IOptions<AnalyticsOptions>`
6. Built integration health tracking with 3-tier failure ladder and precedence rules
7. Achieved stable test suite — 95 passing tests across controllers, services, and domain

**Stats:**

- Commits: 155
- Files changed: 495
- LOC: ~39,266
- Duration: 2026-02-24 → 2026-04-27 (~62 days)

**Known Gaps:** None

**Deferred Items:** None

---

_For milestone archives, see `.planning/milestones/v1.0-ROADMAP.md` and `.planning/milestones/v1.0-REQUIREMENTS.md`_
