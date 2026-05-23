# Project: Syncra.NET

## Vision
Syncra.NET is a social media scheduling and management platform backend built with .NET 8. It aims to provide a robust, scalable, and multi-tenant API for managing social media accounts, scheduling posts, and analyzing performance.

## Current State

**Active:** Planning v2.0

**Shipped:**
- <details><summary>v1.6 Logging & Observability (2026-05-20)</summary>Production Serilog pipeline with rolling JSON file logging, sensitive data destructuring, request body redaction middleware, UserId enrichment, and structured log properties (Environment, MachineName, Application).</details>
- <details><summary>v1.5 Google Auth & Account Linking (2026-05-18)</summary>Google OAuth login/signup, account linking with collision detection, PostgreSQL+Redis token storage with auto-refresh, WCAG 2.2 AA accessible LoginModal, forgot/reset password flow with Postmark emails, change password in Settings with SecurityStamp session invalidation, email verification after registration with auto-login.</details>
- <details><summary>v1.4 Code Quality & Tech Debt (2026-05-14)</summary>Dashboard code quality fixes, component extraction, ESLint zero-warnings policy, test coverage for critical flows.</details>
- <details><summary>v1.3 Performance & Analytics Optimization (2026-05-13)</summary>Database indexes for analytics, query projections (no Media Include), Redis-backed cache-aside pattern with 60-min TTL, cache invalidation on publish, CSV analytics export with presets (7d/30d/90d/YTD) + custom dates, concurrency fix for EF Core in export pipeline.</details>
- <details><summary>v1.2 Update the FE (2026-05-08)</summary>High-fidelity frontend with Framer Motion animations, robust error handling, perceived performance polish via Skeleton Loaders, and full E2E test coverage.</details>
- <details><summary>v1.1 Reliable Payments & Provider Abstraction (2026-05-01)</summary>Delivered a robust billing engine with IPaymentProvider abstraction, Redis-backed webhook idempotency, and a complete frontend Billing UX.</details>
- <details><summary>v1.0 Stability (2026-04-27)</summary>Hardened foundation, tenant resolution optimization, and comprehensive test coverage.</details>

## Core Tech Stack
- **Framework:** .NET 8 / ASP.NET Core
- **Frontend:** React (TypeScript) + Vite + Vanilla CSS
- **Database:** PostgreSQL with EF Core 8
- **Cache:** Redis
- **Security:** JWT + OAuth 2.0
- **Integrations:** Stripe (Billing), OpenAI (AI Features), Cloudflare R2 (Media), Postmark (Email), Google OAuth

## Requirements

### Validated
- ✓ AUTH-01: Google OAuth login — v1.5 (Phase 15)
- ✓ AUTH-02: Google OAuth signup with profile import — v1.5 (Phase 15)
- ✓ AUTH-03: Multi-provider architecture (IAuthProvider) — v1.5 (Phase 15)
- ✓ AUTH-04: OAuth callback handling — v1.5 (Phase 15)
- ✓ AUTH-05: Change password (authenticated) — v1.5 (Phase 21)
- ✓ AUTH-06: Set password for OAuth-only accounts — v1.5 (Phase 21)
- ✓ LINK-01: Collision detection on email match — v1.5 (Phase 16)
- ✓ LINK-02: Password-verified account linking — v1.5 (Phase 16)
- ✓ LINK-03: View linked accounts in settings — v1.5 (Phase 16)
- ✓ LINK-04: Unlink accounts — v1.5 (Phase 16)
- ✓ TOKEN-01: Token persistence (PostgreSQL + Redis) — v1.5 (Phase 17)
- ✓ TOKEN-02: Auto-refresh before expiry — v1.5 (Phase 17)
- ✓ TOKEN-03: Revocation detection and UX — v1.5 (Phase 17)
- ✓ A11Y-01: Focus trap in LoginModal — v1.5 (Phase 19)
- ✓ A11Y-02: ARIA labels on interactive elements — v1.5 (Phase 19)
- ✓ A11Y-03: Keyboard navigation — v1.5 (Phase 19)
- ✓ REQ-12.1: Database Query Optimization — v1.3 (Phase 12)
- ✓ REQ-12.2: Redis Caching Layer — v1.3 (Phase 12)
- ✓ REQ-13.1: Advanced Analytics Reporting (CSV) — v1.3 (Phase 13)
- ✓ v1.2 Frontend UI/UX (High Fidelity) – v1.2 (Phase 11)
- ✓ v1.2 API Integration – v1.2 (Phase 11)
- ✓ v1.2 E2E Flow Testing – v1.2 (Phase 11)
- ✓ REQ-1.1: Payment Provider Abstraction – v1.1
- ✓ REQ-2.1: Stripe Data Consistency – v1.1
- ✓ REQ-3.1: Webhook Reliability & Idempotency – v1.1
- ✓ REQ-4.1: Frontend Billing UX – v1.1
- ✓ REQ-5.1: Technical Documentation – v1.1
- ✓ Foundation Hardening – v1.0
- ✓ Tenant Resolution – v1.0

