# Phase 1 Context: Security & Multi-tenancy Hardening

## Decisions

### 1. Idempotency (Stripe Webhooks)
- **Storage:** Reuse existing `IdempotencyRecord` table.
- **Key Strategy:** Prefix Stripe Event IDs with `stripe_event_` to distinguish them from standard API idempotency keys.
- **Workflow:** 
  - `StripeWebhookController` will check for an existing record before processing.
  - If processed, return `200 OK` immediately.
  - If new, create record with `Pending` status, process event, then update to `Success`.

### 2. Tenant Resolution (Redis Caching)
- **Key Format:** `tenant_cache:{userId}:{workspaceId}`
- **Value:** Boolean (membership status) or serialized membership details.
- **TTL:** 1 hour (as a fallback).
- **Invalidation:** Immediate invalidation on any change to `WorkspaceMembers` (Add/Update/Remove). Invalidation logic will be triggered within the relevant Command Handlers in `Syncra.Application`.

### 3. Stripe Service Refactor
- **Configuration:** Inject `IOptions<StripeOptions>` and use `RequestOptions` for every API call.
- **Global State:** Remove `StripeConfiguration.ApiKey` assignment from the constructor.

## Codebase Patterns to Reuse
- **Idempotency:** `Syncra.Api.Filters.IdempotencyFilter` for logic reference.
- **Caching:** Existing Redis setup and `RedisOptions`.

## Constraints
- Do not introduce new database tables for Stripe idempotency; use the existing schema.
- Ensure all Stripe operations are async and handle `StripeException` gracefully.
