# Roadmap: Syncra.NET Stability Phase

## Phase 1: Security & Multi-tenancy Hardening
*Goal: Secure the billing pipeline and optimize the request-response cycle.*

**Plans:** 4 plans
- [ ] 01-01-PLAN.md — Establishment of baseline integration tests for Webhooks and Middleware.
- [ ] 01-02-PLAN.md — Implementation of Stripe Webhook Idempotency.
- [x] 01-03-PLAN.md — Refactor of Stripe Service to remove global state.
- [ ] 01-04-PLAN.md — Implementation of Redis caching for Tenant Resolution.

- [ ] **Task 1.1:** Implement Stripe Webhook Idempotency.
- [x] **Task 1.2:** Refactor Stripe Service to remove global configuration.
- [ ] **Task 1.3:** Implement Redis caching for `TenantResolutionMiddleware`.
- [ ] **Task 1.4:** Add Integration tests for multi-tenancy validation.

## Phase 2: Architectural Refinement & Performance
*Goal: Move processing to the database and decouple service logic.*

**Plans:** 5 plans
- [ ] 02-01-PLAN.md — Refactor PostRepository to use database-level filtering.
- [ ] 02-02-PLAN.md — Implement Result pattern and refactor Analytics Services.
- [ ] 02-03-PLAN.md — Decouple analytics from environment variables via Options.
- [x] 02-04-PLAN.md — Update Plan entity with Stripe identifiers.
- [ ] 02-05-PLAN.md — Implement Plan Repository and lookup logic.

- [ ] **Task 2.1:** Refactor `PostRepository` to use database-level filtering.
- [ ] **Task 2.2:** Refactor Analytics Service error handling (Result pattern).
- [ ] **Task 2.3:** Decouple services from environment variables via Options pattern.
- [x] **Task 2.4:** Implement Plan Lookup service for Subscriptions.

## Phase 3: Quality & Observability
*Goal: Ensure long-term stability through testing and health tracking.*

- [ ] **Task 3.1:** Implement OAuth health tracking and auditing.
- [ ] **Task 3.2:** Complete test suite for Analytics and Stripe controllers.
- [ ] **Task 3.3:** Final stability audit and documentation update.
