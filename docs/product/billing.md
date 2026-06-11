# Syncra Billing & Subscriptions

Syncra uses **Stripe** to handle plans, checkouts, invoices, and customer billing portals.

## Endpoints

### Customer Subscription Info

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/workspaces/{workspaceId}/subscription` | Returns active plan, status, period end date, and tier restrictions |

### Checkout Session Creation
Initiates redirect to Stripe-hosted checkout pages.

| Version | Method | Endpoint | Description |
|---|---|---|---|
| **v1** | POST | `/api/v1/workspaces/{workspaceId}/subscription/create-checkout-session` | Request carries Stripe `PriceId` |
| **v2** | POST | `/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session` | Request carries internal `PlanCode` |

*Note: v2 endpoint requires the `X-Workspace-Id` header matching the `{workspaceId}` route parameter.*

### Billing Portal Redirects
Generates a pre-signed link redirecting the user to Stripe's Customer Portal to manage cards, view invoices, or cancel subscriptions.

| Version | Method | Endpoint |
|---|---|---|
| **v1** | POST | `/api/v1/workspaces/{workspaceId}/subscription/create-portal-session` |
| **v2** | POST | `/api/v2/workspaces/{workspaceId}/subscription/create-portal-session` |

### Payment Webhooks
Stripe publishes asynchronous events regarding subscription cycles (charge success, payment failures, subscription deletion). These endpoints bypass token authorization:

- `POST /api/stripe/webhook` (Legacy/Stripe Webhook)
- `POST /api/v1/payments/webhook` (Multi-provider payment handler routing stripe events)

Webhooks perform signature verification check utilizing Stripe config parameters to avoid spoofing.
