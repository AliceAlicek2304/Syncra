---
phase: "05"
plan: "05-04"
gap_closure: true
subsystem: "Stripe Sync"
description: "Fix Stripe API Key error in AdminStripeSyncController by injecting StripeOptions and using RequestOptions."
---

# Phase 05 Plan 05-04: Fix Stripe API Key error in AdminStripeSyncController

The `AdminStripeSyncController` currently initializes Stripe services (`ProductService`, `PriceService`) without providing an API Key, leading to `Stripe.StripeException: No API key provided`. This plan fixes it by injecting `IOptions<StripeOptions>` and passing the secret key to the Stripe service methods.

## User Review Required
None.

## Proposed Changes

### Syncra.Api

#### [MODIFY] [AdminStripeSyncController.cs](file:///home/tai/Code/Syncra/be/src/Syncra.Api/Controllers/AdminStripeSyncController.cs)
- Inject `IOptions<StripeOptions>` in constructor.
- Store `StripeOptions` in a private field.
- In `SyncPlans` method, create `RequestOptions` with `ApiKey = _stripeOptions.SecretKey`.
- Pass `RequestOptions` to `productService.ListAsync` and `priceService.ListAsync`.

## Verification Plan

### Manual Verification
- Run the application: `dotnet run` in `be/src/Syncra.Api`.
- Trigger the admin sync endpoint: `POST /api/admin/stripe/sync-plans`.
- Verify the response is `200 OK` and plans are synchronized in the database.
