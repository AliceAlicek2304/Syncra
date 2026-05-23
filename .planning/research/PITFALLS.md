# Domain Pitfalls: Zernio API Integration into Syncra.NET

**Domain:** Unified social media API integration (Zernio) into existing .NET 8 multi-tenant scheduling system  
**Researched:** 2026-05-23  
**Scope:** Adding Zernio as v2.0 unified social layer to a system that already has: Stripe HMAC webhook pipeline, Redis idempotency, IPaymentProvider abstraction, Serilog sensitive-data redaction, Post scheduling job pipeline

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or security incidents.

---

### C-01: Reading the Request Body Twice in Webhook Signature Validation

**What goes wrong:** The existing `StripeWebhookController` reads the raw body via `StreamReader`. If a middleware, model binding, or any ASP.NET Core pipeline component reads `HttpContext.Request.Body` before the controller, the stream is consumed and subsequent reads return empty. The HMAC is then computed over an empty string and will never match any real signature. Every legitimate webhook fails with 400.

**Why it happens:** ASP.NET Core's `Request.Body` is a forward-only stream. The existing Stripe controller reads it directly — that pattern is correct and must be preserved exactly for Zernio. The risk appears if someone adds `[FromBody]` binding to the Zernio webhook action, enables request body buffering globally without understanding this controller, or inserts middleware that logs the body without restoring the stream.

**Consequences:** All Zernio webhook deliveries rejected. Silent post status drift — Zernio delivers `post.published` and `post.partial` events that never update Syncra's `Post.Status`. Zernio retries 7 times over ~51 hours before dead-lettering, amplifying the failure window.

**Prevention:**
- Do NOT use `[FromBody]` on the Zernio webhook action. Read `HttpContext.Request.Body` via `StreamReader` exactly as the Stripe controller does.
- If `RequestBodyRedactionMiddleware` is in the pipeline, verify it uses `EnableBuffering()` AND rewinds the stream to position 0 after reading. Confirm this before shipping the endpoint.
- Validate with the `webhook.test` event during development — Zernio's test event sends a signed payload and you can confirm the signature computes correctly end-to-end.
- Note: Zernio also sends `X-Late-Signature` as a legacy alias. Read `X-Zernio-Signature` only. Do not fall back to the legacy header in new code.

**Detection:** Webhook logs in the Zernio dashboard show delivery attempts with your endpoint returning 400. If every delivery shows 400, body-read ordering is the first suspect.

---

### C-02: Storing the Zernio API Key in a Manner that Exposes it in Logs

**What goes wrong:** The API key format is `sk_` + 64 hex characters (67 total). Serilog is already configured with destructuring policies and `RequestBodyRedactionMiddleware` for Stripe secrets and OAuth tokens. If the Zernio API key is not added to the same redaction policy, it will appear in: structured log properties when an `HttpClient` logs request headers; exception messages if the key appears in an `Authorization` header and the HTTP client throws with full request details; any place where `IConfiguration` values are logged at startup.

**Why it happens:** The existing `IDestructuringPolicy` collection is type-specific. A new string pattern (`sk_[64 hex]`) is not automatically covered unless explicitly registered. The Serilog pipeline correctly redacts things it knows about — it cannot redact patterns it has never been told about.

**Consequences:** API key appears in log files. If log files are shipped to a log aggregator (Seq, Datadog, etc.), the key is exfiltrated. Zernio keys are stored as SHA-256 hashes server-side — they are shown only once at creation. Rotation requires creating a new key and updating all consumers.

**Prevention:**
- Store the key in `appsettings.{Environment}.json` (already git-ignored per existing `.gitignore` pattern) or use User Secrets / Azure Key Vault for production.
- Add a destructuring policy or enricher that redacts strings matching `sk_[0-9a-f]{64}` from Serilog output before shipping the endpoint.
- Configure the named `HttpClient` for Zernio to NOT log headers at `Debug` level, or use a delegating handler that strips the `Authorization` header from diagnostic output.
- Never inject the API key as a constructor parameter or method argument where it would appear in structured log properties.

**Detection:** Search log output for `sk_` after making any Zernio API call in development. If found anywhere, the redaction policy is incomplete.

---

### C-03: Conflating Zernio's `post.partial` Event with Full Failure or Full Success

