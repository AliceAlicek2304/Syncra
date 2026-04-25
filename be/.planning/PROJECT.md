# Project: Syncra.NET

## Vision
Syncra.NET is a social media scheduling and management platform backend built with .NET 8. It aims to provide a robust, scalable, and multi-tenant API for managing social media accounts, scheduling posts, and analyzing performance.

## Current Focus: Stability & Technical Debt
The project is currently in a phase of stabilizing the existing codebase and addressing technical debt identified during initial development. Key areas include performance optimization, security hardening (Stripe/Multi-tenancy), and improving observability/error handling in the analytics engine.

## Core Tech Stack
- **Framework:** .NET 8 / ASP.NET Core
- **Database:** PostgreSQL with EF Core 8
- **Cache:** Redis
- **Security:** JWT + OAuth 2.0
- **Integrations:** Stripe (Billing), OpenAI (AI Features), Cloudflare R2 (Media)

## Success Criteria (Initial Phase)
- All critical concerns in `CONCERNS.md` are addressed.
- Tenant resolution is optimized via caching.
- Stripe webhooks are idempotent and secure.
- Post filtering is performed at the database level.
- Core services (Analytics, Tenant Resolution) have comprehensive test coverage.
