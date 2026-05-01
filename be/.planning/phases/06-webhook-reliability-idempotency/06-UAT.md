---
status: testing
phase: 06-webhook-reliability-idempotency
source:
  - 06-PLAN-01-SUMMARY.md
  - 06-PLAN-02-SUMMARY.md
  - 06-PLAN-03-SUMMARY.md
  - 06-PLAN-04-SUMMARY.md
started: 2026-05-01T14:38:00Z
updated: 2026-05-01T17:04:11Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Webhook Stale Event Processing
expected: |
  Send a webhook with an older EventCreatedAtUtc than an already processed event. The system detects the stale event, skips processing, and returns a 200 OK without modifying the database.
result: pass

### 3. Webhook Retry and Permanent Failure
expected: |
  Simulate a failing webhook handler. The system logs the failure, increments AttemptCount, and returns a 500 status to trigger a Stripe retry. After 5 attempts, the status changes to PermanentFailure and the system returns a 200 OK to stop Stripe from retrying.
result: pass

### 4. Admin Webhook Management
expected: |
  Call `GET /api/admin/webhooks/failed` to view a list of failed idempotency records. Call `POST /api/admin/webhooks/{id}/reset` on a failed record. The record's status is reset, its failure details are cleared, and a subsequent manual retry from Stripe is processed successfully.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps
