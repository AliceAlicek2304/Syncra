# Project: Syncra.NET

## Vision
Syncra.NET is a social media scheduling and management platform backend built with .NET 8. It aims to provide a robust, scalable, and multi-tenant API for managing social media accounts, scheduling posts, and analyzing performance.

## Current State

**Shipped:** v1.0 Stability (2026-04-27)

v1.0 focused on hardening the foundation: Stripe billing pipeline security, tenant resolution optimization, database-level query performance, and comprehensive test coverage. All 9 requirements validated. 95 tests passing.

## Core Tech Stack
- **Framework:** .NET 8 / ASP.NET Core
- **Database:** PostgreSQL with EF Core 8
- **Cache:** Redis
- **Security:** JWT + OAuth 2.0
- **Integrations:** Stripe (Billing), OpenAI (AI Features), Cloudflare R2 (Media)

## Key Decisions

| Decision | Status | Outcome |
|----------|--------|---------|
| IdempotencyRecord for Stripe events | Good | Prevents duplicate webhook processing |
| Redis-cached tenant resolution | Good | Reduces DB load significantly |
| Result<T> pattern for analytics | Good | Explicit error handling, clean controller code |
| IOptions<T> for configuration | Good | Testable, environment-agnostic services |
| Precedence-based health reporting | Good | Clear operational signals |
| ValidationException for value objects | Good | Consistent domain validation |

## Constraints
- Multi-tenant architecture (Workspace-scoped data)
- OAuth token refresh must not silently fail
- Stripe webhooks must be idempotent

## Next Milestone Goals (v1.1)

_TBD — run `/gsd-new-milestone` to define v1.1 scope_

---

*Last updated: 2026-04-27 after v1.0 milestone*