**What goes wrong:** Zernio fires three distinct terminal events for a multi-platform post: `post.published` (all platforms succeeded), `post.failed` (all failed), and `post.partial` (some succeeded, some failed). The existing `Post` entity and `PostStatus` enum has no `Partial` state — only `Draft`, `Scheduled`, `Publishing`, `Published`, `Failed`. Treating `post.partial` as either `Published` or `Failed` corrupts the user-visible status and hides platform-level outcome data.

**Why it happens:** The existing domain model was designed for single-platform publishing. When `MarkPublishSuccess` or `MarkPublishFailure` is called, it collapses the outcome to a binary. The mapping from multi-platform Zernio result to single-entity status is not straightforward.

**Consequences:**
- If `post.partial` is mapped to `Published`: users see posts as successful when one or more platforms silently failed. Analytics data is misleading.
- If `post.partial` is mapped to `Failed`: users see failures for posts that actually published to most platforms. Retrying a `Failed` post in Syncra would re-submit to Zernio, potentially duplicating content on platforms that already received it.
- The `PublishExternalId` field holds a single string. Zernio returns per-platform post IDs. Storing only the first loses the rest.

**Prevention:**
- Before writing the Zernio webhook handler, decide the domain model extension: either add `Partial` to `PostStatus` and per-platform outcome rows, or store platform outcomes as JSON in `PublishProviderResponseMetadata`. The existing `TruncateMetadata` caps that field at 500 characters — insufficient for 14-platform outcome data. The field length must be extended before storing per-platform results.
- The `post.platform.published` and `post.platform.failed` events fire per-platform as each one terminates. These are the granular events; `post.partial` is the rollup. Subscribe to the granular events for incremental UI updates; use the rollup for final state.
- Do NOT call `post.Retry()` from Syncra's domain when the Zernio post is in partial state — Zernio has its own retry endpoint (`POST /v1/posts/{id}/retry`) that re-attempts only the failed platforms, not the successful ones.

**Detection:** Create a test post targeting two platforms, intentionally revoke one platform's token, and observe whether the `post.partial` webhook arrives and is handled distinctly from `post.failed`.

---

### C-04: Webhook Event Ordering Violations Breaking the Post Status State Machine

**What goes wrong:** Zernio's docs explicitly state webhooks have no guaranteed delivery order. The `post.platform.published` per-platform events fire as each platform terminates without waiting for others. A sequence like: `post.platform.published (Twitter)` then `post.platform.failed (LinkedIn)` then `post.partial` can arrive in any permutation.

The existing `Post` domain entity has strict transition guards — `MarkPublishSuccess` throws `DomainException("invalid_state")` if `CanBePublished()` returns false. If `post.partial` arrives first and sets the post to a terminal state, then `post.platform.published` arrives and tries to call `MarkPublishSuccess`, the domain throws and the webhook handler returns 500, triggering Zernio's retry schedule unnecessarily.

**Why it happens:** The Stripe webhook pipeline uses `record.Status == IdempotencyStatus.Success` to skip already-processed events. But each Zernio event has a different `id` — they are not duplicate events. They are different events for the same business object arriving out of order. The idempotency table prevents true duplicates; it does not resolve ordering conflicts.

**Consequences:** Spurious 500s from domain state machine violations cause 7-attempt retry loops. The webhook logs in Zernio's dashboard fill with errors. In the worst case, the state machine guard is weakened to avoid these errors, opening the door to silent data corruption.

**Prevention:**
- The Zernio webhook handler must check current `Post.Status` before invoking domain methods, rather than assuming the event arrived in the correct order. Guard the handler: if the post is already in a terminal state (`Published`, `Failed`, or a future `Partial` status), skip the state transition silently and return 200.
- Apply the existing `timestamp event guards` pattern (noted in PROJECT.md Key Decisions) from the Stripe pipeline: store `UpdatedAtUtc` alongside the terminal state and compare event timestamps against it. If the arriving event's timestamp is older than the stored terminal event, discard.
- Subscribe to `post.published`, `post.failed`, and `post.partial` for final status. Subscribe to `post.platform.published` and `post.platform.failed` only for incremental UI updates, not for driving status transitions.

**Detection:** During testing, verify the webhook handler returns 200 (not 500) when receiving a `post.platform.published` event after a `post.partial` has already arrived for the same post.

---

### C-05: Connect Token Expiry During the OAuth Account-Linking Flow

**What goes wrong:** Zernio's Connect OAuth flow uses short-lived connect tokens (15-minute expiry, delivered via `X-Connect-Token` header, per the OpenAPI `connectToken` security scheme). If the user takes longer than 15 minutes to complete the platform OAuth redirect flow — common on mobile, with slow connections, or for platforms that show account-chooser screens — the token expires mid-flow. The `X-Connect-Token` authenticates Facebook page selection API calls during the flow. An expired token returns 401.

