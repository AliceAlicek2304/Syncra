# Ops Runbook: Billing Troubleshooting

This runbook provides actionable steps for diagnosing and remediating issues related to the Syncra Billing module and Stripe integration.

## Common Issues & Diagnosis

### 1. Checkout Session Creation Fails
- **Symptoms:** User clicks "Upgrade" and sees an error message instead of being redirected to Stripe.
- **Diagnosis:**
  - Check `Syncra.Api` logs (Serilog/Sentry) for `CreateCheckoutSessionByPlanCommand` failures.
  - **Common Causes:**
    - Invalid `PlanCode` (Must be `FREE`, `PRO`, or `TEAM` - case sensitive).
    - Missing `StripeMonthlyPriceId` or `StripeYearlyPriceId` in the `Plans` table for the requested plan.
    - Workspace has no default payment provider set (should default to `stripe`).
    - Stripe API key is missing or invalid in environment variables.

### 2. Portal Session Creation Fails
- **Symptoms:** User clicks "Manage Billing" and sees an error message.
- **Diagnosis:**
  - Check logs for `CreatePortalSessionCommand` failures.
  - **Common Causes:**
    - Workspace has no `ProviderCustomerId` (Stripe Customer ID) associated with it yet.
    - User is not the Workspace Owner.

### 3. Subscription Doesn't Update After Checkout
- **Symptoms:** User completes checkout, returns to Syncra, but still sees "Free" plan.
- **Diagnosis:**
  - **Check Webhooks:** Verify that the `customer.subscription.created` or `checkout.session.completed` webhook was received.
    - Check Stripe Dashboard → Developers → Webhooks → Events.
    - Search for the event ID in `idempotency_records` table in the DB.
  - **Check Signature:** Ensure `Stripe-Signature` header validation is passing in `StripePaymentProvider`.
  - **Check Idempotency:** See if the event was marked as `Failure` or `PermanentFailure` in `idempotency_records`.

### 4. Duplicate Webhook Events
- **Symptoms:** Logs show multiple attempts to process the same Stripe Event ID.
- **Diagnosis:**
  - This is expected behavior if Stripe retries. The `PaymentWebhookOrchestrator` uses Redis distributed locks and the `idempotency_records` table to ensure a single execution.
  - Verify the unique index on `Key` (which is the Stripe Event ID) in `idempotency_records`.

## Concrete Checks

### Logs (Serilog / Sentry)
- Filter by `SourceContext`: `Syncra.Infrastructure.Services.StripePaymentProvider`
- Filter by `SourceContext`: `Syncra.Application.Features.Subscriptions`
- Search for "Webhook processing failed" or "Stripe exception".

### Stripe Dashboard
- **Events:** `https://dashboard.stripe.com/events` - Check for failed deliveries.
- **Customers:** Search by workspace ID or email to find the `cus_...` ID.
- **Subscriptions:** Check the status of `sub_...` for the customer.

### Database Tables
- `subscriptions`: Check `status`, `plan_id`, and `provider_subscription_id`.
- `workspaces`: Verify `billing_identity` (provider and customer ID).
- `idempotency_records`:
  ```sql
  SELECT * FROM idempotency_records 
  WHERE "Key" = 'evt_...' -- Stripe Event ID
  ORDER BY "CreatedAtUtc" DESC;
  ```
  - Check `Status` (2 = Success, 3 = Failure, 4 = PermanentFailure).
  - Check `AttemptCount` and `LastError` (JSON blob with exception details).

## Remediation Steps

### Replaying Webhooks
1.  **Stripe Dashboard:** Locate the failed event in Stripe Dashboard and click "Resend".
2.  **Manual Reset (Admin):** If the record is in `PermanentFailure` (5+ attempts), use the Admin API to reset it:
    ```bash
    POST /api/admin/webhooks/{id}/reset
    ```
    Then resend from Stripe.

### Plan Sync
If plans in the DB are out of sync with Stripe prices:
- Use `AdminStripeSyncController` (if available) to re-sync plans:
  ```bash
  POST /api/admin/stripe/sync-plans
  ```

### Manual Customer Linking
If a workspace is disconnected from its Stripe Customer:
- Manually update the `workspaces` table with the correct `provider_customer_id` from the Stripe Dashboard.
