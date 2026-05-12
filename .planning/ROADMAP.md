# Roadmap: Syncra.NET

## Milestones

- [x] **v1.2 Update the FE** – Phases 8-11 (Shipped 2026-05-08)
- ? **v1.1 Reliable Payments & Provider Abstraction** – Phases 4-7 (shipped 2026-05-01) – [Archive](milestones/v1.1-ROADMAP.md)
- ? **v1.0 Stability** – Phases 1-3 (shipped 2026-04-27) – [Archive](milestones/v1.0-ROADMAP.md)

## Phases

<details open>
<summary>[x] v1.2 Update the FE (Phases 8-11) – COMPLETE</summary>

### Phase 8: Core API Integration & Auth (7 plans)

Plans:
- [x] 08-01-PLAN.md — Implement API client (Axios)
- [x] 08-02-PLAN.md — Auth flow & session persistence
- [x] 08-03-PLAN.md — Workspace fetching & switching
- [x] 08-04-PLAN.md — Profile settings form & update
- [x] 08-05-PLAN.md — Workspace settings form & update
- [x] 08-06-PLAN.md — Global error handling & toast notifications
- [x] 08-07-PLAN.md — E2E Verification Suite

### Phase 9: Feature Integration (Ideas & Posts) (7 plans)

Plans:
- [x] 09-01-PLAN.md — Media API client & backend integration
- [x] 09-02-PLAN.md — useR2Upload Hook — Direct-to-R2 Upload
- [x] 09-03-PLAN.md — Ideas Board Backend Integration
- [x] 09-04-PLAN.md — AI Idea Generator — Real API Integration
- [x] 09-05-PLAN.md — Multi-platform Editor — Auto-save & Backend Persistence
- [x] 09-06-PLAN.md — Media Library Page
- [x] 09-07-PLAN.md — Phase 9 E2E Verification


### Phase 10: Scheduling & Analytics (5 plans)

Plans:
- [x] 10-01-PLAN.md — Connect Calendar to Scheduling API
- [x] 10-02-PLAN.md — Bind Analytics charts to real metrics
- [x] 10-03-PLAN.md — Implement live notification system
- [x] 10-04-PLAN.md — Heatmap integration
- [x] 10-05-PLAN.md — UI Refinement Gap Closure

### Phase 11: "Pro Max" Polish & E2E Testing (3 plans) — COMPLETE ✓
- [x] 11-A-PLAN.md — Framer Motion foundations
- [x] 11-B-PLAN.md — Micro-interactions & Error Boundaries
- [x] 11-C-PLAN.md — E2E Test Suite
  **UAT Complete 2026-05-12**
</details>

<details>
<summary>? v1.1 Reliable Payments & Provider Abstraction (Phases 4-7) – SHIPPED 2026-05-01</summary>

### Phase 4: Payment Provider Abstraction
- [x] Phase 4 (3/3 plans) – completed 2026-04-30 (PR #15)

### Phase 5: Stripe Data Consistency & Mapping
- [x] Phase 5 (4/4 plans) – shipped 2026-05-01 (PR #16)

### Phase 6: Webhook Reliability & Idempotency
- [x] Phase 7: Billing UX & Documentation
- [x] Phase 7 (4/4 plans) – shipped 2026-05-01 (PR #17)

</details>

<details>
<summary>? v1.0 Stability (Phases 1-3) – SHIPPED 2026-04-27</summary>

### Phase 1: Security & Multi-tenancy Hardening
- [x] Phase 1 (4/4 plans) – completed 2026-04-26

### Phase 2: Architectural Refinement & Performance
- [x] Phase 2 (6/6 plans) – completed 2026-04-26

### Phase 3: Quality & Observability
- [x] Phase 3 (3/3 plans) – completed 2026-04-27

</details>

## Next Milestone

**v1.3 Performance & Analytics Optimization** (Active)

### Phase 12: Query Optimization & Caching (5 plans) — COMPLETE ✓
- [x] 12-01-PLAN.md — EF Core Migrations for Indexes
- [x] 12-02-PLAN.md — WorkspaceAnalyticsService Refactor (Projections)
- [x] 12-03-PLAN.md — AnalyticsCacheService Implementation (Redis)
- [x] 12-04-PLAN.md — Cache Integration & Invalidation
- [x] 12-05-PLAN.md — Verification & Benchmarking — **UAT Complete 2026-05-12**
### Phase 13: Advanced Analytics & Reporting (3 plans + 1 fix)
- [x] 13-01-PLAN.md — Export DTOs & Repository Extension
- [x] 13-02-PLAN.md — CSV Export Service Implementation
- [x] 13-03-PLAN.md — API Endpoint & Verification
- [ ] 13-FIX-01-PLAN.md — Fix EF Core concurrency crash in CSV export
