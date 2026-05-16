Phase 04: Payment Provider Abstraction

## Summary

**Phase 04: Payment Provider Abstraction**
**Goal:** Abstract Stripe away from the core domain/application layers. Introduce provider-neutral payment contracts (`IPaymentProvider`), update subscription domain models to use provider-agnostic identifiers, and introduce `PaymentProviderResolver` to route checkout/portal requests to the correct provider (preparing for multi-provider support). Support V1 and V2 checkout endpoints, and implement a canonical `/api/payments/webhook/{provider}` endpoint that delegates to shared webhook orchestration while maintaining a compatibility shim for legacy Stripe webhooks.
**Status:** Verified ✓

This phase implements a provider-neutral payment abstraction across the application. It introduces `IPaymentProvider` and `IPaymentProviderResolver` to handle provider resolution for checkout and portal sessions. It refactors the `Subscription` and `Workspace` domain models to use provider-agnostic billing identities. A canonical webhook endpoint `/api/payments/webhook/{provider}` has been added with shared orchestration and idempotency handling. The legacy Stripe webhook is preserved as a compatibility shim. Tests have been added to verify provider resolution, handler behavior, and webhook orchestration.

## Changes

### Plan 01: Provider-Neutral Contracts & Billing Identity
- Added provider-neutral payment contracts and DTOs.
- Generalized workspace billing identity and removed `StripeSubscriptionId` from the `Subscription` model.
- Added `StripePaymentProvider` and `PaymentProviderResolver`.
- Added migration to backfill canonical billing fields.

**Key files:**
- `src/Syncra.Application/Interfaces/IPaymentProvider.cs`
- `src/Syncra.Infrastructure/Services/PaymentProviderResolver.cs`

### Plan 02: Provider Resolution in Checkout & Portal
- Refactored checkout and portal handlers to resolve provider dynamically.
- Preserved v1 checkout endpoint behavior.
- Added v2 checkout endpoint (`POST /api/v2/workspaces/{workspaceId}/subscription/create-checkout-session`) supporting `planCode`.

**Key files:**
- `src/Syncra.Api/Controllers/SubscriptionsV2Controller.cs`
- `src/Syncra.Application/Features/Subscriptions/Commands/CreateCheckoutSessionByPlanCommandHandler.cs`

### Plan 03: Canonical Webhook Routing & Orchestration
- Added canonical provider-routed webhook endpoint.
- Implemented shared webhook orchestration in `PaymentWebhookOrchestrator`.
- Updated legacy `StripeWebhookController` to a compatibility shim.
- Updated subscription commands/handlers to provider-aware contracts.

**Key files:**
- `src/Syncra.Api/Controllers/PaymentsWebhookController.cs`
- `src/Syncra.Api/Controllers/PaymentWebhookOrchestrator.cs`

## Verification

- [x] Automated verification: passed
- API-Level Checkout/Webhook Smoke tested manually.

## Key Decisions

- Abstracted Stripe-specific types out of `Syncra.Application`.
- Use a fallback precedence for provider resolution: existing subscription provider -> workspace billing provider -> default provider (`stripe`).
- Maintain backward compatibility for v1 checkout and Stripe webhooks via shims.