**Why it happens:** The existing system has OAuth flows for Google (v1.5) using persistent tokens. Connect tokens are fundamentally different — they are ephemeral handshake tokens. Treating them like OAuth access tokens and assuming they last a session is incorrect.

**Consequences:** Users see unexplained authentication errors mid-flow. The social account is not linked. The user must restart the process. For multi-tenant workspaces where an admin initiates a link for a team member, the restart requires admin involvement again.

**Prevention:**
- Initiate the Connect flow only when the user has explicitly clicked the link button and is ready to authorize — never pre-generate connect tokens speculatively.
- Store the 15-minute expiry from the initial connect token response and display a visible countdown or warning after 10 minutes.
- Design the Connect OAuth callback to detect a 401 from an expired token and re-initiate the connect URL request transparently before showing the user a failure screen.
- Do NOT store connect tokens in Redis with the same TTL as OAuth access tokens. They expire after 15 minutes regardless.

**Detection:** Artificially delay the OAuth callback by 16 minutes in an integration test and verify the UX presents a recoverable error rather than an unhandled 401.

---

## Moderate Pitfalls

Mistakes that cause regressions, user confusion, or significant debugging effort.

---

### M-01: Per-Platform Daily Cap Exhaustion Silently Blocking Posts

**What goes wrong:** Zernio's API rate limit (60 or 600 req/min) is separate from platform-level daily publishing caps: Instagram 100 posts/day per account, Twitter 20/day, Pinterest 25/day. The API call to schedule the post succeeds (HTTP 200, post created in Zernio), but at publish time the post fails with a platform-level cap error. The existing `DuePostPublishJob` uses `IsTransientFailure()` to decide whether to retry. A cap exhaustion is NOT transient — retrying the same day will keep failing until midnight.

**Why it happens:** The current `IsTransientFailure` logic classifies errors by code string. Zernio's platform cap errors arrive via the `post.failed` webhook hours after the scheduled time. The Syncra job may have already left the post in `Publishing` if the webhook was missed.

**Consequences:** Posts scheduled late in a busy posting day silently fail. Users see `Failed` status with no explanation distinguishing "platform cap — retry tomorrow" from "content permanently rejected". If cap exhaustion is classified as transient, Syncra burns retry attempts and the next day's cap budget on stale posts.

