# Phase 07 UI-SPEC — Billing UX (Settings → Billing)

**Date:** 2026-05-01
**Phase:** 7 — Billing UX (Checkout + Customer Portal) & Documentation

## Purpose
Define a concrete UI contract for the Billing experience so implementation is consistent and testable.

This is a **Settings → Billing** experience (no dedicated `/app/billing` route for v1.1).

---

## Information Architecture
### Entry point
- **Location:** `SettingsPage` (`/app/settings`)
- Add a new section titled **Billing**.

### Access rules
- **Workspace owner**: can see CTAs to start checkout / open portal.
- **Non-owner**: can see current plan + status but **must not** see CTAs.

---

## UI Components

### 1) BillingSection (Settings → Billing)
**Responsibilities:**
- Fetch & display current subscription status
- Provide plan selection cards + interval toggle
- Provide “Manage Billing” (portal) CTA
- Show banners for return outcomes

**Header:**
- Title: `Billing`
- Subtitle: `Manage your subscription and billing details.` (copy can be localized later)

### 2) CurrentPlanCard
Show “core subscription details only” (D-10):
- Plan name
- Status (trialing/active/canceled/etc.)
- Next billing date or trial end (best available from API)

**Suggested layout:**
- Two-column meta rows (label/value)

### 3) PricingCards (in-app)
Modeled after `fe/src/components/Pricing.tsx` but:
- wired to **plan codes** (FREE/PRO/TEAM)
- uses **Monthly/Yearly toggle**
- CTA starts checkout

**Required UI controls:**
- Interval toggle: Monthly / Yearly
- 2–3 plan cards (free plan may be “Current” / “Included” rather than checkout)

**CTA button states:**
- Default: `Start 14-day trial` or `Upgrade` / `Switch plan`
- Loading: `Redirecting…`
- Disabled when user is not owner

### 4) ManageBillingButton
- Label: `Manage Billing`
- Behavior: create portal session → redirect to Stripe portal

---

## Stripe return outcomes (banner)
Phase decision D-11 uses query param:
- `?billing=success|cancel|portal_return`

### Banner rules
- On page load, parse query param and show a dismissible banner:
  - `success` → “Checkout complete. Updating your subscription…” then refresh subscription
  - `cancel` → “Checkout canceled.”
  - `portal_return` → “Returned from billing portal. Refreshing subscription…” then refresh subscription

### URL cleanup
- After banner is shown (and refresh triggered if needed), remove `billing` query param via router replace to avoid repeated banners.

---

## States & error handling

### Loading states
- Initial subscription load: skeleton or small spinner + “Loading billing details…”
- Checkout/portal launch: lock CTAs + show `Redirecting…`

### Error states (must be explicit)
- Create-checkout-session API error → show inline error banner in Billing section:
  - “Could not start checkout. Please try again.”
- Create-portal-session API error → “Could not open billing portal. Please try again.”
- No auth token (frontend-only limitation) → “Billing requires an API token. Set `syncra_access_token` in localStorage.”

---

## Non-goals (v1.1)
- Sidebar billing page
- In-app invoice history
- Usage limits / quota upsell UI

---

## Acceptance checklist (UI)
- Billing section exists in Settings
- Owner sees Checkout + Manage Billing CTAs; non-owner does not
- Monthly/Yearly toggle changes interval sent to API
- Query param `billing=...` shows correct banner and triggers subscription refresh
- Cancel flow surfaces “Checkout canceled”
- Errors are visible and non-silent
