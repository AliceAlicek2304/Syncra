# Phase 4 Research: Payment Provider Abstraction

## Objective
Introduce a provider abstraction for billing so checkout, portal, and webhook flows are no longer coupled directly to Stripe-specific application contracts.

## Current Architecture Findings

### 1. Billing entry points are Stripe-specific today
- `src/Syncra.Api/Controllers/SubscriptionsController.cs`
  - `POST api/v1/workspaces/{workspaceId}/subscription/create-checkout-session`
  - `POST api/v1/workspaces/{workspaceId}/subscription/create-portal-session`
- `src/Syncra.Api/Controllers/StripeWebhookController.cs`
  - `POST api/stripe/webhook`

### 2. Application layer depends directly on `IStripeService`
- `src/Syncra.Application/Interfaces/IStripeService.cs` defines Stripe-shaped operations:
  - `GetOrCreateCustomerAsync`
  - `CreateCheckoutSessionAsync`
  - `CreatePortalSessionAsync`
- `CreateCheckoutSessionCommandHandler` and `CreatePortalSessionCommandHandler` inject `IStripeService` directly.
- This means provider selection is impossible without editing business handlers.

### 3. Infrastructure Stripe implementation is concentrated in one service
- `src/Syncra.Infrastructure/Services/StripeService.cs`
- Strengths:
  - Stripe SDK access is already isolated to Infrastructure.
  - Customer, checkout, and portal creation are centralized.
- Gaps:
  - Service creates Stripe SDK clients directly (`new CustomerService()`, `new SessionService()`, etc.), which makes testing difficult.
  - No provider-neutral contracts exist for checkout, portal, or webhook parsing.

### 4. Webhook flow is tightly coupled to Stripe controller + Stripe event types
- `StripeWebhookController` performs all of the following in one class:
  - request body read
  - Stripe signature validation via `EventUtility.ConstructEvent`
  - idempotency record creation/update
  - event-type switching on Stripe event names
  - MediatR dispatch to subscription commands
- Idempotency key currently uses `stripe_event_{eventId}`.
- Existing behavior must remain backward-compatible for Stripe.

### 5. Domain model is only partially generalized already
- `src/Syncra.Domain/Entities/Subscription.cs` already contains:
  - `Provider`
  - `ProviderCustomerId`
  - `ProviderSubscriptionId`
- But it still also contains `StripeSubscriptionId`.
- `src/Syncra.Domain/Entities/Workspace.cs` only has `StripeCustomerId`; it does not yet have generic workspace billing identity.

### 6. Repository layer has a mismatch that Phase 4 should normalize
- `ISubscriptionRepository.GetByStripeSubscriptionIdAsync(string stripeSubscriptionId)` is Stripe-named.
- `SubscriptionRepository.GetByStripeSubscriptionIdAsync(...)` actually queries `ProviderSubscriptionId`.
- This is a strong signal that the data model has already started shifting but the application contract and naming have not caught up.

### 7. EF mappings support subscription-level provider identity, but not workspace-level billing identity
- `src/Syncra.Infrastructure/Persistence/Configurations/SubscriptionConfigurations.cs` maps:
  - `provider`
  - `provider_customer_id`
  - `provider_subscription_id`
- `src/Syncra.Infrastructure/Persistence/Configurations/WorkspaceConfigurations.cs` does not yet map:
  - `BillingProvider`
  - `BillingCustomerId`

### 8. Existing plan data can support a v2 `planCode` checkout endpoint
- `src/Syncra.Domain/Entities/Plan.cs` stores:
  - `Code`
  - `StripeProductId`
  - `StripePriceId`
- This means a new `api/v2/...` checkout flow can accept `planCode`, resolve the `Plan`, and use the provider-specific price identifier from persisted plan data while Phase 5 handles broader reconciliation/mapping hardening.

## Testing / Pattern Findings

