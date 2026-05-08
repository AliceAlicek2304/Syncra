---
plan_id: "05-02"
objective: "Implement Webhook Handlers for Stripe Products and Prices"
wave: 2
depends_on: ["05-01"]
files_modified:
  - "src/Syncra.Application/Payments/Handlers/StripeProductWebhookHandlers.cs"
  - "src/Syncra.Application/Payments/Handlers/StripePriceWebhookHandlers.cs"
requirements_addressed: ["REQ-2.1", "REQ-3.1"]
autonomous: true
---

# Plan 05-02: Implement Webhook Handlers for Stripe Products and Prices

## Objective
Implement event handlers for Stripe `product.*` and `price.*` webhooks to keep the local `Plan` records synchronized automatically, and register them with `IPaymentWebhookEventDispatcher`.

## Tasks

### 1. Implement Product Webhook Handlers
```xml
<task>
  <read_first>
    - src/Syncra.Api/Controllers/PaymentWebhookOrchestrator.cs
    - src/Syncra.Application/Interfaces/IPaymentWebhookEventDispatcher.cs
  </read_first>
  <action>
    Create `src/Syncra.Application/Payments/Handlers/StripeProductWebhookHandlers.cs`.
    Implement handlers for `product.created`, `product.updated`, and `product.deleted` events.
    When a product is created or updated, upsert the `Plan` record matching `StripeProductId`.
    When a product is deleted, mark the local `Plan` as inactive (`IsActive = false`).
    Register these handlers in the DI container so `IPaymentWebhookEventDispatcher` can invoke them.
  </action>
  <acceptance_criteria>
    - Handlers for `product.created`, `product.updated`, `product.deleted` exist and implement the correct interface
    - Database operations correctly upsert or deactivate the `Plan` based on `StripeProductId`
    - Handlers are registered in `DependencyInjection.cs`
  </acceptance_criteria>
</task>
```

### 2. Implement Price Webhook Handlers
```xml
<task>
  <read_first>
    - src/Syncra.Application/Payments/Handlers/StripeProductWebhookHandlers.cs
  </read_first>
  <action>
    Create `src/Syncra.Application/Payments/Handlers/StripePriceWebhookHandlers.cs`.
    Implement handlers for `price.created`, `price.updated`, and `price.deleted` events.
    When a price is created/updated: Find the `Plan` with matching `StripeProductId`.
    If the price interval is `month`, set `PriceMonthly` to the unit amount and `StripeMonthlyPriceId` to the Price ID.
    If the price interval is `year`, set `PriceYearly` and `StripeYearlyPriceId`.
    When a price is deleted, nullify the corresponding `StripeMonthlyPriceId` or `StripeYearlyPriceId`.
  </action>
  <acceptance_criteria>
    - Handlers for `price.created`, `price.updated`, `price.deleted` exist
    - Logic correctly distinguishes between monthly and yearly pricing based on the interval
    - Database updates the related `Plan` successfully
  </acceptance_criteria>
</task>
```

## Verification
- Unit tests verify that the event handlers mutate the database correctly.
- Handlers are correctly resolved by the DI container.

## must_haves
truths:
  - "Stripe is the source of truth for Plans"
  - "Webhook handlers must be idempotent"
