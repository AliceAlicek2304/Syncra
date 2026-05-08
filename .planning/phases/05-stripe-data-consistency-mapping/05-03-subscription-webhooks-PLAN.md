---
plan_id: "05-03"
objective: "Implement Webhook Handlers for Stripe Subscriptions"
wave: 3
depends_on: ["05-02"]
files_modified:
  - "src/Syncra.Application/Payments/Handlers/StripeSubscriptionWebhookHandlers.cs"
  - "src/Syncra.Domain/Interfaces/ISubscriptionRepository.cs"
  - "src/Syncra.Infrastructure/Repositories/SubscriptionRepository.cs"
requirements_addressed: ["REQ-2.1", "REQ-3.1"]
autonomous: true
---

# Plan 05-03: Implement Webhook Handlers for Stripe Subscriptions

## Objective
Implement event handlers for Stripe `customer.subscription.*` webhooks to keep local `Subscription` records synchronized with Stripe, using the local `Plan` as the mapping target.

## Tasks

### 1. Implement Subscription Webhook Handlers
```xml
<task>
  <read_first>
    - src/Syncra.Domain/Entities/Subscription.cs
    - src/Syncra.Domain/Interfaces/IPlanRepository.cs
  </read_first>
  <action>
    Create `src/Syncra.Application/Payments/Handlers/StripeSubscriptionWebhookHandlers.cs`.
    Implement handlers for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
    When a subscription is created/updated:
    - Extract `StripeCustomerId` and the first item's `Price.Id` from the webhook payload.
    - Query `IPlanRepository` for the matching `PlanId` based on the Stripe Price ID.
    - Find the local `Subscription` using `ProviderSubscriptionId` or create it if missing.
    - Update `PlanId`, `ProviderCustomerId`, `Status`, `StartsAtUtc`, `EndsAtUtc`, `CanceledAtUtc`, and `TrialEndsAtUtc` to match Stripe's state.
    - Save changes to the database.
    Register these handlers in the DI container.
  </action>
  <acceptance_criteria>
    - Handlers for `customer.subscription.created`, `updated`, `deleted` exist
    - The correct local `Plan` is looked up via `Price.Id` and associated with the `Subscription`
    - Lifecycle dates and status are updated correctly
  </acceptance_criteria>
</task>
```

### 2. Update Subscription Repository
```xml
<task>
  <read_first>
    - src/Syncra.Infrastructure/Repositories/SubscriptionRepository.cs
  </read_first>
  <action>
    Ensure `ISubscriptionRepository` and `SubscriptionRepository` have an efficient method to fetch a subscription by its `ProviderSubscriptionId` (e.g., `GetByProviderSubscriptionIdAsync(string provider, string subscriptionId)`).
  </action>
  <acceptance_criteria>
    - `GetByProviderSubscriptionIdAsync` method exists and is correctly implemented
  </acceptance_criteria>
</task>
```

## Verification
- Unit tests simulate incoming `customer.subscription.updated` events and verify `Subscription` mutations.
- The `PlanId` resolution succeeds when the price ID matches either the monthly or yearly ID.

## must_haves
truths:
  - "Webhook handlers must be idempotent"
