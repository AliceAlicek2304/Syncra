# Phase 3 Context: Quality & Observability

## Overview
This phase focuses on long-term stability through OAuth token refresh health tracking + auditing, completing tests for Analytics and Stripe controllers, and running a final stability audit + documentation update.

## Implementation Decisions

### 1. OAuth Integration Health Statuses
- **API health statuses:** Keep existing `disconnected` and `token_expired`, and add `warning` and `needs_reauth` alongside `ok` and `error`.
- **Status precedence (highest to lowest):**
  - `disconnected` (integration is not active)
  - `token_expired` (token is expired)
  - `needs_reauth` (terminal refresh error OR reached threshold)
  - `error` (2 consecutive refresh failures)
  - `warning` (1 consecutive refresh failure)
  - `ok` (no recent failures)

### 2. Terminal Errors => Immediate `needs_reauth`
- **Terminal errors set:** Mark `needs_reauth` immediately when refresh failures indicate the refresh token is invalid/revoked.
- **Signals to treat as terminal:**
  - Provider error code contains `invalid_grant`
  - Provider error code contains `invalid_token`
  - Provider error code contains `token_revoked`
  - HTTP `401` / `403` from the token endpoint (when available)

### 3. Failure Ladder for Non-Terminal Errors
- **Threshold:** 3 consecutive refresh failures => `needs_reauth`.
- **Tracking:** Add a persisted `TokenRefreshConsecutiveFailures` counter on `Integration`.
- **Intermediate states:**
  - 1 consecutive failure => `warning`
  - 2 consecutive failures => `error`
- **Reset:** Any successful refresh resets the consecutive-failure count and clears `needs_reauth`.

### 4. Refresh Job Behavior
- **Eligibility to attempt refresh:** Refresh should be attempted when token is expiring/expired **OR** the integration health is bad (`warning`/`error`).

### 5. Behavior When `needs_reauth`
- **Do not disconnect and do not clear tokens automatically.**
- **Pause posting and analytics** for integrations in `needs_reauth` until the user reconnects.

## Canonical refs
- `be/.planning/ROADMAP.md`
- `be/.planning/REQUIREMENTS.md`
- `be/src/Syncra.Domain/Entities/Integration.cs`
- `be/src/Syncra.Domain/Enums/IntegrationRefreshHealthStatus.cs`
- `be/src/Syncra.Application/Services/IntegrationTokenRefreshService.cs`
- `be/src/Syncra.Application/Features/Integrations/Queries/GetIntegrationHealthQueryHandler.cs`
- `be/src/Syncra.Api/Controllers/IntegrationsController.cs`
- `be/src/Syncra.Infrastructure/Jobs/IntegrationTokenRefreshJob.cs`
- `be/src/Syncra.Infrastructure/Jobs/IntegrationTokenRefreshJobScheduler.cs`
