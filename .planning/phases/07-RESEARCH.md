# Phase 07 Research — Billing UX (Checkout + Customer Portal) & Documentation

**Date:** 2026-05-01
**Phase:** 7 — Billing UX (Checkout + Customer Portal) & Documentation

## What this phase needs to succeed
This phase is primarily a **frontend integration + UX + docs** phase, but it touches backend contracts and authorization.

Key success factors:
- Frontend can **start Stripe Checkout** via the **v2 planCode endpoint**.
- Frontend can **open Stripe Customer Portal**.
- Billing screen **re-fetches current subscription state** after returning from Stripe and shows a clear outcome banner.
- Only **workspace owner** can trigger billing actions (UI gating + server-side enforcement).
- `.planning` phase artifacts ship **module overview + endpoints**, **manual UAT checklist**, and an **ops runbook**.

---

## Current backend contracts (source of truth)

### 1) Create Checkout Session (v2 — REQUIRED by Phase 7)
**Route:** `POST /api/v2/workspaces/{workspaceId}/subscription/create-checkout-session`

**Controller:** `src/Syncra.Api/Controllers/SubscriptionsV2Controller.cs`

**Request DTO:** `src/Syncra.Application/DTOs/Subscriptions/CheckoutSessionDto.cs`
```csharp
public record CreateCheckoutSessionByPlanRequest(
    string PlanCode,
    string? Interval,
    string? SuccessUrl,
    string? CancelUrl);
```

**Behavior:** `CreateCheckoutSessionByPlanCommandHandler`:
- Looks up plan by **exact** `Plan.Code` via `IPlanRepository.GetByCodeAsync` (currently **case-sensitive**).
- Resolves provider via subscription → workspace → default provider (`stripe`).
- Selects Stripe price id based on `Interval`:
  - `Interval == "year"` → `StripeYearlyPriceId`
  - otherwise → `StripeMonthlyPriceId`

**Response DTO:**
```csharp
public record CreateCheckoutSessionResponse(
    string CheckoutUrl,
    string SessionId,
    string? CustomerId,
    string? ClientReferenceId);
```

**Frontend implication:**
- Plan codes must match DB codes (see **Plan codes** below).
- `SuccessUrl`/`CancelUrl` should be **absolute URLs** (Stripe requirement).

### 2) Create Portal Session (v1 — currently exists)
**Route:** `POST /api/v1/workspaces/{workspaceId}/subscription/create-portal-session`

**Controller:** `src/Syncra.Api/Controllers/SubscriptionsController.cs`

**Request DTO:**
```csharp
public record CreatePortalSessionRequest(string? ReturnUrl);
```

**Response DTO:**
```csharp
public record CreatePortalSessionResponse(string PortalUrl);
```

**Handler:** `CreatePortalSessionCommandHandler`
- Provider-resolved via subscription/workspace/default provider.
- Calls `IPaymentProvider.CreatePortalSessionAsync(...)` → Stripe Billing Portal.

### 3) Get Current Subscription (v1 — for auto-refresh)
**Route:** `GET /api/v1/workspaces/{workspaceId}/subscription`

**Controller:** `src/Syncra.Api/Controllers/SubscriptionsController.cs`

**Response DTO:** `src/Syncra.Application/DTOs/CurrentSubscriptionDto.cs`
- Returns stable fields for UI:
  - `Status` ("Free" or enum string)
  - `PlanCode`, `PlanName`
  - `TrialEndsAtUtc`, `EndsAtUtc`, `CanceledAtUtc`
  - `Provider`, `ProviderCustomerId`, `ProviderSubscriptionId`

**Note:** no explicit “next invoice date” field; UI should show:
- If `TrialEndsAtUtc != null` → "Trial ends" date
- Else if `EndsAtUtc != null` → "Renews / Ends" date (best available)

---

## Tenant & auth considerations (important)

### Authentication
All billing endpoints are `[Authorize]`. Frontend currently uses a **mock AuthContext** and does not have a real token flow.