**Prevention:**
- Map Zernio's platform-cap error codes to a distinct `PostFailureReason` that surfaces "try tomorrow" messaging to users.
- The `IsTransientFailure` method must NOT classify cap exhaustion as transient. Cap errors should immediately mark the post `Failed` with a `retry_tomorrow` reason rather than burning retry attempts.
- Read `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers from every Zernio API response rather than hard-coding limits, as the docs explicitly recommend.

---

### M-02: Entity Mapping Losing Per-Platform Context During Migration

**What goes wrong:** The existing `Post` entity stores a single `IntegrationId` (FK to `Integration`), a single `PublishExternalId`, and a single `PublishExternalUrl`. Zernio's post model is 1-to-many: one Zernio post ID maps to multiple platform targets, each with its own external post ID and URL. During migration of existing scheduled posts, the mapping is 1-to-1 initially but becomes 1-to-many once users add cross-platform targets.

**Why it happens:** The domain model pre-dates multi-platform publishing. There is no `PostPlatformResult` entity for per-platform outcomes. The `PublishProviderResponseMetadata` field holds raw JSON but is truncated to 500 characters — insufficient for 14-platform outcome data.

**Consequences:**
- Analytics that read `PublishExternalId` or `PublishExternalUrl` from the `Post` entity show partial or stale data once multi-platform posts exist.
- The LinkedIn analytics limitation (analytics only for posts published via Zernio) means that if the Zernio post ID is not stored against the Syncra post record, LinkedIn analytics will be permanently unavailable for those posts.
- The existing Redis analytics cache (60-min TTL, invalidated on publish) may cache stale data if the webhook-driven status update happens after the cache is populated.

**Prevention:**
- Before writing any migration code, design and ship the database schema: add a `ZernioPostId` column to `Post` and a new `PostPlatformResult` table (`PostId`, `Platform`, `ZernioAccountId`, `ExternalId`, `ExternalUrl`, `Status`, `FailureReason`, `PublishedAtUtc`).
- The migration must be additive: do NOT remove `IntegrationId` or the existing `PublishExternalId` columns in the same migration that adds Zernio fields. Run both schemas in parallel until all existing posts are confirmed migrated.
- Extend `PublishProviderResponseMetadata` size limit from 500 to at least 4000 characters if it will store multi-platform JSON.
- Invalidate the Redis analytics cache on `post.partial` and `post.platform.published` events, not just on `post.published`.

---

### M-03: IZernioClient Abstraction Leaking Zernio SDK Types into the Application Layer

**What goes wrong:** The `IPaymentProvider` pattern works because the application layer deals in abstract `PaymentWebhookEvent` DTOs — it never sees Stripe types. If the `IZernioClient` is designed similarly but the Zernio .NET SDK's generated types leak into command handlers or domain services (e.g., a handler takes `ZernioPostResponse` from the Zernio NuGet package), the abstraction fails. Updating the SDK version becomes a breaking change across all handlers.

**Why it happens:** The Zernio .NET SDK (`dotnet add package Zernio`) auto-generates types from the OpenAPI spec. It's tempting to use them directly in handlers because they are already typed. The indirection layer feels like boilerplate.

**Consequences:** Every SDK major version bump requires changes across the Application layer, not just the Infrastructure adapter. Unit tests for handlers must take dependencies on the Zernio SDK package. The abstraction provides no isolation.

**Prevention:**
- Follow the existing `IPaymentProvider` pattern exactly: define Syncra-specific request/response types in the Application layer (`ZernioCreatePostRequest`, `ZernioPostResult`, `ZernioAnalyticsResult`, etc.), and have the Infrastructure `ZernioClientAdapter` translate between Syncra types and SDK types.
- The Zernio SDK types belong in `Syncra.Infrastructure` only. The `IZernioClient` interface and all types it references must live in `Syncra.Application` or `Syncra.Domain`.
- Unit tests for command handlers mock `IZernioClient` using only Syncra types — they never reference the Zernio NuGet package.

---

### M-04: Idempotency Key Namespace Collision Between Stripe and Zernio Webhooks

**What goes wrong:** The existing `PaymentWebhookOrchestrator` builds idempotency keys as `{providerKey}_event_{eventId}` (e.g., `stripe_event_evt_abc123`). Zernio webhook event IDs are UUIDs (`payload.id`). If the Zernio webhook handler reuses the same `IdempotencyRecord` table with the same key format, there is a small but real risk of UUID collision with existing or future records from other providers that also use UUIDs.

**Why it happens:** UUIDs are not globally unique across independently generated sequences — they are probabilistically unique. With millions of Stripe and Zernio events sharing one table and one key namespace, the namespace prefix `zernio_event_` is essential.

**Consequences:** A UUID collision would cause a legitimate Zernio event to be treated as already-processed (returning 200 without handling it), silently dropping a `post.published` or `post.failed` notification.

**Prevention:**
- Use `zernio_event_{uuid}` as the idempotency key prefix. Never share a key namespace with Stripe events.
- The `X-Zernio-Event-Id` header provides the same UUID as `payload.id`. Use the header value to construct the key immediately on receipt, before parsing the body, so the idempotency check can fire even if JSON parsing fails.
- Set `ExpiresAtUtc` for Zernio idempotency records to 72 hours (Zernio retries for up to ~51 hours). The existing 30-day expiry for Stripe is overkill and wastes DB space at high webhook volume.

---

### M-05: Rate Limit Budget Exhaustion from Polling Rather Than Using Webhooks

**What goes wrong:** At the free tier (0–2 accounts), Zernio allows 60 req/min. At 3–2000 accounts, 600 req/min. If any part of Syncra polls Zernio for post status (e.g., a background job checking whether scheduled posts have published), it burns the rate limit budget for the entire Syncra API key. A single workspace's polling can starve all other workspaces sharing the same key.

**Why it happens:** The existing `DuePostPublishJob` polls a database table for due posts. It is natural to extend that pattern by also polling Zernio for status. But Zernio is webhook-first by design — webhooks exist precisely to eliminate the need for polling.

**Consequences:** Rate limit exhaustion (HTTP 429) from Syncra's own polling causes API calls for other operations (creating posts, fetching analytics, account health) to fail with 429. All workspaces sharing the API key are affected simultaneously.

**Prevention:**
- Use webhooks exclusively for post status updates. Do NOT poll `GET /v1/posts/{id}` on a schedule.
- The `DuePostPublishJob` should transition posts to `Publishing` state and then trust webhook delivery to drive the final state. If no webhook arrives within a configurable SLA (e.g., 6 hours), flag the post for manual review rather than polling.
- Read `X-RateLimit-Remaining` on every response. If it drops below 10% of the limit, log a warning and back off non-critical API calls.
- Verify whether Syncra maps each workspace to its own Zernio profile (recommended) or shares a single Zernio team. The rate limit is per Zernio team — a shared team means a single budget across all workspaces.

---

### M-06: LinkedIn Analytics Returning Empty for Pre-Zernio Posts

**What goes wrong:** LinkedIn's API (`memberCreatorPostAnalytics`) only returns metrics for posts published through Zernio. Posts published through any other path — including Syncra's previous direct-API integration or manual LinkedIn posts — return no data via this endpoint. The Zernio docs explicitly document this limitation.

**Why it happens:** LinkedIn limits this analytics endpoint to posts where Zernio is the authenticated publisher. There is no workaround for posts published outside Zernio.

**Consequences:** After migrating to Zernio, users see a drop in LinkedIn analytics coverage. Existing posts' analytics disappear from dashboards. Users interpret this as a data loss bug when it is a LinkedIn API constraint.

**Prevention:**
- Before the v2.0 migration, snapshot all existing LinkedIn analytics data from the current integration into Syncra's local analytics tables. This is a one-time extraction job.
- Display a banner in the analytics UI explaining the LinkedIn limitation for posts predating Zernio integration. Do not show empty/zero metrics without context.
- For company/organization LinkedIn pages (not personal accounts), this limitation does not apply — the `memberCreatorPostAnalytics` restriction is for personal accounts only. The LinkedIn analytics code path must branch on account type.

---

### M-07: WhatsApp Broadcasts Failing Due to Unapproved Templates

**What goes wrong:** WhatsApp Business broadcasts in Zernio require pre-approved message templates. Attempting to send a broadcast with a generic message to WhatsApp without a template fails with a platform-level error. Template approval takes 24–72 hours via Meta's review process. The `whatsapp.template.status_updated` webhook fires when review completes.

**Why it happens:** WhatsApp's Business Messaging Policy requires that business-initiated messages use pre-approved templates. This is a Meta policy enforced at the platform level, not a Zernio limitation.

**Consequences:** Broadcast features appear broken at launch if templates are not pre-approved before the feature goes live. The error arrives asynchronously via webhook after the broadcast is submitted, not synchronously at creation time.

**Prevention:**
- Template creation and approval must be a pre-flight step in the Broadcasts feature phase, not an afterthought. Create test templates during development so they are approved before feature launch.
- Subscribe to `whatsapp.template.status_updated` from day one. The webhook payload includes `template.status` (APPROVED, REJECTED, PENDING, etc.) and `template.reason`. Surface template rejection reasons in the UI.
- The broadcast creation flow must gate WhatsApp broadcasts behind a template selector that only shows APPROVED templates. Do not allow free-text messages to WhatsApp in broadcasts.

---

## Minor Pitfalls

---

### N-01: Timezone Handling in Cross-Platform Post Scheduling

**What goes wrong:** Zernio's post creation API takes `scheduledFor` (a datetime string) and `timezone` as separate fields. Syncra's `ScheduledTime` value object stores UTC internally. If the `IZernioClient` adapter sends the UTC value as `scheduledFor` without setting `timezone: "UTC"`, Zernio may interpret the time using the profile's default timezone, shifting the publish time by hours.

**Prevention:** Always set `timezone: "UTC"` when sending UTC datetimes to Zernio, or convert to the workspace's timezone and set `timezone` to match. Add a unit test for this mapping in the `ZernioClientAdapter`.

---

### N-02: Zernio `_id` vs Syncra GUID Identity Mismatch

**What goes wrong:** Zernio uses MongoDB-style string IDs (e.g., `post_abc123`, `acc_xyz789`). Syncra uses PostgreSQL UUIDs. A mapping layer must maintain a `ZernioPostId` string column alongside Syncra's internal `Guid Id`. If the mapper stores a Zernio `_id` into a `Guid` column without validation, EF Core will throw a format exception at persistence time.

**Prevention:** All Zernio IDs are `string` type in the domain model and persistence layer. Never cast them to `Guid`. Add `ZernioPostId string?` and `ZernioAccountId string?` columns to the relevant entities.

---

### N-03: Attempting to Delete a Zernio Post That Has Already Published

**What goes wrong:** Zernio only allows deleting posts that have not yet been published. Calling `DELETE /v1/posts/{id}` on a published or partially-published post returns 400. The existing `DeletePostCommandHandler` does not distinguish between deleting a draft/scheduled post (which Zernio can handle) and a published post (which it cannot).

**Prevention:** The `IZernioClient.DeletePostAsync` implementation must handle the 400 gracefully and return a domain-appropriate error that the UI can surface as "Cannot delete a published post" rather than a generic 500.

---

### N-04: `post.recycled` Event Creating Phantom Posts in Syncra

**What goes wrong:** Zernio fires `post.recycled` when the Zernio queue system clones a post and re-schedules it. If Syncra does not handle this event, the original Syncra `Post` record shows as `Published` while Zernio has a new scheduled post derived from it — but no corresponding Syncra record exists. The post appears in Zernio's dashboard but not in Syncra's.

**Prevention:** Subscribe to `post.recycled` from the start. The handler should either create a new Syncra `Post` record linked to the new Zernio ID, or log a warning that a recycled post exists in Zernio without a Syncra counterpart. Decide the policy (track recycled posts or ignore them) during the webhook phase, not after.

---

### N-05: Forgetting to Register the Zernio API Key in the Serilog Redaction Pipeline at Startup

**What goes wrong:** The existing `IDestructuringPolicy` collection is registered at DI startup. If the `ZernioOptions` class is registered before the Serilog destructuring policy for its `ApiKey` property is wired up, a startup log line that serializes configuration values could emit the raw key.

**Prevention:** Add the `ApiKey` property of `ZernioOptions` to the Serilog `[SecretString]` attribute (or equivalent destructuring policy in use) at the same time the configuration class is created — not as a separate ticket. Do not leave this as a follow-up.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| IZernioClient abstraction (ZERNIO-01) | SDK types leaking into Application layer (M-03) | Define all interface types in Application; translate in Infrastructure adapter only |
| Post scheduling via Zernio (ZERNIO-02) | `post.partial` state gap in domain model (C-03); per-platform daily caps (M-01) | Extend `PostStatus` or add `PostPlatformResult` table before writing any webhook handler; map cap errors to non-transient failure reason |
| Analytics via Zernio (ZERNIO-03) | LinkedIn analytics empty for pre-Zernio posts (M-06) | Snapshot existing LinkedIn data before migration; branch analytics path on account type |
| Platform account management / Connect OAuth (ZERNIO-04) | Connect token 15-min expiry (C-05) | Initiate connect flow only on user action; detect 401 and re-initiate transparently |
| Webhook handling (ZERNIO-05) | Body read ordering (C-01); event ordering violations (C-04); idempotency namespace collision (M-04) | Reuse the Stripe webhook body-read pattern exactly; guard state machine for out-of-order events; prefix keys with `zernio_event_` |
| Webhook handling (ZERNIO-05) | API key in logs (C-02) | Add `sk_[0-9a-f]{64}` redaction to Serilog pipeline before first deployment |
| Inbox integration (ZERNIO-06) | Rate limit exhaustion from polling (M-05) | Subscribe to `message.delivered`, `message.read`, `message.failed` webhooks; never poll for message status |
| Broadcasts and Sequences (ZERNIO-07) | WhatsApp unapproved templates (M-07) | Pre-approve test templates during development; gate broadcast creation on APPROVED status |
| Migration from existing API to Zernio | Entity mapping losing per-platform data (M-02); phantom posts from recycling (N-04) | Schema migration first (additive columns only); subscribe to `post.recycled` before going live |

---

## Sources

- Zernio API documentation (local: `D:\Code\Syncra\zernio-api-documentation.md`) — Webhooks section, delivery retries, idempotency, signature verification, rate limits, LinkedIn analytics note, WhatsApp template requirements
- Zernio OpenAPI spec (local: `D:\Code\Syncra\zernio-api-openapi.yaml`) — `connectToken` security scheme (15-min expiry), `PaymentRequired` response, per-platform capabilities table
- Existing Syncra implementation: `StripeWebhookController.cs`, `PaymentWebhookOrchestrator.cs`, `Post.cs` (domain entity and status transitions), `Integration.cs`, `IdempotencyRecord.cs`, `DuePostPublishJob.cs` (transient failure classification), `PostMapper.cs`
- Syncra PROJECT.md Key Decisions: IPaymentProvider abstraction, Redis distributed locking, timestamp event guards, IdempotencyRecord, Serilog sensitive-data redaction pipeline
