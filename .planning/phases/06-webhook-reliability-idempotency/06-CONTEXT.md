# Phase 6: Webhook Reliability & Idempotency - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Making webhook processing robust, repeatable, and safe under retries — ensuring Stripe webhook events are processed idempotently with proper failure handling, ordering rules, and debugging support.
</domain>

<decisions>
## Implementation Decisions

### Failure handling & retry policy
- **D-01:** Return 500 to Stripe when a handler fails to leverage Stripe's built-in retry backoff.
- **D-02:** Add `AttemptCount` to `IdempotencyRecord` with a threshold of 5. After 5 failures, set status to `PermanentFailure` and return 200 to stop Stripe retries.
- **D-03:** Add `LastError` JSON field to `IdempotencyRecord` to store `{ message, exceptionType, truncatedStackTrace, attemptTimestamp }` for the latest error only. Full stack traces remain in structured logs.
- **D-04:** Extend `IdempotencyRecord` expiration (`ExpiresAtUtc`) to 30 days.

### Event ordering & late delivery
- **D-05:** Implement a hybrid upsert + timestamp guard. Add `LastEventTimestampUtc` to relevant entities and only apply updates if Stripe's `created` timestamp is `>=` the local timestamp.
- **D-06:** Apply the timestamp guard to `Subscription` and `Plan` entities. Other entities continue using plain upsert.
- **D-07:** Create missing entities with best-effort data if `WorkspaceId` is present in metadata. If missing, log a warning and skip creation.

### Observability & debugging
- **D-08:** Create a dedicated read-only Admin API endpoint (`GET /api/admin/webhooks/failed`) querying `IdempotencyRecord` with pagination and filters. No frontend UI needed.
- **D-09:** Create an Internal Reset API (`POST /api/admin/webhooks/{id}/reset`) that resets an `IdempotencyRecord` (Status=Pending, AttemptCount=0, clears LockedUntilUtc and LastError). Admins will use Stripe Dashboard to "Resend" the payload.

### Concurrency & locking
- **D-10:** Use Redis distributed lock (timeout 30s) around the idempotency check and dispatch flow to prevent concurrent races.
- **D-11:** Add a `UNIQUE INDEX` on the `Key` column in `IdempotencyRecord` as a database-level safety net. If lock fails or DB throws constraint exception, assume event is already processing and return 200.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/ROADMAP.md` — Phase goals and context
- `.planning/REQUIREMENTS.md` — Project constraints

### Webhook Core
- `src/Syncra.Api/Controllers/PaymentWebhookOrchestrator.cs` — Central webhook dispatcher
- `src/Syncra.Domain/Entities/IdempotencyRecord.cs` — The idempotency tracking entity

### Event Handlers
- `src/Syncra.Application/Payments/PaymentWebhookEventDispatcher.cs` — The event dispatcher interface
- `src/Syncra.Application/Payments/Handlers/StripeSubscriptionWebhookHandlers.cs` — The handler that needs timestamp guards

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaymentWebhookOrchestrator` handles dispatching.
- Redis caching is already set up and used in the application, which supports adding a distributed lock easily.
- `StripeSubscriptionWebhookHandlers` already has the upsert logic.

</code_context>

<specifics>
## Specific Ideas

No specific design requirements — focusing on pure backend reliability.

</specifics>

<deferred>
## Deferred Ideas

- Admin Dashboard UI for webhooks
- Event archiving job for expired records

</deferred>

---

*Phase: 06-webhook-reliability-idempotency*
*Context gathered: 2026-05-01*
