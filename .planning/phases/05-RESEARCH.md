# Phase 05 Research: Stripe Data Consistency & Mapping

## Objective
Research the technical approach to synchronize and map Stripe billing data (Products, Prices, Subscriptions) to the local database models (`Plan`, `Subscription`) to ensure data consistency, as defined by `05-CONTEXT.md` and `REQUIREMENTS.md`.

## Domain Analysis & Code Findings

### 1. Plan Entity Mapping Mismatch
**Current State (`Syncra.Domain.Entities.Plan`):**
- Has both `PriceMonthly` and `PriceYearly`.
- Has only a single `StripePriceId`.

**Stripe Data Model:**
- A Stripe `Product` represents the tier (e.g., "Pro").
- A Stripe `Price` represents the billing interval (e.g., "Monthly" or "Yearly") and amount. 

**Architectural Gap & Required Decision for Planner:**
Because Stripe separates Prices by interval, a single `StripePriceId` column in `Plan` conflicts with having both `PriceMonthly` and `PriceYearly` in the same record. The planner must either:
1. **Option A (Product-centric):** Map `Plan` to a Stripe `Product` (`StripeProductId`). Replace the single `StripePriceId` with `StripeMonthlyPriceId` and `StripeYearlyPriceId`. Prices and IDs are updated via `price.*` webhooks.
2. **Option B (Price-centric):** Map `Plan` to a Stripe `Price` (e.g., "Pro Monthly" is a separate `Plan` from "Pro Yearly"). Drop the redundant `PriceMonthly` / `PriceYearly` fields and use a single `PriceAmount`.

*Recommendation for Planner:* **Option A** is usually better for SaaS features (so a Workspace is on the "Pro" plan, regardless of billing frequency). The `Plan` entity should be refactored to hold `StripeMonthlyPriceId` and `StripeYearlyPriceId`. 

### 2. Subscription Entity Mapping
**Current State (`Syncra.Domain.Entities.Subscription`):**
- Links to `PlanId`.
- Contains `ProviderCustomerId` and `ProviderSubscriptionId`.
- Contains lifecycle dates (`StartsAtUtc`, `EndsAtUtc`, `TrialEndsAtUtc`, `CanceledAtUtc`) and `Status`.

**Stripe Data Model:**
- A Stripe `Subscription` connects a `Customer` to a `Price`.

**Implementation Strategy:**
- When receiving `customer.subscription.*` webhooks, the orchestrator must look up the `Plan` where `StripeMonthlyPriceId == stripePriceId` OR `StripeYearlyPriceId == stripePriceId`.
- The local `Subscription` is then linked to that `PlanId`.

### 3. Webhook Infrastructure & Sync
**Current State:**
- `StripeWebhookController` delegates to `PaymentWebhookOrchestrator` (`ProcessAsync`).
- The controller passes `provider: "stripe"`. 

**Required Implementation:**
- We need dedicated handlers for:
  - `product.created`, `product.updated`, `product.deleted`
  - `price.created`, `price.updated`, `price.deleted`
  - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- The `PaymentWebhookOrchestrator` (presumably introduced in Phase 04) should route these events to specific command handlers (e.g., `SyncStripeProductCommand`, `SyncStripePriceCommand`, `SyncStripeSubscriptionCommand`).

### 4. Initial Seed / Manual Sync
**Context Requirement:** "Provide an admin endpoint or CLI command to trigger an initial baseline sync."
**Approach:**
- Create an Admin API endpoint (`POST /api/admin/stripe/sync-plans`).
- The handler will use the Stripe SDK to list active Products and Prices, and upsert the `Plan` records in the local database.
- It will align with the "Local Configuration Overlay" rule: it will create new plans with default limits (e.g., 0) if they don't exist, which an admin can later update in the DB/config.

## Validation Architecture (Nyquist)
To satisfy Dimension 8 (Nyquist Validation), the planner must include:
1. **Mock Stripe Integration Tests:** Tests verifying that incoming `product.updated` and `price.updated` webhook payloads successfully mutate the local `Plan` records.
2. **Reconciliation Tests:** Test the Admin baseline sync endpoint to verify it correctly upserts `Plan` records when given a mocked Stripe Product/Price list.

## Summary for Planner
When drafting the PLAN.md files:
1. **Refactor `Plan.cs`** to cleanly support Monthly/Yearly Stripe Price IDs.
2. **Implement Admin Sync Endpoint** for the baseline plan sync.
3. **Implement Webhook Handlers** for `product.*` and `price.*` to keep Plans updated.
4. **Ensure `Subscription.cs` sync** logic resolves the local `PlanId` based on the incoming Stripe Price ID.
5. Create tests covering both the admin sync and webhook handlers.

## RESEARCH COMPLETE
