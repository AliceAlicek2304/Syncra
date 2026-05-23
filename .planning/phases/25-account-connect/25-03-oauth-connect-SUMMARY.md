---
phase: 25-account-connect
plan: 25-03-oauth-connect
subsystem: backend-oauth
tags: [zernio, oauth, social-accounts, billing, redis, exceptions]
dependency_graph:
  requires: [25-02-webhook-processing]
  provides: [SocialAccountsController, ZernioBillingRequiredException, IZernioClient headless+selection]
  affects: [be/src/Syncra.Api, be/src/Syncra.Infrastructure, be/src/Syncra.Application, be/src/Syncra.Domain]
tech_stack:
  added: [ZernioSelectOptionDto, ZernioSelectResultDto, SelectPageRequest]
  patterns: [lazy-provisioning, redis-state-token, soft-deactivation, headless-oauth, 402-billing-gate]
key_files:
  created:
    - be/src/Syncra.Domain/Exceptions/ZernioBillingRequiredException.cs
    - be/src/Syncra.Api/Controllers/SocialAccountsController.cs
  modified:
    - be/src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs
    - be/src/Syncra.Application/Interfaces/IZernioClient.cs
    - be/src/Syncra.Application/DTOs/Zernio/ZernioDtos.cs
    - be/src/Syncra.Infrastructure/Services/ZernioClient.cs
decisions:
  - "Added ListSelectOptionsAsync and SelectOptionAsync to IZernioClient to keep ConnectApi calls behind the interface boundary"
  - "Passed null for xConnectToken in Pinterest/Snapchat list calls since API-key auth is already on the ZernioClient Configuration"
  - "SelectLinkedInOrganizationRequest.SelectedOrganization is typed as object - passed anonymous type { id } to satisfy API contract"
  - "ZernioBillingRequiredException bypasses Sentry capture and LogError to avoid alert noise for expected billing gates"
metrics:
  duration: 471s
  completed_date: "2026-05-23"
  tasks_completed: 4
  files_changed: 7
---

# Phase 25 Plan 03: OAuth Connect Summary

**One-liner:** Headless Zernio social account OAuth connect controller with lazy profile provisioning, Redis state tokens (15-min TTL), platform-specific page/org selection proxy, and HTTP 402 billing gate exception mapping.

## Tasks Completed

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Create ZernioBillingRequiredException | Done | 77374b7 |
| 2 | Map exception to HTTP 402 in GlobalExceptionMiddleware | Done | 77374b7 |
| 3 | Update IZernioClient and ZernioClient implementation | Done | 77374b7 |
| 4 | Implement SocialAccountsController | Done | 77374b7 |

## What Was Built

### ZernioBillingRequiredException (`be/src/Syncra.Domain/Exceptions/ZernioBillingRequiredException.cs`)

Sealed `Exception` subclass with `Reason`, `DashboardUrl`, and `Details` properties. Raised by `ZernioClient` when Zernio returns HTTP 402 on any API call.

### GlobalExceptionMiddleware changes

- Added `ZernioBillingRequiredException` to the "not unhandled" guard to prevent it from being logged as `LogError` or sent to Sentry.
- Added a `case ZernioBillingRequiredException` in the switch block that returns HTTP 402 with JSON body `{ code: "PAYMENT_REQUIRED", message, reason, dashboardUrl, details }`.

### IZernioClient and ZernioClient changes

- `GetConnectUrlAsync` now accepts `bool? headless = null` parameter, forwarded to the Zernio SDK.
- All methods now catch `ApiException` with `ErrorCode == 402` and wrap as `ZernioBillingRequiredException`.
- Added `ListSelectOptionsAsync(profileId, platform, tempToken)` — dispatches to platform-specific list helpers: Facebook pages, LinkedIn orgs, Google Business locations, Pinterest boards, Snapchat profiles.
- Added `SelectOptionAsync(profileId, platform, tempToken, selectedId, selectedName)` — dispatches to platform-specific select helpers that call the Zernio SDK selection endpoints.
- Added two new DTOs: `ZernioSelectOptionDto(Id, Name, AvatarUrl?)` and `ZernioSelectResultDto(AccountId, Platform, DisplayName, ProfilePicture?)`.

### SocialAccountsController (`be/src/Syncra.Api/Controllers/SocialAccountsController.cs`)

Endpoints:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/social-accounts` | List active social accounts for workspace |
| GET | `/api/v1/social-accounts/connect-url/{platform}` | Get headless OAuth URL, lazy-provision Zernio profile, store Redis state |
| GET | `/api/v1/social-accounts/{platform}/pages` | Verify/consume state token, list secondary options |
| POST | `/api/v1/social-accounts/{platform}/select-page` | Complete selection, create/reactivate SocialAccount |
| DELETE | `/api/v1/social-accounts/{accountId}` | Soft-deactivate, Zernio disconnect, unschedule posts |

## Deviations from Plan

### Auto-added functionality (Rule 2)

**1. [Rule 2 - Missing Critical Functionality] Added ListSelectOptionsAsync and SelectOptionAsync to IZernioClient**
- **Found during:** Task 4 implementation
- **Issue:** The plan specified the controller should "proxy Zernio calls" for listing secondary options and completing selections, but the interface had no methods for this. Injecting `ConnectApi` directly into the controller would bypass the interface abstraction and make the controller untestable.
- **Fix:** Added two new interface methods and implemented them in `ZernioClient` with 5 platform-specific private helpers (Facebook, LinkedIn, GBP, Pinterest, Snapchat) covering the headless selection flow.
- **Files modified:** `IZernioClient.cs`, `ZernioClient.cs`, `ZernioDtos.cs`
- **Commit:** 77374b7

**2. [Rule 2 - Missing Critical Functionality] Added ZernioBillingRequiredException to all ZernioClient methods**
- **Found during:** Task 3 implementation
- **Issue:** The plan specified 402 handling in `GetConnectUrlAsync` but the threat model (T-25-03-03) required it on all Zernio API calls, not just the connect URL.
- **Fix:** Added `ApiException when (ex.ErrorCode == 402)` catch clause to all four existing methods plus the two new ones.
- **Files modified:** `ZernioClient.cs`
- **Commit:** 77374b7

## Known Stubs

None. All endpoints wire to real data sources (AppDbContext, IZernioClient, IDistributedCache).

## Threat Surface Scan

All mitigations from the threat model were implemented:

| Threat | Mitigation | Location |
|--------|-----------|---------|
| T-25-03-01 Spoofing | State tokens stored in Redis with 15-min TTL, verified and consumed on callback | `SocialAccountsController.GetConnectUrl`, `VerifyAndConsumeStateTokenAsync` |
| T-25-03-02 Tampering | Workspace ownership verified via `TenantResolutionMiddleware` (X-Workspace-Id) before any mutation | All `SocialAccountsController` endpoints |
| T-25-03-03 Elevation of Privilege | `ZernioBillingRequiredException` thrown on 402, mapped to HTTP 402 by middleware | `ZernioClient`, `GlobalExceptionMiddleware` |
| T-25-03-04 Repudiation | Serilog events logged for connect, disconnect, billing gate, unschedule | `SocialAccountsController`, `ZernioClient` |

## Self-Check: PASSED

- `be/src/Syncra.Domain/Exceptions/ZernioBillingRequiredException.cs` — FOUND
- `be/src/Syncra.Api/Controllers/SocialAccountsController.cs` — FOUND
- Commit 77374b7 — FOUND (`git log --oneline` confirms)
- `dotnet build` — 0 errors
