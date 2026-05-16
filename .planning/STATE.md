---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Google Auth & Calendar Integration
current_phase: 17
status: planning
last_updated: "2026-05-16T14:14:00.000Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 66
---

# Project State: Syncra.NET

## Metadata

- **Current Phase:** 17 (Token Storage + Auto-Refresh + Revocation) — READY TO EXECUTE
- **Status:** Phase 17 planned — 3 plans across 3 waves, ready for execution
- **Last Updated:** 2026-05-16

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-16 after v1.5 milestone start)

**Core value:** Social media scheduling and management platform with robust API
**Current focus:** v1.5 Google Auth & Account Linking — Phase 17: Token Storage + Auto-Refresh + Revocation

## Current Position

Phase: 17 — Token Storage + Auto-Refresh + Revocation
Plan: TBD
Status: Context gathered
Last activity: 2026-05-16 — Phase 17 context gathered

## Phase 15 Summary

**Goal:** Multi-provider auth foundation with Google OAuth login/signup

**Backend (Wave 1-2):**
- IOAuthProvider interface (ProviderName, GetLoginUrl, HandleCallbackAsync)
- ExternalLogin entity + IExternalLoginRepository + ExternalLoginRepository
- GoogleOAuthOptions (ClientId, ClientSecret, CallbackUrl, Scopes)
- GoogleAuthProvider with full OAuth flow (state generation, code exchange, user info)
- OAuthLoginCommand + OAuthLoginCommandHandler (new user creation, workspace, token generation)
- AuthController endpoints: GET /oauth/{provider}/login, POST /oauth/{provider}/callback

**Frontend (Wave 3):**
- Google sign-in button in LoginModal with OAuth URL redirect
- OAuthCallbackPage for handling Google callback and token storage
- Auth API methods: getOAuthLoginUrl, oauthCallback

**Commits:**
- feat(auth): IOAuthProvider interface + ExternalLogin entity (Wave 1)
- feat(auth): GoogleAuthProvider implementation (Wave 2)
- feat(auth): OAuth endpoints + command handler with ExternalLogin repository
- feat(frontend): Google OAuth button and callback page

## Milestone History

| Milestone | Phases | Plans | Status | Date |
|-----------|--------|-------|--------|------|
| v1.0 Stability | 1-3 | 12 | Shipped | 2026-04-27 |
| v1.1 Reliable Payments & Provider Abstraction | 4-7 | 13 | Shipped | 2026-05-01 |
| v1.2 Update the FE | 8-11 | 22 | Shipped | 2026-05-08 |
| v1.3 Performance & Analytics Optimization | 12-13 | 9 | Shipped | 2026-05-13 |
| v1.4 Code Quality & Tech Debt | 14 | 8 | Shipped | 2026-05-14 |
| v1.5 Google Auth & Calendar Integration | 15-17 | 4 | Phase 15 Complete | 2026-05-16 |

## Accumulated Context

### Roadmap Evolution

- Phase 14 added: Fix dashboard code quality issues
- Phase 15-17 defined: v1.5 Google Auth & Account Linking (Calendar removed from scope)

### v1.5 Roadmap Summary

| Phase | Goal | Requirements |
|-------|------|--------------|
| 15 | Multi-Provider Auth + Google OAuth login/signup | AUTH-01, AUTH-02, AUTH-03, AUTH-04 |
| 16 | Account Linking (email collision, password verify, unlink) | LINK-01, LINK-02, LINK-03, LINK-04 |
| 17 | Token Storage + Auto-Refresh + Revocation | TOKEN-01, TOKEN-02, TOKEN-03 |

### Key Architectural Decisions (v1.5)

- **No ASP.NET Core Identity** — integrate Google OAuth with existing custom JWT auth pipeline
- **Cookie-based OAuth → JWT exchange** — Google.Apis.Auth.AspNetCore3 with OnTicketReceived event
- **IAuthProvider interface** — multi-provider abstraction for future providers
- **ExternalLogin table** — new identity mapping (Google sub → UserId)
- **Token storage** — PostgreSQL (durable) + Redis (fast retrieval), encrypted with IDataProtector
- **Calendar deferred** — user explicitly removed from v1.5 scope

## Key Decisions (v1.4)

- **ESLint Zero-Warnings Policy (D-19)**: All source files must pass `npm run lint` with zero errors; eslint-disable suppressions removed from all files.
- **Component Extraction Pattern (D-20)**: Pages exceeding 500 lines extracted into co-located sub-components with CSS modules; original page becomes an orchestrator under 250 lines.
- **Sub-Hook Pattern (D-21)**: Complex hooks (>250 lines) decomposed into smaller focused hooks (media, AI) composed in the parent hook.
- **Test Critical Flows (D-22)**: Extracted components, custom hooks, dashboard states, and upload pipeline all covered by vitest tests (62 new tests).

## Key Decisions (v1.3)

- **Composite DB Indexes (D-12)**: Accelerated analytics queries on Posts and AuditLogs.
- **Query Projections (D-13)**: `.Select()` + `.AsNoTracking()` instead of `Include(Media)`.
- **Redis Cache-Aside Pattern (D-14)**: Cached analytics return in < 50ms, 60-min TTL.
- **Cache Invalidation on Publish (D-15)**: Ensures analytics reflect latest data.
- **CSV Export Only (D-16)**: PDF deferred — CSV simpler and bandwidth-efficient.
- **Presets + Custom Date Range (D-17)**: 7d/30d/90d/YTD buttons plus calendar picker.
- **Sequential DbContext Access (D-18)**: Fixed EF Core concurrency crash in export pipeline.

## Known Blockers

- None.

## Deferred Items

- Google Calendar integration (user removed from v1.5 scope)
- Additional auth providers (GitHub, Microsoft) — deferred to v2
