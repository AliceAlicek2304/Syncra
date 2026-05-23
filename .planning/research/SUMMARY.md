# Research Summary: v2.0 Zernio API Integration

**Synthesized:** 2026-05-23  
**Confidence:** HIGH across all four research areas based on Zernio OpenAPI spec, .NET SDK source, and direct Syncra codebase audit.

---

## Stack Additions

One new package is required. Everything else is already in the codebase.

| Package | Version | Project | Purpose |
|---------|---------|---------|---------|
| `Zernio` | `0.0.281` | `Syncra.Infrastructure` | Official .NET SDK; provides `PostsApi`, `AnalyticsApi`, `MessagesApi`, `ConnectApi`, `WebhooksApi`, etc. |

Transitively installs `Newtonsoft.Json` 13.0.3, `JsonSubTypes` 2.0.1, and `Polly` 8.1.0 -- no direct references needed.

The SDK does NOT self-register into DI. A `ZernioClient` wrapper and `AddZernioIntegration()` extension method must be hand-built, following the existing `IPaymentProvider` / `StripePaymentProvider` pattern.

**Do not add:** Polly, Redis, Hangfire, Serilog, EF Core, MediatR -- all already present.

---

## Feature Categories

| Feature | Category | Complexity | Phase |
|---------|----------|------------|-------|
| Zernio .NET SDK + `IZernioClient` abstraction | Table Stakes | Medium | A (Foundation) |
| `ZernioOptions` config + DI registration | Table Stakes | Low | A (Foundation) |
| Workspace `ZernioProfileId` provisioning (lazy) | Table Stakes | Low | A (Foundation) |
| Connect OAuth flow -- all 14 platforms | Table Stakes | Medium | B (Account Connect) |
| X/Twitter billing gate (`402` handling) | Table Stakes | Low | B (Account Connect) |
| Facebook page-selection step | Table Stakes | Low | B (Account Connect) |
| Webhook endpoint + HMAC-SHA256 verification | Table Stakes | Medium | B (Account Connect) |
| `account.connected` / `account.disconnected` handlers | Table Stakes | Low | B (Account Connect) |
| `SocialAccountsController` (connect, list, disconnect) | Table Stakes | Low | B (Account Connect) |
| Post scheduling via Zernio (multi-platform) | Table Stakes | Medium | C (Post Scheduling) |
| `post.published` / `post.failed` / `post.partial` handlers | Table Stakes | Medium | C (Post Scheduling) |
| `post.platform.published` / `post.platform.failed` handlers | Table Stakes | Low | C (Post Scheduling) |
| Post retry via `POST /v1/post/{id}/retry` | Table Stakes | Low | C (Post Scheduling) |
| Post delete (cancel scheduled) | Table Stakes | Low | C (Post Scheduling) |
| Analytics -- post metrics + account-level metrics | Differentiator | Medium | D (Analytics) |
| Best-time analysis (`GET /v1/analytics/best-time`) | Differentiator | Low | D (Analytics) |
| Publishing logs (`GET /v1/logs`) | Differentiator | Low | D (Analytics) |
| Unified Inbox -- DMs (`message.received` webhook) | Differentiator | High | E (Inbox) |
| Unified Inbox -- Comments (`comment.received` webhook) | Differentiator | High | E (Inbox) |
| Unified Inbox -- Reviews (`review.new` webhook) | Differentiator | Medium | E (Inbox) |
| Queue / auto-scheduling slots | Differentiator | Medium | Deferred v2.1 |
| Bulk CSV post upload | Differentiator | Medium | Deferred v2.1 |
| Webhook event subscription management | Differentiator | Low | Deferred v2.1 |
| Broadcasts (bulk DM campaigns) | Deferred | High | Deferred v2.1+ |
| Sequences (drip campaigns) | Deferred | High | Deferred v2.1+ |
| Contacts CRM | Deferred | High | Future milestone |
| Comment Automations | Deferred | Medium | Future milestone |
| Ads management | Deferred | Very High | Future milestone |
| WhatsApp advanced features | Deferred | Very High | Future milestone |
| Demographics analytics | Deferred | Low | Future milestone |

---

## Architecture Highlights

**Key integration decisions:**

- **One Zernio Profile per Syncra Workspace.** Profile is a brand container; Workspace is the multi-tenant boundary. Mapping them 1:1 preserves tenant isolation -- a single shared profile would collapse it. `ZernioProfileId` stored as nullable `varchar(100)` on `Workspace`, provisioned lazily on first Connect attempt.

- **`IZernioClient` abstraction in Application layer, SDK confined to Infrastructure.** The Zernio SDK exposes 60+ individual API classes with no unified entry point. Wrap them behind a Syncra-owned `IZernioClient` interface whose types are all Syncra DTOs. The Infrastructure `ZernioClient` translates to/from SDK types. Mirrors `IPaymentProvider`/`StripePaymentProvider` exactly.

- **Webhooks are the sole source of post-publish status.** Syncra never polls `GET /v1/posts/{id}`. The `ZernioWebhookController` follows the `StripeWebhookController` pattern -- raw body read, HMAC-SHA256 constant-time comparison, Redis distributed lock on `X-Zernio-Event-Id`, Hangfire enqueue, return 200 immediately.

- **Dual-path publish routing during migration.** Legacy posts (`Post.IntegrationId != null`) continue using the old adapter path. New posts use Zernio (`Post.ZernioPostId != null`). The `Integration` entity and all direct-platform adapters are deprecated but not deleted until all workspaces are validated.

