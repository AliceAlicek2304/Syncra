---
status: completed
phase: 05-stripe-data-consistency-mapping
source: 
  - .planning/phases/05-stripe-data-consistency-mapping/05-01-database-and-sync-admin-SUMMARY.md
  - .planning/phases/05-stripe-data-consistency-mapping/05-02-plan-webhooks-SUMMARY.md
  - .planning/phases/05-stripe-data-consistency-mapping/05-03-subscription-webhooks-SUMMARY.md
started: 2026-04-30T03:51:42+07:00
updated: 2026-04-30T03:51:42+07:00
---

## Current Test

number: 2
name: Admin Plan Sync
expected: |
  Trigger the admin sync endpoint (`POST /api/admin/stripe-sync/plans`) and verify it fetches/updates plans correctly from Stripe.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Admin Plan Sync
expected: |
  Trigger the admin sync endpoint (`POST /api/admin/stripe-sync/plans`) and verify it fetches/updates plans correctly from Stripe.
result: pass

### 3. Checkout Session Creation
expected: |
  Verify that creating a checkout session uses the correct Stripe Price ID (Monthly vs Yearly) from the Plan entity based on the requested billing period.
result: pass

### 4. Stripe Product Webhook
expected: |
  Simulate a `product.updated` event from Stripe and verify the local `Plan` is updated with the new product metadata.
result: pass

### 5. Stripe Price Webhook
expected: |
  Simulate a `price.created` or `price.updated` event from Stripe and verify the local `Plan` pricing (monthly or yearly) is updated.
result: pass

### 6. Stripe Subscription Webhook
expected: |
  Simulate `customer.subscription.created`, `updated`, or `deleted` events and verify the local `Subscription` record is updated correctly.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

(None)
