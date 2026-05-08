# Phase 6: Webhook Reliability & Idempotency - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 6-webhook-reliability-idempotency
**Areas discussed:** Failure handling & retry policy, Event ordering & late delivery, Observability & debugging, Concurrency & locking

---

## Failure handling & retry policy

| Option | Description | Selected |
|--------|-------------|----------|
| Return 500 (current) | Return 500 to let Stripe retry | ✓ |
| Add max attempt counter (5) | Stop after 5 failures | ✓ |
| Structured error JSON | Store LastError JSON field | ✓ |
| Extend to 30 days | Expiration extended to 30 days | ✓ |

**User's choice:** Keep 500 response, add 5-attempt limit with PermanentFailure status, store JSON LastError (latest only), extend expiration to 30 days.

---

## Event ordering & late delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: upsert + timestamp | Timestamp guard on critical fields | ✓ |
| Subscription + Plan | Guard Subscription and Plan | ✓ |
| Create with best-effort | Create if WorkspaceId present, else skip | ✓ |

**User's choice:** Hybrid approach with LastEventTimestampUtc column for Subscription and Plan. Keep best-effort creation for missing entities.

---

## Observability & debugging

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Admin API Endpoint | Read-only endpoint for failed records | ✓ |
| Internal Reset API + Stripe | Reset record and use Stripe resend | ✓ |

**User's choice:** GET /api/admin/webhooks/failed endpoint for visibility. POST /api/admin/webhooks/{id}/reset endpoint to reset record before manual Stripe resend.

---

## Concurrency & locking

| Option | Description | Selected |
|--------|-------------|----------|
| Redis Lock + Unique Index | Redis lock + DB constraint safety net | ✓ |

**User's choice:** Redis distributed lock with 30s timeout around check/dispatch + UNIQUE INDEX on Key column in IdempotencyRecord as a safety net (return 200 on conflict).

---

## Deferred Ideas

- Admin Dashboard UI for webhooks
- Event archiving job for expired records
