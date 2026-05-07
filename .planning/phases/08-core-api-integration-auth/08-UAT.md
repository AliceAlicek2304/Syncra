---
status: testing
phase: 08-core-api-integration-auth
source:
  - .planning/phases/08-core-api-integration-auth/08-01-SUMMARY.md
  - .planning/phases/08-core-api-integration-auth/08-02-SUMMARY.md
  - .planning/phases/08-core-api-integration-auth/08-03-SUMMARY.md
  - .planning/phases/08-core-api-integration-auth/08-04-SUMMARY.md
  - .planning/phases/08-core-api-integration-auth/08-05-SUMMARY.md
  - .planning/phases/08-core-api-integration-auth/08-06-SUMMARY.md
started: 2026-05-03T12:00:00Z
updated: 2026-05-03T13:05:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 3
name: Workspace Selection & Persistence
expected: |
  Select a different workspace from the WorkspaceSelector in the Navbar. Verify that `syncra_workspace_id` in localStorage is updated. Refresh the page; the selected workspace should remain active.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Login & Session Hydration
expected: |
  Perform a login. Verify that `syncra_access_token` is stored in localStorage. Refresh the page; the user should remain logged in (session hydration) without needing to re-authenticate.
result: pass

### 3. Workspace Selection & Persistence
expected: |
  Select a different workspace from the WorkspaceSelector in the Navbar. Verify that `syncra_workspace_id` in localStorage is updated. Refresh the page; the selected workspace should remain active.
result: [pending]

### 4. Route Protection
expected: |
  Attempt to access `/dashboard` or `/settings` while logged out. The application should automatically redirect to `/login`.
result: [pending]

### 5. Profile Settings Persistence
expected: |
  Navigate to Settings > Profile. Update First Name and Last Name. Submit the form. Verify that a success toast appears and the changes persist after a page refresh (fetching from real backend).
result: [pending]

### 6. Workspace Settings Persistence
expected: |
  Navigate to Settings > Workspace. Update the Workspace Name. Submit the form. Verify that a success toast appears, the WorkspaceSelector reflects the new name, and changes persist after refresh.
result: [pending]

### 7. Global Error Notifications
expected: |
  Trigger a simulated API error (e.g., by making a request that the backend rejects with 400 or 500). Verify that a global toast notification appears with the error message.
result: [pending]

### 8. Glass Skeleton Loaders
expected: |
  Observe the Dashboard or Settings page during initial load. Verify that Glassmorphism skeleton loaders appear instead of a blank screen or layout shifts.
result: [pending]

## Summary

total: 8
passed: 2
issues: 0
pending: 6
skipped: 0

## Gaps

[none]
