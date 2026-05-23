# Project Retrospective: Syncra.NET

## Milestone: v1.1 � Reliable Payments & Provider Abstraction

**Shipped:** 2026-05-01
**Phases:** 4 | **Plans:** 15

### What Was Built
- Unified IPaymentProvider abstraction allowing for future gateway expansions.
- High-reliability webhook orchestrator with Redis distributed locking and idempotency.
- Integrated "Settings -> Billing" UI in the React frontend with full Stripe lifecycle management.
- Operational runbooks for billing support and troubleshooting.

### What Worked
- **Parallel Research/Plan:** Splitting backend hardening and frontend data layer allowed for rapid implementation.
- **UAT Checklist:** Having a pre-defined manual test suite ensured all edge cases (canceled checkout, portal returns) were covered.
- **Redis for Idempotency:** Using Redis instead of just DB-level constraints provided a much cleaner way to handle concurrent webhook deliveries.

### What Was Inefficient
- **Plan Entity Refactor:** We had to revisit the Plan entity multiple times to get the Stripe mapping right (Monthly vs Yearly price IDs). This could have been consolidated earlier.

### Patterns Established
- **Timestamp Guards:** Using EventCreatedAtUtc as a guard against out-of-order state updates.
- **Provider Registry:** Pattern for resolving infrastructure services by tenant or configuration.

### Key Lessons
- Stripe's "Product" vs "Price" hierarchy needs careful mapping to internal "Plan" entities to avoid confusion in multi-interval billing.
- Frontend "Refresh Signaling" via query params is a simple but effective way to ensure consistent state after external redirects.

---

## Milestone: v1.0 � Stability

**Shipped:** 2026-04-27
**Phases:** 3 | **Plans:** 12

### What Was Built
- Foundation hardening (JWT, Multi-tenancy).
- Performance optimizations (Redis caching, EF Core query tuning).
- Quality & Observability (Sentry, Serilog, S3/R2 storage).

## Milestone: v1.3 — Performance & Analytics Optimization

**Shipped:** 2026-05-13
**Phases:** 2 | **Plans:** 9

### What Was Built
- Composite database indexes on Posts and AuditLogs for analytics acceleration.
- Query projections using `.Select()` + `.AsNoTracking()` eliminating unnecessary Media entity loading.
- Redis-backed `AnalyticsCacheService` with cache-aside pattern and invalidation on publish.
- CSV analytics export with 3-section output (Summary, Heatmap, Posts) and date presets (7d/30d/90d/YTD) + custom dates.
- EF Core concurrency crash fix in export pipeline — sequential `await` replaced `Task.WhenAll`.

### What Worked
- **Focused Scope:** Keeping v1.3 to just performance and analytics allowed rapid delivery in ~1.5 days.
- **UAT-Driven Verification:** Phase 12 UAT (8/8) and Phase 13 (19/19 tests) provided clear completion criteria.
- **Cache-aside Pattern:** Simple, reliable caching without over-engineering — cache miss → populate → serve pattern minimized complexity.
- **Single Responsibility Fix:** The concurrency crash fix was a clean, minimal change with clear root cause.

### What Was Inefficient
- **Quick Tasks Interruption:** A quick-task commit interrupted the v1.3 commit flow — minor context cost.

### Patterns Established
- **Projected Query Pattern:** `.Select()` + `.AsNoTracking()` for read-only analytics paths — applied consistently across all analytics queries.
- **Cache Invalidation on Domain Events:** Invalidation triggered by `PublishService` on successful publication — deterministic and testable.

### Key Lessons
- EF Core's scoped DbContext is not thread-safe — avoid `Task.WhenAll` on operations sharing the same context.
- CSV is a pragmatic export format — much simpler than PDF and sufficient for analytics data.
- Date range resolution with precedence rules (days > custom) avoids ambiguous API behavior.

### Cost Observations
- Quick vertical slice (2 phases, 9 plans) completed in ~1.5 days
- Efficient execution due to clear scope boundaries

---

## Milestone: v1.5 — Google Auth & Account Linking

**Shipped:** 2026-05-18
**Phases:** 8 | **Plans:** 24

### What Was Built
- Google OAuth login/signup with IAuthProvider multi-provider abstraction and ExternalLogin entity
- Account linking with collision detection, password verification, and unlink in Settings
- PostgreSQL + Redis token storage with lazy refresh and revocation detection
- WCAG 2.2 AA compliant LoginModal with focus trapping, ARIA labels, and keyboard navigation
- Allow apostrophes and special characters in workspace names
- Forgot/reset password flow with Postmark emails, SHA256 token hashing, rate limiting
- Change password in Settings with SecurityStamp JWT session invalidation
- Email verification after registration with auto-login, expired token recovery, resend UI

