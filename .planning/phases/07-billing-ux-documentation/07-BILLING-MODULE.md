# Billing Module Overview

The Billing module provides workspace-scoped subscription management, allowing users to purchase plans via Stripe Checkout and manage their subscriptions via the Stripe Customer Portal.

## Purpose & Scope
- **Location:** Settings → Billing
- **Access:** Restricted to Workspace Owners only.
- **Provider:** Stripe (handled via `StripePaymentProvider`).

## Backend Endpoints

All endpoints require:
- `Authorization: Bearer <token>`
- `X-Workspace-Id: <workspaceId>` (Must match the `{workspaceId}` route parameter)

### 1. Create Checkout Session (v2)
Initiates a Stripe Checkout session for a specific plan and interval.

- **Method:** `POST`
- **Route:** `/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session`
- **Request Body:**
  ```json
  {
    "planCode": "PRO",
    "interval": "month",
    "successUrl": "https://app.syncra.com/app/settings?billing=success",
    "cancelUrl": "https://app.syncra.com/app/settings?billing=cancel"
  }
  ```
- **Plan Codes:** `FREE`, `PRO`, `TEAM` (Uppercase required)
- **Intervals:** `month` (default), `year`
- **Response:**
  ```json
  {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_test_...",
    "customerId": "cus_...",
    "clientReferenceId": "..."
  }
  ```

### 2. Create Portal Session (v2)
Generates a link to the Stripe Customer Portal for managing existing subscriptions.

- **Method:** `POST`
- **Route:** `/api/v2/workspaces/{workspaceId}/subscription/create-portal-session`
- **Request Body:**
  ```json
  {
    "returnUrl": "https://app.syncra.com/app/settings?billing=portal_return"
  }
  ```
- **Response:**
  ```json
  {
    "portalUrl": "https://billing.stripe.com/..."
  }
  ```
> Note: v1 also exists at `/api/v1/workspaces/{workspaceId}/subscription/create-portal-session`.

### 3. Get Current Subscription (v1)
Fetches the current subscription status for the workspace.

- **Method:** `GET`
- **Route:** `/api/v1/workspaces/{workspaceId}/subscription`
- **Response:**
  ```json
  {
    "status": "Active",
    "planCode": "PRO",
    "planName": "Pro Plan",
    "trialEndsAtUtc": null,
    "endsAtUtc": "2026-06-01T00:00:00Z",
    "canceledAtUtc": null,
    "provider": "stripe",
    "providerCustomerId": "cus_...",
    "providerSubscriptionId": "sub_..."
  }
  ```

## Return Query Param Contract
After returning from Stripe, the frontend receives one of the following query parameters to signal the outcome:

| Parameter | Meaning | Expected UI Action |
|-----------|---------|---------------------|
| `?billing=success` | Checkout completed successfully | Show success banner + refresh subscription |
| `?billing=cancel` | Checkout was canceled by user | Show info/cancel banner |
| `?billing=portal_return` | Returned from Customer Portal | Refresh subscription |
