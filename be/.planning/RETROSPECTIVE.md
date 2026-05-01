# Project Retrospective: Syncra.NET

## Milestone: v1.1 — Reliable Payments & Provider Abstraction

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

## Milestone: v1.0 — Stability

**Shipped:** 2026-04-27
**Phases:** 3 | **Plans:** 12

### What Was Built
- Foundation hardening (JWT, Multi-tenancy).
- Performance optimizations (Redis caching, EF Core query tuning).
- Quality & Observability (Sentry, Serilog, S3/R2 storage).

---

## Cross-Milestone Trends

| Milestone | Velocity (Plans/Day) | Quality (Passing Tests) |
|-----------|----------------------|-------------------------|
| v1.0      | 4.0                  | 100% (95/95)            |
| v1.1      | 3.75                 | 100% (105/105)          |