**Pragmatic approach for Phase 7:**
- Implement billing calls assuming an access token may be available in `localStorage` (e.g. `syncra_access_token`).
- If missing, surface an explicit UI error (so the UX is still testable).

### Tenant resolution
There is middleware `TenantResolutionMiddleware` which validates membership when request includes header:
- `X-Workspace-Id: {workspaceId}`

**Important:** middleware does NOT enforce that the route `{workspaceId}` matches the header workspace.

**Recommended Phase 7 hardening (at least for billing endpoints):**
- Require the header for billing actions.
- Enforce `X-Workspace-Id == {workspaceId}` for billing endpoints.

This reduces the risk of a user accessing another workspace by altering the route param.

### Owner-only billing actions
Phase decision D-02: only the workspace owner can start Checkout / Portal.

**Recommendation:**
- Frontend: hide CTAs for non-owners.
- Backend: enforce owner-only on mutating billing actions (checkout/portal session creation) to prevent bypass.

---

## Plan codes & interval mapping

Seeded plan codes are **uppercase** in `src/Syncra.Infrastructure/Persistence/Seed/PlanSeedData.cs`:
- `FREE`
- `PRO`
- `TEAM`

`IPlanRepository.GetByCodeAsync` uses `p.Code == code` (case-sensitive). Therefore the frontend should send uppercase codes.

Interval mapping (per handler):
- `interval = "month"` → monthly price id
- `interval = "year"` → yearly price id

---

## Stripe redirect + return signaling
Phase decision D-11:
- `?billing=success|cancel|portal_return`

**Recommended URLs:**
- Checkout success URL: `${origin}${basename}/app/settings?billing=success`
- Checkout cancel URL: `${origin}${basename}/app/settings?billing=cancel`
- Portal return URL: `${origin}${basename}/app/settings?billing=portal_return`

After return, Billing section should:
1) read the query param and show a banner
2) call `GET current subscription` to refresh
3) optionally clean the URL (replace state) so banner doesn’t persist on refresh

---

## Frontend architecture recommendation

### Suggested files
- `fe/src/context/BillingContext.tsx` — unified state & side effects
- `fe/src/components/billing/BillingSection.tsx` + `.module.css` — UI entry point inside Settings
- `fe/src/utils/api.ts` — small fetch wrapper (base URL + auth header)
- `fe/src/types/billing.ts` — DTO types for subscription & checkout/portal responses

### BillingContext responsibilities
- `loadCurrentSubscription()` (GET)
- `startCheckout(planCode, interval)` (POST v2)
- `openPortal()` (POST v1)
- `status`: idle/loading/error + last error message
- `redirecting`: boolean for “Redirecting…” state

### Error/failure paths to explicitly handle
From Phase decisions D-12..D-15:
- Checkout canceled (billing=cancel)
- Network/API error when creating checkout session
- Portal session creation fails
- Stale subscription after return → ensure refetch happens

---

## Documentation deliverables (must ship)
Per D-16/D-17, docs live under `.planning/phases/07-billing-ux-documentation/`:
- Billing module overview + endpoints (backend + frontend wiring)
- Frontend Billing UX notes + manual UAT checklist
- Ops runbook (common failure modes, how to debug, what logs to check)

---

## Risks / unknowns
- Frontend currently has no real auth token management; API calls will fail without additional setup.
- Vite dev server has no proxy config; using relative `/api/...` calls may not work during local FE dev unless:
  - backend serves FE, or
  - a proxy is added, or
  - an absolute API base URL is configured.

---

## Proposed plan structure (high-level)
- **Plan 07-01 (wave 1):** Backend guardrails + (optional) v2 portal endpoint + owner-only enforcement + tests
- **Plan 07-02 (wave 1):** FE BillingContext + API helper + types
- **Plan 07-03 (wave 2):** Billing UI inside Settings (pricing cards, portal button, banners, redirect states)
- **Plan 07-04 (wave 3):** `.planning` docs + UAT checklist + ops runbook

## RESEARCH COMPLETE