### What Worked
- **Vertical Slices per Wave:** Each phase split into backend → frontend waves kept momentum high
- **SecurityStamp Pattern:** Clean solution for stateless JWT revocation — embedded GUID validated on each request
- **UAT Gap Closure:** UAT Test 5 failure (old JWT still valid) was caught early and fixed in dedicated 21-04 plan
- **Postmark Integration:** Reused existing email service abstraction — zero friction adding reset/verification templates

### What Was Inefficient
- **UAT Debt Accumulation:** Phase 15 UAT left Tests 4-5 pending and Test 7 partial — accumulated until milestone close
- **Stale Todos:** 3 todos remained pending after features were implemented — cleanup needed at close
- **Scope Creep:** v1.5 started as 5 phases (15-19) but grew to 8 phases (15-22) with auth enhancements
- **Missing Phase 18 in Progress Table:** Phase 18 was complete but not reflected in ROADMAP progress table until close

### Patterns Established
- **SecurityStamp for Token Revocation:** GUID stamp in User entity → embedded in JWT → validated via OnTokenValidated handler
- **Email Verification Auto-Login:** Verified users get JWT session directly, no manual login step
- **OAuth Skip Verification:** Provider-authenticated users auto-verified at signup
- **SHA256 Token Hashing:** Reset/verification tokens stored as hashes, not plaintext

### Key Lessons
- Stateless JWTs need a server-side revocation mechanism (SecurityStamp) for password changes
- Rate limiting on email endpoints (1 req/email/60s) prevents abuse but must return generic responses
- Focus trap implementation (Phase 19) should be part of initial modal development, not a separate phase
- Email verification flow is simpler when integrated into registration rather than bolted on after

### Cost Observations
- Model mix: Heavy opus usage for planning, sonnet for execution
- Sessions: ~3 days (2026-05-16 → 2026-05-18) for 8 phases, 24 plans
- Notable: Scope doubled from original 5 phases but velocity remained high due to auth domain familiarity

---

## Milestone: v1.6 — Logging & Observability

**Shipped:** 2026-05-23
**Phases:** 1 | **Plans:** 3

### What Was Built
- Production Serilog pipeline with async-wrapped rolling JSON file logging (daily rotation, 30-day retention, 100MB limit)
- Environment-aware configuration — compact JSON in production, human-readable console at Debug level in development
- Request-scoped UserId enrichment via middleware (ClaimTypes.NameIdentifier fallback to OIDC sub claim)
- Environment, MachineName, Application properties on every log event
- SensitiveDataDestructuringPolicies for 8 auth command types — passwords/tokens redacted to `***REDACTED***`
- RequestBodyRedactionMiddleware with JSON parsing, field redaction, and stream rewinding (1MB size guard)
- Extended RedactingEnricher keyword list from 5 to 15 entries with snake_case and camelCase variants

### What Worked
- **Rapid Execution:** Single phase, 2 plans completed in ~1 hour — focused scope with no cross-cutting concerns
- **IDestructuringPolicy Discovery:** Generic `DestructuringPolicy<T>` pattern emerged as clean, type-safe approach
- **Deviation Auto-Fix:** Compilation error on Destructure API signature was caught and fixed within same session — no context switching
- **No Scope Creep:** Clear boundary between base logging (Plan 01) and security redaction (Plan 02) kept focus tight

### What Was Inefficient
- **Overarching PLAN.md Artifact:** Master PLAN.md (13 items) decomposed into 23-01 and 23-02, but PLAN.md was left behind without SUMMARY — caused false tracking of "3rd pending plan"
- **Manual Tracking Cleanup Needed:** ROADMAP.md and STATE.md needed manual updates after execution to reflect true completion

### Patterns Established
- **Nullable-Enforced Stream Rewinding:** RequestBodyRedactionMiddleware uses explicit null guard before Position = 0
- **Safe JSON Fallback:** Non-JSON bodies pass through unchanged rather than breaking the request

### Key Lessons
- An overarching PLAN.md should either be deleted or given a SUMMARY when sub-plans replace it — leftover artifacts break automated tracking
- Destructure.With() accepts IDestructuringPolicy, not a LoggerConfiguration delegate — test API compilation before committing to pattern
- 1MB body size limit is a pragmatic guard against memory pressure on file uploads in redaction middleware

### Cost Observations
- Phase 23 completed in a single session (~17 min for 2 plans, 18 tasks, 19 files)
- Most efficient milestone to date — 1 phase, no cross-phase coordination needed

---

## Cross-Milestone Trends

| Milestone | Velocity (Plans/Day) | Quality (Passing Tests) |
|-----------|----------------------|-------------------------|
| v1.0      | 4.0                  | 100% (95/95)            |
| v1.1      | 3.75                 | 100% (105/105)          |
| v1.3      | 6.0                  | 100% (19/19)            |
| v1.5      | 8.0                  | 100% (all UAT passed)   |
| v1.6      | 3.0                  | 100% (build verified)  |
