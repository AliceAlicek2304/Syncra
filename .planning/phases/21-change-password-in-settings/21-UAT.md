---
status: passed
phase: 21-change-password-in-settings
source:
  - 21-01-SUMMARY.md
  - 21-02-SUMMARY.md
  - 21-03-SUMMARY.md
started: 2026-05-17T22:59:41.610+07:00
updated: 2026-05-17T23:13:41.134+07:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Settings page shows password change entry point
expected: Open Settings and see a Security section with the Change Password form below Authentication.
result: pass

### 2. Current-password account change flow
expected: For an account that already has a password, the form shows Current Password, requires it, and a successful change logs the user out and sends them to the login page.
result: pass

### 3. OAuth-only account set-password flow
expected: For an OAuth-only account, the form hides Current Password, allows setting a password, and the new password works for login afterward.
result: pass

### 4. Wrong current password is rejected
expected: Submitting the wrong current password shows a generic error and leaves the password unchanged.
result: pass

### 5. Other sessions are invalidated
expected: After a successful password change, other active sessions are logged out and must sign in again.
result: pass
notes: Fixed in Phase 21 Plan 04 (21-04-PLAN.md). SecurityStamp embedded in JWTs and validated on each request. Password change regenerates stamp, invalidating all existing tokens.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0


