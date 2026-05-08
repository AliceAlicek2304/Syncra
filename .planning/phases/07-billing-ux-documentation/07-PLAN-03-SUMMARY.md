---
phase: 7
plan: 3
subsystem: billing
tags: [frontend, billing, ui, stripe]
requirements: [REQ-4.1, REQ-5.1]
tech-stack: [react, lucide-react, css-modules]
key-files:
  - fe/src/components/billing/BillingSection.tsx
  - fe/src/components/billing/BillingSection.module.css
  - fe/src/pages/app/SettingsPage.tsx
decisions:
  - D-01: Settings → Billing entry point
  - D-04: v2 checkout contract integration
  - D-08: Stripe customer portal management
  - D-09: Auto-refresh state after return
  - D-11: Return query param signaling
metrics:
  duration: 45m
  completed_date: 2025-03-07
---

# Phase 7 Plan 3: Billing UI Implementation Summary

Implemented the Phase 7 Billing UI inside **Settings → Billing**, providing users with a comprehensive subscription management interface.

## Key Accomplishments

### 1. Integrated Billing Management Section
- Created `BillingSection` component using React and CSS Modules.
- Mounted the section in `SettingsPage` as a first-class citizen of the workspace settings.
- Integrated with `BillingContext` to provide real-time subscription status and management actions.

### 2. Subscription Summary & Status
- Displays current plan name and status (ACTIVE, TRIALING, etc.) with color-coded badges.
- Dynamically shows "Next billing date" or "Trial ends on" based on the subscription state.

### 3. In-App Pricing & Checkout
- Implemented pricing cards for **Free**, **Pro**, and **Team** plans.
- Added a Monthly/Yearly toggle with a "Save 20%" badge for yearly billing.
- Wired "Upgrade" buttons to the v2 checkout API, handling redirect states.

### 4. Advanced UX & Security
- **Owner Gating:** Restricted billing actions (Checkout, Portal) to workspace owners using a `syncra_is_owner` local check.
- **Return Banners:** Implemented success/cancel/info banners that appear when returning from Stripe, with automatic subscription state refresh.
- **Error Handling:** Added explicit error banners and messages for failed API calls (e.g., "Could not open billing portal").

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] Settings → Billing section exists
- [x] Owner-only checkout + portal CTAs implemented
- [x] Query param return banner + subscription auto-refresh implemented
- [x] Explicit error states for checkout/portal failures
- [x] Commits recorded for all tasks

## Commits
- `8a6f18d`: feat(07-03): implement BillingSection with summary, pricing cards, and portal link
- `043668f`: feat(07-03): mount BillingSection in SettingsPage
