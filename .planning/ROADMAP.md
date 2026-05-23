# Roadmap: Syncra.NET

## Milestones

- ✅ **v1.0 Stability** — Phases 1-3 (shipped 2026-04-27)
- ✅ **v1.1 Reliable Payments & Provider Abstraction** — Phases 4-7 (shipped 2026-05-01)
- ✅ **v1.2 Update the FE** — Phases 8-11 (shipped 2026-05-08)
- ✅ **v1.3 Performance & Analytics Optimization** — Phases 12-13 (shipped 2026-05-13)
- ✅ **v1.4 Code Quality & Tech Debt** — Phase 14 (shipped 2026-05-14)
- ✅ **v1.5 Google Auth & Account Linking** — Phases 15-22 (shipped 2026-05-18)
- ✅ **v1.6 Logging & Observability** — Phase 23 (shipped 2026-05-20)
- 🚧 **v2.0 Zernio API Integration** — Phases 24-28 (in progress)

## Phases

<details>
<summary>✅ v1.0 Stability (Phases 1-3) — SHIPPED 2026-04-27</summary>

- [x] Phase 1: Foundation Hardening — completed 2026-04-27
- [x] Phase 2: Tenant Resolution Optimization — completed 2026-04-27
- [x] Phase 3: Test Coverage — completed 2026-04-27

</details>

<details>
<summary>✅ v1.1 Reliable Payments & Provider Abstraction (Phases 4-7) — SHIPPED 2026-05-01</summary>

- [x] Phase 4: Payment Provider Abstraction — completed 2026-05-01
- [x] Phase 5: Stripe Data Consistency Mapping — completed 2026-05-01
- [x] Phase 6: Webhook Reliability & Idempotency — completed 2026-05-01
- [x] Phase 7: Frontend Billing UX — completed 2026-05-01

</details>

<details>
<summary>✅ v1.2 Update the FE (Phases 8-11) — SHIPPED 2026-05-08</summary>

- [x] Phase 8: Core API Integration & Auth — completed 2026-05-08
- [x] Phase 9: Feature Integration (Ideas & Posts) — completed 2026-05-08
- [x] Phase 10: Scheduling Analytics — completed 2026-05-08
- [x] Phase 11: Pro Max Polish & E2E Testing — completed 2026-05-08

</details>

<details>
<summary>✅ v1.3 Performance & Analytics Optimization (Phases 12-13) — SHIPPED 2026-05-13</summary>

- [x] Phase 12: Database Query Optimization — completed 2026-05-13
- [x] Phase 13: Advanced Analytics Reporting — completed 2026-05-13

</details>

<details>
<summary>✅ v1.4 Code Quality & Tech Debt (Phase 14) — SHIPPED 2026-05-14</summary>

- [x] Phase 14: Fix Dashboard Code Quality Issues — completed 2026-05-14

</details>

<details>
<summary>✅ v1.5 Google Auth & Account Linking (Phases 15-22) — SHIPPED 2026-05-18</summary>

- [x] Phase 15: Multi-Provider Auth Foundation + Google OAuth (5/5 plans) — completed 2026-05-16
- [x] Phase 16: Account Linking (3/3 plans) — completed 2026-05-16
- [x] Phase 17: Token Storage + Auto-Refresh + Revocation (3/3 plans) — completed 2026-05-16
- [x] Phase 18: Allow Apostrophes in Workspace Names (1/1 plans) — completed 2026-05-17
- [x] Phase 19: Fix Keyboard Navigation & Accessibility (1/1 plans) — completed 2026-05-17
- [x] Phase 20: Forgot/Reset Password Flow (4/4 plans) — completed 2026-05-17
- [x] Phase 21: Change Password in Settings (4/4 plans) — completed 2026-05-17
- [x] Phase 22: Email Verification After Registration (3/3 plans) — completed 2026-05-18

</details>

<details>
<summary>✅ v1.6 Logging & Observability (Phase 23) — SHIPPED 2026-05-20</summary>

- [x] Phase 23: Configure Logging (Serilog) — completed 2026-05-20

</details>

### 🚧 v2.0 Zernio API Integration (In Progress)

**Milestone Goal:** Replace individual platform API integrations with Zernio's unified API — enabling cross-platform post scheduling, analytics, and inbox across all 14 supported platforms from a single client.

