# Manual UAT Checklist: Billing UX

This document provides a manual User Acceptance Testing (UAT) checklist for the Syncra Billing module, covering both happy and failure paths.

## Setup
Before testing, ensure your local environment is configured:

1.  **Auth Token:** Ensure `syncra_access_token` is set in the browser's `localStorage` or provide it in the API client.
2.  **Workspace ID:** Ensure `syncra_workspace_id` is set in `localStorage` or passed as `X-Workspace-Id` header.
3.  **Ownership:** Verify you are the owner of the workspace being tested.

## Tests

### 1. Billing Entry Point (Owner)
- **Action:** Log in as workspace owner and navigate to **Settings → Billing**.
- **Expected Result:** Current plan details (Name, Status, Renewal Date) are displayed. Upgrade/Manage CTAs are visible.

### 2. Billing Entry Point (Non-Owner)
- **Action:** Log in as a non-owner member and navigate to **Settings → Billing**.
- **Expected Result:** Basic plan info is visible, but action buttons (Upgrade, Manage Billing) are hidden.

### 3. Happy Path: Stripe Checkout (PRO Monthly)
- **Action:** Click "Upgrade to PRO" (Monthly).
- **Expected Result:** Redirected to Stripe Checkout. Complete the payment with a test card.
- **Action:** Return to Syncra.
- **Expected Result:** URL contains `?billing=success`. A success banner is shown. The page auto-refetches, and the plan status updates to "PRO" with the correct billing date.

### 4. Happy Path: Customer Portal
- **Action:** Click "Manage Billing".
- **Expected Result:** Redirected to Stripe Customer Portal.
- **Action:** Click "Return to Syncra" in the portal.
- **Expected Result:** URL contains `?billing=portal_return`. The page auto-refetches to ensure latest state is shown.

### 5. Failure Path: Checkout Canceled
- **Action:** Start checkout for any plan, but click "Back" or "Cancel" on the Stripe page.
- **Expected Result:** Redirected back to Syncra. URL contains `?billing=cancel`. An info/cancel banner is shown. No plan changes occur.

### 6. Failure Path: Checkout Session Creation Error
- **Action:** Attempt to create a checkout session while the backend is down or using an invalid plan code.
- **Expected Result:** UI shows a clear error message (e.g., "Failed to initiate checkout. Please try again."). No redirect occurs.

### 7. Failure Path: Portal Session Creation Error
- **Action:** Attempt to open the Customer Portal when no Stripe Customer ID exists for the workspace (e.g., new free workspace).
- **Expected Result:** UI shows an error message. Backend should gracefully handle and provide a useful error.

### 8. State Consistency: Stale Subscription Refetch
- **Action:** Complete a checkout, return to the page.
- **Expected Result:** The page MUST trigger a fresh `GET /api/v1/workspaces/{workspaceId}/subscription` call to reflect the change made on Stripe's side.

## Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Billing Entry (Owner) | [ ] | |
| 2. Billing Entry (Non-Owner) | [ ] | |
| 3. Checkout Success | [ ] | |
| 4. Portal Return | [ ] | |
| 5. Checkout Cancel | [ ] | |
| 6. Checkout API Error | [ ] | |
| 7. Portal API Error | [ ] | |
| 8. Auto-refetch Logic | [ ] | |
