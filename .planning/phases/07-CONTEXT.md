SS# Phase 7 Context: Billing UX (Checkout + Customer Portal) & Documentation

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Shipping the frontend billing experience so users can:
- Start Stripe Checkout for plan purchase/change
- Open Stripe Customer Portal for self-serve subscription management

Plus: update `.planning` documentation to reflect the billing module structure and provide a manual UAT checklist + ops runbook.
</domain>

<decisions>
## Implementation Decisions

### UI entry point + access
- **D-01:** Billing UI lives in **Settings → Billing** (no dedicated `/app/billing` route for v1.1).
- **D-02:** Only the **workspace owner** can manage billing actions (start Checkout / open Customer Portal). Non-owners can view basic plan info but should not see action CTAs.
- **D-03:** The app shows current plan + upgrade/manage CTAs **only** inside Settings → Billing (no sidebar/dashboard upsell for v1.1).

### Checkout UX
- **D-04:** Frontend uses **v2 checkout** contract: `POST /api/v2/workspaces/{workspaceId}/subscription/create-checkout-session` with `planCode` + `interval`.
- **D-05:** Plan selection UI is **in-app pricing cards** with a **Monthly/Yearly toggle** (modeled after `fe/src/components/Pricing.tsx` but wired to plan codes).
- **D-06:** Trial policy is **14-day trial (card required)**.
- **D-07:** Checkout opens via **same-tab redirect** (standard redirect; may show a brief “Redirecting…” state).

### Customer Portal UX
- **D-08:** Primary subscription management is via **Stripe Customer Portal** (single “Manage Billing” button).
- **D-09:** After returning from Stripe (Checkout success/cancel OR portal return), user lands back at **Settings → Billing**, which must **auto-refresh** the current subscription state and show a banner for the outcome.
- **D-10:** Billing page shows **core subscription details only**:
  - Plan name
  - Status (trialing/active/canceled/etc.)
  - Next billing date / trial end (whichever is applicable)

### Return outcome signaling
- **D-11:** Encode Stripe return outcomes using a query param:
  - `?billing=success|cancel|portal_return`

### UAT failure paths (must validate)
- **D-12:** Checkout canceled
- **D-13:** Network/API error when creating checkout session
- **D-14:** Portal session creation fails
- **D-15:** Stale subscription state after return (must refetch and reflect updated status)

### Documentation deliverables
- **D-16:** Must ship all of:
  - Billing module overview + endpoints
  - Frontend Billing UX notes + UAT checklist
  - Ops runbook: billing troubleshooting
- **D-17:** Docs live under `.planning/phases/07-*` (phase artifacts), not `docs/`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`

### Backend APIs (billing)
- `src/Syncra.Api/Controllers/SubscriptionsController.cs` (v1)
- `src/Syncra.Api/Controllers/SubscriptionsV2Controller.cs` (v2)
- `src/Syncra.Application/Features/Subscriptions/Commands/CreateCheckoutSessionByPlanCommandHandler.cs`
- `src/Syncra.Application/Features/Subscriptions/Commands/CreatePortalSessionCommandHandler.cs`
- `src/Syncra.Application/Features/Subscriptions/Queries/GetCurrentSubscriptionQueryHandler.cs`
- `src/Syncra.Application/DTOs/CurrentSubscriptionDto.cs`

### Provider implementation
- `src/Syncra.Infrastructure/Services/StripePaymentProvider.cs`

### Frontend
- `../fe/src/pages/app/SettingsPage.tsx` (target location for Billing section)
- `../fe/src/components/Pricing.tsx` (reference for pricing cards + interval toggle)
- `../fe/src/App.tsx` (routing)
</canonical_refs>

<specifics>
## Specific Notes

- The frontend currently uses a mock `AuthContext` and does not yet show workspace selection. Billing UI should still be designed as workspace-scoped (requires `workspaceId` for API calls).
</specifics>

<deferred>
## Deferred Ideas

- Dedicated Billing page in the sidebar
- Invoice history in-app (beyond Stripe portal)
- Usage limits / quota-based upsell UI
</deferred>

---

*Phase: 07-billing-ux-documentation*
*Context gathered: 2026-05-01*