---

#### Phase 24: Zernio Foundation
**Goal**: Establish the Zernio SDK client abstraction, configuration, DI registration, API key log redaction, and all new DB entities required by downstream phases.
**Depends on**: Phase 23 (Serilog pipeline already in place for redaction extension)
**Requirements**: ZRNIO-01, ZRNIO-02, ZRNIO-03, ZRNIO-04
**Success Criteria** (what must be TRUE):
  1. An administrator can configure the Zernio API key via `appsettings.json` / user secrets and the application starts without errors
  2. `IZernioClient` resolves from DI and all SDK types (`Zernio.*`) are unreachable from `Syncra.Application` — the SDK is confined to `Syncra.Infrastructure`
  3. Any Zernio API key matching `sk_[0-9a-f]{64}` is redacted to `***REDACTED***` in every Serilog log line; no raw key appears in rolling log files
  4. EF Core migrations run cleanly, creating `social_accounts`, `post_platform_targets`, and `zernio_webhook_events` tables
  5. `PostStatus.Partial` is a valid enum value and existing post queries continue to compile and pass tests
**Plans**: TBD

Plans:
- [ ] 24-01: Zernio NuGet package + `IZernioClient` interface + `ZernioClient` Infrastructure implementation (mirrors `IPaymentProvider` pattern)
- [ ] 24-02: `ZernioOptions` config class + DI registration (`AddZernioIntegration`) + API key Serilog redaction policy
- [ ] 24-03: `SocialAccount`, `PostPlatformTarget`, `ZernioWebhookEvent` entities + EF Core config + migration; `PostStatus.Partial` enum value; `Workspace.ZernioProfileId` + `Post.ZernioPostId` + `Post.TargetCount` columns

---

#### Phase 25: Account Connect
**Goal**: Enable users to connect and manage social accounts via Zernio Connect OAuth, and establish the complete webhook infrastructure (endpoint, HMAC verification, idempotency) that all subsequent phases depend on.
**Depends on**: Phase 24
**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, HOOK-01, HOOK-03
**Success Criteria** (what must be TRUE):
  1. A user can initiate an OAuth connection for any of the 14 Zernio-supported platforms and land back in Syncra with a connected `SocialAccount` record
  2. A user can view all connected social accounts for their workspace via `GET /api/social-accounts`
  3. A user can disconnect a social account via `DELETE /api/social-accounts/{id}`
  4. When Zernio returns a 402 billing gate (`twitter_passthrough` / `free_tier_exceeded`), the user sees an actionable error message and a redirect URL to resolve billing
  5. Webhook deliveries with a duplicate `X-Zernio-Event-Id` are silently acknowledged (200) without reprocessing; `account.connected` and `account.disconnected` events update `SocialAccount` records in real time
**Plans**: TBD

Plans:
- [ ] 25-01: `ZernioWebhookController` — raw body read, HMAC-SHA256 constant-time verification, Redis distributed lock on `X-Zernio-Event-Id`, Hangfire enqueue, immediate 200 response
- [ ] 25-02: Webhook idempotency consumer + `account.connected` / `account.disconnected` event handlers
- [ ] 25-03: `SocialAccountsController` — Connect OAuth initiation, list accounts, disconnect; billing gate 402 handling with user-facing error + redirect URL
- [ ] 25-04: Frontend — Connected Accounts UI (list, connect button per platform, disconnect, billing gate error state)

---

#### Phase 26: Post Scheduling
**Goal**: Enable users to schedule and publish posts to multiple connected platforms via Zernio, track per-platform outcomes, retry failed posts, and cancel scheduled posts. Ship post lifecycle webhook handlers.
**Depends on**: Phase 25
**Requirements**: POST-01, POST-02, POST-03, POST-04, POST-05, HOOK-02, HOOK-04
**Success Criteria** (what must be TRUE):
  1. A user can schedule a post to one or more connected accounts across multiple platforms — the post appears as `Scheduled` in the feed with correct `PostPlatformTarget` rows
  2. A user can publish a post immediately and see it transition to `Published` or `Partial` once Zernio webhook events confirm
  3. A user can see per-platform outcomes for any Zernio post (which platforms succeeded, which failed, with error details)
  4. A user can retry a failed or partial post; platforms that already published are skipped — no duplicate content
  5. A user can delete a scheduled post, which cancels it in Zernio and removes it from the feed