### Active
- [ ] Webhook reliability & idempotency (Phase 06 — researched, not yet planned)
- [ ] Billing UX documentation (Phase 07 — pending)
- [ ] v2.0 planning (next milestone)

### Out of Scope
- Google Calendar integration — user removed from v1.5 scope
- Additional auth providers (GitHub, Microsoft, Apple) — deferred to v2.0
- Mobile app — web-first approach

## Key Decisions

| Decision | Status | Outcome |
|----------|--------|---------|
| SecurityStamp for JWT Revocation | Good | Password change invalidates all sessions via GUID stamp in JWT + OnTokenValidated handler |
| Email Verification Auto-Login | Good | Verified users land in dashboard with valid JWT, no manual login needed |
| OAuth Users Skip Verification | Good | Google/OAuth users auto-verified at signup |
| Postmark for Transactional Emails | Good | Password reset, verification, change confirmation all via Postmark |
| No ASP.NET Core Identity | Good | Google OAuth integrated with existing custom JWT auth pipeline |
| Cookie-based OAuth → JWT Exchange | Good | Google.Apis.Auth.AspNetCore3 with OnTicketReceived event |
| IAuthProvider Interface | Good | Multi-provider abstraction for future providers |
| ExternalLogin Table | Good | Identity mapping (Google sub → UserId) |
| Token Storage (PostgreSQL + Redis) | Good | Durable + fast retrieval, encrypted with IDataProtector |
| Composite DB Indexes for Analytics | Good | Accelerated filter queries on Posts and AuditLogs |
| Query Projections (no Media Include) | Good | Reduced memory overhead and DB transfer size |
| Redis-backed Cache-Aside Pattern | Good | Cached analytics return in < 50ms |
| Cache Invalidation on Publish | Good | Analytics reflect latest data without stale caches |
| CSV-only Export (PDF deferred) | Good | Simple implementation, bandwidth-efficient |
| Presets + Custom Date Range | Good | Quick buttons (7d/30d/90d/YTD) plus calendar picker |
| Sequential DbContext Access | Good | Fixed EF Core concurrency crash in export pipeline |
| Framer Motion Animations | Good | High-fidelity fluid transitions and micro-interactions |
| Skeleton Loader Shimmer | Good | Improved perceived performance during data fetching |
| Error Boundary Isolation | Good | Prevented full-page crashes for non-critical widget errors |
| IPaymentProvider abstraction | Good | Flexible multi-provider support |
| Redis distributed locking | Good | Atomic webhook processing |
| Timestamp event guards | Good | Prevents out-of-order event processing |
| Settings -> Billing UI | Good | Unified management entry point |
| IdempotencyRecord for Stripe events | Good | Prevents duplicate webhook processing |
| Redis-cached tenant resolution | Good | Reduces DB load significantly |
| Result<T> pattern for analytics | Good | Explicit error handling, clean controller code |
| ESLint Zero-Warnings Policy | Good | All source files pass lint with zero errors |
| Component Extraction Pattern | Good | Pages >500 lines extracted into co-located sub-components |
| Sub-Hook Pattern | Good | Complex hooks >250 lines decomposed into focused hooks |
| Serilog.Sinks.File v7.0.0 | Good | Required by Serilog.AspNetCore 10.0.0 transitive dependency |
| UserIdEnricher fallback chain | Good | ClaimTypes.NameIdentifier → sub for OIDC compatibility |
| IDestructuringPolicy collection | Good | Generic DestructuringPolicy<T> for type-safe extensibility |
| 1MB body size limit | Good | Prevents memory pressure on file uploads in RequestBodyRedactionMiddleware |
| Async-wrapped file sink | Good | Avoids request latency from disk I/O |

## Constraints
- Multi-tenant architecture (Workspace-scoped data)
- OAuth token refresh must not silently fail
- Stripe webhooks must be idempotent
- Frontend must maintain high performance and "Pro Max" UI/UX standards
- JWT-based auth with stateless tokens (SecurityStamp for server-side revocation)
- Sensitive data (passwords, tokens, secrets) must never appear in log output

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-23 after v1.6 milestone complete*