### 1. Controller test pattern already exists
- `tests/Syncra.UnitTests/Api/StripeWebhookControllerTests.cs` uses `WebApplicationFactory<Program>` + `ConfigureTestServices`.
- This is the right pattern for testing the new provider-routed webhook controller and keeping the legacy Stripe shim covered.

### 2. Stripe service tests are currently weak / SDK-bound
- `tests/Syncra.UnitTests/Infrastructure/StripeServiceTests.cs`
- Tests currently expect Stripe SDK failures because the implementation constructs SDK services internally.
- Phase 4 should prefer unit tests around resolver/dispatch contracts and keep Stripe SDK interactions behind the provider boundary.

### 3. Some subscription controller tests are stale
- `tests/Syncra.UnitTests/Api/SubscriptionsControllerTests.cs` is wrapped in `#if FALSE` and does not match the current MediatR-based controller shape.
- New Phase 4 tests should target current handlers and/or integration-style controller behavior rather than reviving outdated direct-controller construction patterns.

## Implementation Implications for Planning

### Required invariants
- No Stripe SDK types should leak outside Infrastructure.
- Existing v1 checkout endpoint must continue accepting `priceId`.
- Add a new v2 checkout endpoint that accepts `planCode`.
- Provider selection should resolve from `Subscription.Provider` when a subscription exists, otherwise use a configured default provider.
- Introduce canonical webhook route: `api/payments/webhook/{provider}`.
- Keep `api/stripe/webhook` as a backward-compatible shim to provider `stripe`.
- Preserve Stripe idempotency semantics using generalized key format `{provider}_event_{eventId}`.

### Safe phase split
A clean split for execution is:
1. **Foundation**
   - domain + EF + migration
   - provider interfaces/DTOs
   - registry/resolver
   - Stripe provider adaptation
2. **Checkout / Portal application flow**
   - handler + controller refactor to use resolver
   - v2 plan-based checkout endpoint
   - backward-compatible v1 route
3. **Webhook abstraction**
   - normalized webhook event model
   - provider-routed webhook controller + legacy shim
   - provider-aware subscription update/cancel flow
   - tests for resolver + webhook behavior

## Recommended Files to Touch
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/04-CONTEXT.md`
- `src/Syncra.Application/Interfaces/IStripeService.cs`
- `src/Syncra.Application/Interfaces/IPaymentProvider.cs`
- `src/Syncra.Application/Interfaces/IPaymentProviderResolver.cs`
- `src/Syncra.Application/Features/Subscriptions/Commands/CreateCheckoutSessionCommandHandler.cs`
- `src/Syncra.Application/Features/Subscriptions/Commands/CreatePortalSessionCommandHandler.cs`
- `src/Syncra.Api/Controllers/SubscriptionsController.cs`
- `src/Syncra.Api/Controllers/StripeWebhookController.cs`
- `src/Syncra.Domain/Entities/Workspace.cs`
- `src/Syncra.Domain/Entities/Subscription.cs`
- `src/Syncra.Domain/Interfaces/ISubscriptionRepository.cs`
- `src/Syncra.Infrastructure/Services/StripeService.cs`
- `src/Syncra.Infrastructure/DependencyInjection.cs`
- `src/Syncra.Infrastructure/Persistence/Configurations/WorkspaceConfigurations.cs`
- `src/Syncra.Infrastructure/Persistence/Configurations/SubscriptionConfigurations.cs`
- `src/Syncra.Infrastructure/Repositories/SubscriptionRepository.cs`
- `tests/Syncra.UnitTests/Infrastructure/StripeServiceTests.cs`
- `tests/Syncra.UnitTests/Api/StripeWebhookControllerTests.cs`

## Planning Recommendation
Proceed with three plans:
- `04-01`: provider abstraction + billing identity foundation
- `04-02`: checkout / portal flows + v2 checkout endpoint
- `04-03`: provider-routed webhooks + provider-aware subscription persistence + tests
