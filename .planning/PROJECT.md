# Project: Syncra.NET

## Vision
Syncra.NET is a social media scheduling and management platform backend built with .NET 8. It aims to provide a robust, scalable, and multi-tenant API for managing social media accounts, scheduling posts, and analyzing performance.

## Current State

**Active:** v1.2 Update the FE (Started 2026-05-03)

v1.2 focuses on building a high-fidelity frontend UI/UX using React, integrating it with the .NET backend API, and ensuring full E2E flow testing.

**Shipped:**
- <details><summary>v1.1 Reliable Payments & Provider Abstraction (2026-05-01)</summary>Delivered a robust billing engine with IPaymentProvider abstraction, Redis-backed webhook idempotency, and a complete frontend Billing UX.</details>
- <details><summary>v1.0 Stability (2026-04-27)</summary>Hardened foundation, tenant resolution optimization, and comprehensive test coverage.</details>

## Core Tech Stack
- **Framework:** .NET 8 / ASP.NET Core
- **Frontend:** React (TypeScript) + Vite + Vanilla CSS
- **Database:** PostgreSQL with EF Core 8
- **Cache:** Redis
- **Security:** JWT + OAuth 2.0
- **Integrations:** Stripe (Billing), OpenAI (AI Features), Cloudflare R2 (Media)

## Requirements

### Active
- [ ] v1.2 Frontend UI/UX (High Fidelity)
- [ ] v1.2 API Integration
- [ ] v1.2 E2E Flow Testing

### Validated
- ? REQ-1.1: Payment Provider Abstraction – v1.1
- ? REQ-2.1: Stripe Data Consistency – v1.1
- ? REQ-3.1: Webhook Reliability & Idempotency – v1.1
- ? REQ-4.1: Frontend Billing UX – v1.1
- ? REQ-5.1: Technical Documentation – v1.1
- ? Foundation Hardening – v1.0
- ? Tenant Resolution – v1.0

## Key Decisions

| Decision | Status | Outcome |
|----------|--------|---------|
| IPaymentProvider abstraction | Good | Flexible multi-provider support |
| Redis distributed locking | Good | Atomic webhook processing |
| Timestamp event guards | Good | Prevents out-of-order event processing |
| Settings -> Billing UI | Good | Unified management entry point |
| IdempotencyRecord for Stripe events | Good | Prevents duplicate webhook processing |
| Redis-cached tenant resolution | Good | Reduces DB load significantly |
| Result<T> pattern for analytics | Good | Explicit error handling, clean controller code |

## Constraints
- Multi-tenant architecture (Workspace-scoped data)
- OAuth token refresh must not silently fail
- Stripe webhooks must be idempotent
- Frontend must maintain high performance and "Pro Max" UI/UX standards

---
*Last updated: 2026-05-03 for v1.2 milestone start*