**Plans**: TBD

Plans:
- [ ] 26-01: `CreateZernioPostCommand` + handler — multi-platform post creation, `PostPlatformTarget` rows, dual-path routing (legacy vs Zernio)
- [ ] 26-02: `post.scheduled`, `post.published`, `post.failed`, `post.partial`, `post.cancelled` webhook handlers; state machine guard (terminal state no-op)
- [ ] 26-03: `post.platform.published` / `post.platform.failed` handlers — update individual `PostPlatformTarget` records
- [ ] 26-04: Post retry command (`POST /v1/post/{id}/retry`) + delete/cancel command; frontend retry and delete actions on post cards

---

#### Phase 27: Analytics
**Goal**: Surface Zernio-sourced post metrics, daily engagement stats, and best-time analysis to users.
**Depends on**: Phase 26 (published posts must exist in `PostPlatformTarget` records)
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03
**Success Criteria** (what must be TRUE):
  1. A user can view impressions, engagements, and clicks for any Zernio-published post on the post detail page
  2. A user can view a daily engagement chart aggregated across all connected accounts for a selectable date range
  3. A user can view a best-times heatmap per platform based on historical Zernio engagement data
**Plans**: TBD

Plans:
- [ ] 27-01: `ZernioAnalyticsService` — post metrics (`GET /v1/analytics/posts/{id}`), daily stats (`GET /v1/analytics/daily`); Redis cache extension for Zernio responses
- [ ] 27-02: Best-time analysis (`GET /v1/analytics/best-time`); `AnalyticsController` endpoints; frontend analytics panel update (Zernio metrics tab)

---

#### Phase 28: Inbox
**Goal**: Provide a unified inbox for DMs, post comments, and reviews across all connected platforms, with reply capability from within Syncra.
**Depends on**: Phase 25 (webhook infrastructure must be live for `message.received`, `comment.received`, `review.new` events)
**Requirements**: INBX-01, INBX-02, INBX-03, INBX-04, INBX-05
**Success Criteria** (what must be TRUE):
  1. A user can view all incoming DM conversations across connected accounts in a unified inbox, ordered by most recent
  2. A user can send a DM reply from the inbox and see it delivered via Zernio
  3. A user can view comments on their posts across all connected accounts
  4. A user can reply to a comment from the inbox
  5. A user can view Facebook and Google Business reviews and post a reply
**Plans**: TBD

Plans:
- [ ] 28-01: `message.received` webhook handler + `InboxMessage` persistence; `MessagesApi` reply (`POST /v1/messages/{id}/reply`)
- [ ] 28-02: `comment.received` webhook handler + `InboxComment` persistence; `MessagesApi` comment reply
- [ ] 28-03: `review.new` webhook handler + `InboxReview` persistence (Facebook / Google Business); review reply
- [ ] 28-04: `InboxController` — unified feed endpoint (DMs + comments + reviews, workspace-scoped, paginated); frontend Inbox page

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-3. Foundation & Stability | v1.0 | 12/12 | Complete | 2026-04-27 |
| 4-7. Payments & Provider Abstraction | v1.1 | 13/13 | Complete | 2026-05-01 |
| 8-11. Frontend & Core Features | v1.2 | 22/22 | Complete | 2026-05-08 |
| 12-13. Performance & Analytics | v1.3 | 9/9 | Complete | 2026-05-13 |
| 14. Code Quality & Tech Debt | v1.4 | 8/8 | Complete | 2026-05-14 |
| 15-22. Google Auth & Account Linking | v1.5 | 24/24 | Complete | 2026-05-18 |
| 23. Configure Logging (Serilog) | v1.6 | 3/3 | Complete | 2026-05-20 |
| 24. Zernio Foundation | v2.0 | 0/3 | Not started | - |
| 25. Account Connect | v2.0 | 0/4 | Not started | - |
| 26. Post Scheduling | v2.0 | 0/4 | Not started | - |
| 27. Analytics | v2.0 | 0/2 | Not started | - |
| 28. Inbox | v2.0 | 0/4 | Not started | - |

_For milestone archives, see `.planning/milestones/v1.6-ROADMAP.md`_
