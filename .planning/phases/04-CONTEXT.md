# Phase 4 Context: Payment Provider Abstraction

## Overview
This phase introduces a payment-provider abstraction and registry so billing flows (checkout, portal, webhooks) are not coupled directly to Stripe.

## Implementation Decisions

### 1. Strict provider abstraction (no Stripe types outside Infrastructure)
- Application/API code must not reference Stripe SDK types.
- Providers return Syncra-defined DTOs (e.g., checkout session result) and a normalized webhook event model.

### 2. `IPaymentProvider` surface area (minimal, app-driven)
- `IPaymentProvider` exposes only the operations the app uses today:
  - Create checkout session
  - Create customer portal session
  - Verify + parse incoming webhook payload into a normalized event object
- Any provider-specific helper logic (e.g., “get or create customer”) stays internal to the provider implementation.

### 3. Checkout API versioning (introduce plan-based checkout)
- Keep the existing v1 endpoint contract that posts ` priceId` (treated as provider price identifier).
- Add a new v2 endpoint that accepts `planCode`.
- Versioning approach:
  - New API version path: `api/v2/...` for plan-based checkout
  - Keep existing `api/v1/.../create-checkout-session` for backward compatibility

### 4. Provider selection + registry
- Provider resolution is **per-subscription**:
  - `Subscription.Provider` is the source of truth when a subscription exists.
  - When a subscription does not exist, fall back to a configured default provider.
- Provider identifiers are stable, lowercase strings (e.g., `stripe`).
- Implement a registry/resolver pattern in DI that resolves a provider by identifier.

### 5. Data model + backward compatibility

#### 5.1 Workspace customer identity (make generic at the workspace level)
- Add workspace-level fields:
  - `BillingProvider`
  - `BillingCustomerId`
- Backfill strategy:
  - If `StripeCustomerId` exists, set `BillingProvider = "stripe"` and `BillingCustomerId = StripeCustomerId`.
- Keep `StripeCustomerId` for backward compatibility during the transition, but new logic should prefer `BillingCustomerId`.

#### 5.2 Subscription identity (remove Stripe-specific subscription ID)
- Migrate away from `Subscription.StripeSubscriptionId` entirely.
- Canonical subscription identity becomes:
  - `Subscription.Provider`
  - `Subscription.ProviderSubscriptionId`

### 6. Webhook routing + idempotency boundaries
- Canonical webhook route becomes:
  - `/api/payments/webhook/{provider}`
- Keep `/api/stripe/webhook` as a shim that delegates to provider=`stripe`.
- Signature verification + parsing happens inside the provider implementation.
- Idempotency key format:
  - `{provider}_event_{eventId}`
  - For Stripe this preserves the existing `stripe_event_{id}` shape.
- Webhook business handling is application-owned:
  - Provider returns a normalized event model
  - Application maps events to MediatR commands via a dispatcher/handler layer

## Notes / Deferred to later phases
- Subscription plan reconciliation (mapping webhook/session data to `Plan`) is handled in Phase 5 (Stripe Data Consistency & Mapping).

## Canonical refs
- `be/.planning/ROADMAP.md`
- `be/.planning/REQUIREMENTS.md`
- `be/src/Syncra.Application/Interfaces/IStripeService.cs`
- `be/src/Syncra.Infrastructure/Services/StripeService.cs`
- `be/src/Syncra.Api/Controllers/SubscriptionsController.cs`
- `be/src/Syncra.Api/Controllers/StripeWebhookController.cs`
- `be/src/Syncra.Domain/Entities/Subscription.cs`
- `be/src/Syncra.Domain/Entities/Workspace.cs`
- `be/src/Syncra.Domain/Entities/Plan.cs`
- `be/src/Syncra.Infrastructure/DependencyInjection.cs`
