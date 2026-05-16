# Research: Phase 1 (Security & Multi-tenancy Hardening)

## 1. Stripe Webhook Flow
- **Controller:** `StripeWebhookController` handles `checkout.session.completed` and `customer.subscription.deleted`.
- **Mechanism:** Uses `EventUtility.ConstructEvent` and sends commands via MediatR (`UpdateSubscriptionCommand`, etc.).
- **Missing:** No check for duplicate events (Stripe `Event-Id`).

## 2. IdempotencyRecord Schema (Mandatory Fields)
The following fields MUST be set when creating an `IdempotencyRecord`:
- `Key`: Use `stripe_event_{eventId}`
- `RequestHash`: Use `eventId` (since event content is unique per ID)
- `Endpoint`: `/api/webhooks/stripe`
- `Method`: `POST`
- `Status`: `Pending`
- `ExpiresAtUtc`: `DateTime.UtcNow.AddDays(7)`
- `WorkspaceId`: Extract from Stripe `client_reference_id` or `metadata["workspace_id"]`.

## 3. Redis Patterns
- **Provider:** `IDistributedCache` via StackExchange.Redis.
- **Tenant Cache Strategy:** Store boolean membership status for `tenant_cache:{userId}:{workspaceId}`.

## 4. Workspace Membership
- **Entity:** `WorkspaceMember`.
- **Mutation Points:** Only `CreateWorkspaceCommandHandler` currently exists in the project. Other handlers mentioned in earlier research (Invite/Remove) are not yet implemented.

## 5. Stripe Service (Refactor)
- **Baseline Needs:** Existing `GetOrCreateCustomerAsync` and `CreateCheckoutSessionAsync` methods need unit tests before refactoring.
- **Target:** Remove global `StripeConfiguration.ApiKey`. Use `RequestOptions` for all calls.