- **`PostPlatformTarget` table is mandatory before writing any webhook handler.** Zernio fires per-platform events as each platform terminates. A normalized `post_platform_targets` table prevents race conditions and per-row conflicts under concurrent webhook delivery.

**Entity changes needed:**

| Entity / Table | Change |
|----------------|--------|
| `Workspace` | Add `zernio_profile_id varchar(100) nullable` |
| `Post` | Add `zernio_post_id varchar(100) nullable`, `target_count int nullable` |
| `PostStatus` enum | Add `Partial` value |
| `SocialAccount` (new) | Replaces per-platform OAuth token storage; stores `zernio_account_id` only; no raw tokens |
| `PostPlatformTarget` (new) | Per-platform outcome rows: status, platform post ID, URL, error, timestamps |
| `ZernioWebhookEvent` (new) | Idempotency table keyed on `zernio_event_id`; separate from `IdempotencyRecord` |

**Phase build order (strict dependency chain):**

```
Phase A: Foundation
  IZernioClient + SDK + ZernioOptions + DI + Workspace.ZernioProfileId + SocialAccount entity
    |
Phase B: Account Connect
  ZernioWebhookController + orchestrator + HMAC verifier + ZernioWebhookEvent table
  account.connected / account.disconnected handlers + SocialAccountsController
    |
Phase C: Post Scheduling
  PostPlatformTarget entity + Post.ZernioPostId + CreateZernioPostCommand
  post.* webhook handlers + PostsController extension
    |
  +--- Phase D: Analytics (depends on C -- needs published posts)
  |      Zernio analytics service + Redis cache extension
  |
  +--- Phase E: Inbox (depends on B only -- can run parallel with D)
         message + comment + review webhook handlers + InboxController
           |
         Phase F: Broadcasts/Sequences (DEFERRED -- depends on E + Contacts CRM)
```

---

## Watch Out For

1. **C-01 -- Webhook body consumed before HMAC verification.** Do NOT use `[FromBody]` on the Zernio webhook action. `Request.Body` is forward-only; reading it twice produces an empty HMAC that rejects every legitimate delivery. Copy the `StripeWebhookController` body-read pattern exactly and verify `RequestBodyRedactionMiddleware` uses `EnableBuffering()` and rewinds to position 0.

2. **C-03 / C-04 -- `post.partial` not modeled + out-of-order webhook delivery.** The existing `PostStatus` enum has no `Partial` state. Treating `post.partial` as `Failed` causes users to retry partially-published posts, duplicating content on platforms that already succeeded. Add `Partial` to the enum and `PostPlatformTarget` rows before writing any webhook handler. Guard state machine transitions: if post is already terminal, return 200 silently.

3. **C-02 -- API key leaking into Serilog output.** Add the `sk_[0-9a-f]{64}` pattern to the Serilog redaction policy at the same time `ZernioOptions` is created. Suppress `Authorization` header logging on the Zernio named `HttpClient`. Search logs for `sk_` after first dev deployment.

4. **M-03 -- Zernio SDK types leaking into Application layer.** All types on `IZernioClient` must be Syncra DTOs defined in `Syncra.Application`. The Zernio NuGet package must not be referenced outside `Syncra.Infrastructure`. Command handler unit tests must mock `IZernioClient` without importing the Zernio package.

5. **C-05 -- Connect OAuth token 15-minute expiry.** Zernio connect tokens are ephemeral handshake tokens, not persistent OAuth tokens. Initiate the Connect flow only on explicit user action. Detect 401 mid-flow and re-initiate the connect URL request transparently.

---

## Scope Clarifications

- **Broadcasts and Sequences: defer to v2.1+.** Both require a Contacts CRM that does not exist. WhatsApp Broadcasts additionally require pre-approved Meta message templates (24-72 hour async review). Neither can ship in v2.0.

- **Contacts CRM: defer to its own milestone.** Entirely new data domain; prerequisite for Broadcasts/Sequences but no dependency on Phase A-E work.

- **Ads management: out of scope permanently for v2.x.** Six ad networks, separate billing model, audiences/pixels/campaigns. Separate future product surface.

- **Zernio Queue / auto-scheduling slots: defer to v2.1.** Introduces a new `QueueSlot` concept with no Syncra equivalent. Lower priority than Inbox.

- **Bulk CSV post upload: defer to v2.1.** Agency use case; not a core migration scenario.

- **`Integration` entity and direct-platform adapters: retained (not deleted) in v2.0.** Remove only after all workspaces are confirmed on the Zernio path. Dual-path routing is intentional and temporary.

- **`Microsoft.Extensions.Http.Polly` deprecation: do not address in v2.0.** Separate technical debt item.

- **Twitter/X per-call API passthrough costs: flag for billing model review.** Zernio charges $0.005-$0.015 per X API call. Syncra needs a cost model decision before building X engagement features beyond basic posting.

---

## Sources

| Source | Confidence |
|--------|------------|
| `zernio-api-documentation.md` (project root) | HIGH |
| `zernio-api-openapi.yaml` (project root) | HIGH |
| https://www.nuget.org/packages/Zernio | HIGH |
| https://github.com/zernio-dev/zernio-dotnet | HIGH |
| Syncra codebase (direct audit) | HIGH |
| `.planning/PROJECT.md` | HIGH |