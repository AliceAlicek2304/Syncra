---
phase: 25-account-connect
verified: 2026-05-23T10:00:00Z
status: gaps_found
score: 16/19 must-haves verified
overrides_applied: 0
gaps:
  - truth: "SocialAccountsController completes selection and saves SocialAccount in DB (reactivation path)"
    status: failed
    reason: "SelectPage() calls existing.Deactivate() when the account is inactive instead of existing.Reactivate(). Deactivate() is a no-op when IsActive==false (it checks 'if (!IsActive) return'). The account is never reactivated — Update() is then called on a still-inactive record."
    artifacts:
      - path: "be/src/Syncra.Api/Controllers/SocialAccountsController.cs"
        issue: "Line 223: existing.Deactivate() called inside the !existing.IsActive branch. Should be existing.Reactivate()."
    missing:
      - "Replace existing.Deactivate() with existing.Reactivate() in the !existing.IsActive branch of SelectPage()"

  - truth: "Redirect callback landing /social-accounts/select parses token params and lists secondary profiles (response shape mismatch)"
    status: failed
    reason: "Backend GET /{platform}/pages returns { platform, options } but SocialAccountsSelect.tsx assigns response.data directly as PageItem[]. At runtime, setItems receives the wrapper object — items.map() will fail or render an empty list."
    artifacts:
      - path: "fe/src/pages/Settings/SocialAccountsSelect.tsx"
        issue: "Line 52-56: api.get<PageItem[]>(...) and setItems(response.data) — but backend returns { platform, options }, not PageItem[]. Should be setItems(response.data.options)."
      - path: "be/src/Syncra.Api/Controllers/SocialAccountsController.cs"
        issue: "Line 173: return Ok(new { platform, options }) — the wrapper object is not what the frontend expects."
    missing:
      - "Fix SocialAccountsSelect.tsx to destructure correctly: setItems((response.data as any).options)"
      - "Or change backend to return Ok(options) directly (array), consistent with frontend type expectation"

  - truth: "SocialAccountsController lists secondary items via Zernio proxy calls (select-page DTO field mismatch)"
    status: failed
    reason: "SocialAccountsSelect.tsx POSTs { pageId, tempToken, state } but backend SelectPageRequest expects { TempToken, SelectedId, SelectedName? }. 'pageId' does not bind to 'SelectedId'. ASP.NET Core model binding will leave SelectedId as null/empty, making the Zernio SDK call fail or behave incorrectly."
    artifacts:
      - path: "fe/src/pages/Settings/SocialAccountsSelect.tsx"
        issue: "Line 77-81: POST body uses { pageId: selectedId, tempToken, state } — 'pageId' does not match backend field 'selectedId'/'SelectedId'."
      - path: "be/src/Syncra.Api/Controllers/SocialAccountsController.cs"
        issue: "Line 427-429: SelectPageRequest record defines TempToken and SelectedId (not pageId or state)."
    missing:
      - "Change frontend POST body from { pageId: selectedId, tempToken, state } to { selectedId, tempToken } to match SelectPageRequest fields (camelCase binds to PascalCase in ASP.NET Core)"
---

# Phase 25: Account Connect — Verification Report

**Phase Goal:** OAuth connect, webhook intake, HMAC-SHA256 signature validation, idempotent webhook processing, social account provisioning/deactivation, and frontend settings grid with billing gate
**Verified:** 2026-05-23T10:00:00Z
**Status:** GAPS FOUND — 3 blockers
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | ZernioWebhookSignatureFilter rejects requests with invalid/missing signature headers with 400/401 | VERIFIED | Lines 38-46: returns BadRequestObjectResult on missing header; lines 65-70: returns UnauthorizedObjectResult on invalid signature |
| 2  | ZernioWebhookSignatureFilter enables buffering, reads payload, computes HMAC-SHA256, rewinds body stream | VERIFIED | Lines 50-59: EnableBuffering(), StreamReader(leaveOpen:true), Body.Position=0; lines 82-94: HMACSHA256 + FixedTimeEquals |
| 3  | ZernioWebhookController acquires Redis distributed lock using X-Zernio-Event-Id before checking DB duplicate records | VERIFIED | Lines 69-80: TryAcquireAsync with lockKey prefix; DB AnyAsync check at line 83 comes after |
| 4  | ZernioWebhookController enqueues ProcessZernioWebhookJob to Hangfire and returns 200 OK immediately | VERIFIED | Lines 157-158: _backgroundJobs.Enqueue<ProcessZernioWebhookJob>(...); line 165: return Ok() |
| 5  | SocialAccount class has Reactivate() method setting IsActive=true and UpdatedAtUtc | VERIFIED | SocialAccount.cs lines 63-68: IsActive = true; UpdatedAtUtc = DateTime.UtcNow |
| 6  | ProcessZernioWebhookJob is decorated with [AutomaticRetry(Attempts = 3)] | VERIFIED | ProcessZernioWebhookJob.cs line 23: [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)] |
| 7  | Handling account.connected event provisions/reactivates/updates SocialAccount | VERIFIED | HandleAccountConnectedAsync (lines 155-217): SocialAccount.Create for new; account.Reactivate()+account.Update() for existing |
| 8  | Handling account.disconnected event soft-deactivates SocialAccount and calls Unschedule() on pending posts | VERIFIED | HandleAccountDisconnectedAsync (lines 223-289): account.Deactivate(); Posts query with PlatformTargets filter; post.Unschedule() per post |
| 9  | ZernioBillingRequiredException has properties Reason, DashboardUrl | VERIFIED | ZernioBillingRequiredException.cs lines 5-6: public string Reason; public string DashboardUrl |
| 10 | GlobalExceptionMiddleware intercepts ZernioBillingRequiredException → 402 with JSON body code PAYMENT_REQUIRED | VERIFIED | GlobalExceptionMiddleware.cs lines 111-122: case ZernioBillingRequiredException: StatusCode 402, code = "PAYMENT_REQUIRED" |
| 11 | SocialAccountsController.GetConnectUrl implements lazy Zernio Profile provisioning | VERIFIED | Lines 95, 349-387: GetOrProvisionZernioProfileAsync queries for existing profile, calls ProvisionProfileAsync if none found |
| 12 | SocialAccountsController.GetConnectUrl generates state Guid, saves to Redis with 15-min TTL | VERIFIED | Lines 98-109: Guid.NewGuid().ToString("N"); cache.SetStringAsync with AbsoluteExpirationRelativeToNow = 15 min |
| 13 | SocialAccountsController lists secondary items via Zernio proxy calls | PARTIAL — BLOCKER | GetSelectOptions calls _zernioClient.ListSelectOptionsAsync (WIRED), but returns { platform, options } while frontend expects PageItem[] directly. Frontend select-page POST also sends wrong field name pageId instead of selectedId. |
| 14 | SocialAccountsController completes selection and saves SocialAccount in DB | PARTIAL — BLOCKER | Create path works. Reactivation path calls existing.Deactivate() (no-op since IsActive==false) instead of existing.Reactivate() — account stays inactive. |
| 15 | SocialAccountsController.Delete soft-deactivates and calls Unschedule() on scheduled posts | VERIFIED | Lines 317-336: account.Deactivate(); Posts.Where Scheduled; post.Unschedule() for each. Note: does not filter by platform (unschedules all workspace posts), but must-have text does not specify platform scope. |
| 16 | Grid displays all 14 supported platform cards | VERIFIED | SocialAccounts.tsx lines 48-63: PLATFORMS array has exactly 14 entries: twitter, facebook, instagram, linkedin, tiktok, youtube, pinterest, google_business, snapchat, reddit, threads, mastodon, bluesky, tumblr |
| 17 | Clicking connect makes backend API call to fetch OAuth URL, redirecting user to Zernio | VERIFIED | SocialAccounts.tsx lines 216-235: api.get social-accounts/connect-url/{platform}; window.location.href = response.data.connectUrl |
| 18 | Redirect callback landing /social-accounts/select parses token params and lists secondary profiles | PARTIAL — BLOCKER | Route exists (App.tsx line 111). Params extracted correctly (lines 34-36). But setItems(response.data) assigns the wrapper object { platform, options } instead of the options array — items list will not render. |
| 19 | Confirmation dialog warns before disconnecting, stating scheduled posts will be canceled | VERIFIED | SocialAccounts.tsx lines 371-399: dialog renders "All pending posts scheduled for this account will be canceled." |
| 20 | Unified HTTP 402 intercept displays billing overlay with deep-links | PARTIAL — WARNING | SocialAccounts.tsx: handleBillingError checks resp.status === 402 and opens BillingGateOverlay (VERIFIED). SocialAccountsSelect.tsx: no 402 handling at all — billing errors from the pages or select-page calls on the callback route will not show overlay. |

**Score:** 16/19 truths verified (3 blockers)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `be/src/Syncra.Api/Filters/ZernioWebhookSignatureFilter.cs` | VERIFIED | 96 lines, full HMAC-SHA256 implementation |
| `be/src/Syncra.Api/Controllers/ZernioWebhookController.cs` | VERIFIED | Full controller with Redis lock + Hangfire enqueue |
| `be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs` | VERIFIED | Full implementation, 290 lines, [AutomaticRetry] present |
| `be/src/Syncra.Domain/Entities/SocialAccount.cs` | VERIFIED | Reactivate(), Deactivate(), Create() all present |
| `be/src/Syncra.Domain/Exceptions/ZernioBillingRequiredException.cs` | VERIFIED | Reason, DashboardUrl, Details properties |
| `be/src/Syncra.Api/Controllers/SocialAccountsController.cs` | PARTIAL | File exists and is substantive; reactivation branch has Deactivate/Reactivate bug; select-page DTO field mismatch |
| `be/src/Syncra.Api/Middleware/GlobalExceptionMiddleware.cs` | VERIFIED | 402 case for ZernioBillingRequiredException wired correctly |
| `fe/src/pages/Settings/SocialAccounts.tsx` | VERIFIED | 14-platform grid, connect/disconnect flow, billing overlay, 402 handling |
| `fe/src/pages/Settings/SocialAccountsSelect.tsx` | PARTIAL | Route registered, params parsed, but response shape mismatch and wrong DTO field on submit |
| `fe/src/components/BillingGateOverlay.tsx` | VERIFIED | Props: isOpen, reason, dashboardUrl, onClose; window.open with noopener,noreferrer |
| `fe/src/App.tsx` | VERIFIED | Route /social-accounts/select at line 111, outside ProtectedRoute |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ZernioWebhookController | ProcessZernioWebhookJob | Hangfire IBackgroundJobClient.Enqueue | WIRED | Line 157 |
| ZernioWebhookSignatureFilter | ZernioWebhookController | [ServiceFilter(typeof(...))] on controller | WIRED | ZernioWebhookController.cs line 29 |
| ProcessZernioWebhookJob | SocialAccount.Reactivate() | HandleAccountConnectedAsync | WIRED | Line 209: account.Reactivate() |
| ProcessZernioWebhookJob | post.Unschedule() | HandleAccountDisconnectedAsync | WIRED | Line 272: post.Unschedule() |
| GlobalExceptionMiddleware | ZernioBillingRequiredException | switch case + 402 status | WIRED | Lines 111-122 |
| SocialAccountsController.GetConnectUrl | Redis state token | IDistributedCache.SetStringAsync 15-min TTL | WIRED | Lines 106-109 |
| SocialAccountsController.SelectPage | SocialAccount.Reactivate() | !existing.IsActive branch | NOT_WIRED | Bug: existing.Deactivate() called instead of existing.Reactivate() |
| SocialAccountsSelect.tsx | backend /pages endpoint | api.get(...).options | NOT_WIRED | response.data used directly instead of response.data.options |
| SocialAccountsSelect.tsx | backend /select-page endpoint | api.post with { pageId } | PARTIAL | Field name mismatch: 'pageId' vs backend 'SelectedId' |
| SocialAccounts.tsx | BillingGateOverlay | handleBillingError on 402 | WIRED | Lines 201-212 |
| SettingsPage.tsx | SocialAccounts component | import + render in settings section | WIRED | Lines 17, 207 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `be/src/Syncra.Api/Controllers/SocialAccountsController.cs` | 223 | `existing.Deactivate()` in reactivation branch | BLOCKER | Account reactivation silently fails; account stays inactive after re-connecting |
| `fe/src/pages/Settings/SocialAccountsSelect.tsx` | 52-56 | `setItems(response.data)` — response is `{ platform, options }` not `PageItem[]` | BLOCKER | Page list will not render on callback; runtime error when items.map() called |
| `fe/src/pages/Settings/SocialAccountsSelect.tsx` | 77-80 | POST body `{ pageId: selectedId }` vs backend `SelectPageRequest.SelectedId` | BLOCKER | Selection fails silently; Zernio SDK receives null/empty selectedId |
| `fe/src/pages/Settings/SocialAccountsSelect.tsx` | All | No 402 handling | WARNING | Billing errors on callback page show no overlay, just generic error message |
| `be/src/Syncra.Api/Controllers/SocialAccountsController.cs` | 320-322 | `Delete` unschedules ALL workspace scheduled posts, not just platform-targeted ones | WARNING | Overbroad: disconnecting one account cancels posts for all platforms in workspace |

---

### Human Verification Required

#### 1. Billing overlay deep-link in SocialAccountsSelect

**Test:** Start an OAuth connection flow, reach the `/social-accounts/select` callback page, and have the backend return an HTTP 402.
**Expected:** BillingGateOverlay modal appears with reason text and a working upgrade link.
**Why human:** SocialAccountsSelect has no 402 handling code — only manual testing can confirm whether a fallback (global axios interceptor, etc.) handles it instead.

#### 2. Full OAuth connect flow end-to-end

**Test:** Click Connect on any platform, get redirected to Zernio mock, return to `/social-accounts/select`, select a page, confirm.
**Expected:** SocialAccount created in DB, grid shows connected state.
**Why human:** After gap closure, the complete round-trip (params, response shape, DTO fields) needs to be verified in a running environment.

---

## Gaps Summary

Three blockers prevent the goal from being fully achieved:

**GAP 1 — Reactivation bug in SelectPage (SocialAccountsController.cs:223)**
The `SelectPage` endpoint calls `existing.Deactivate()` when an inactive account is being reconnected. Since `Deactivate()` is a no-op when `IsActive==false`, the account is never reactivated. The log message says "Reactivated" but the data does not change. Fix: replace `existing.Deactivate()` with `existing.Reactivate()`.

**GAP 2 — Response shape mismatch on /pages endpoint (SocialAccountsSelect.tsx:52-56)**
The backend returns `{ platform, options }` but the frontend treats `response.data` as `PageItem[]`. At runtime, `setItems` receives the wrapper object; `items.map()` on an object will produce no rendered items (or throw). Fix: change `setItems(response.data)` to `setItems((response.data as any).options)` — or have the backend return the array directly.

**GAP 3 — DTO field name mismatch on /select-page POST (SocialAccountsSelect.tsx:77-80)**
The frontend sends `pageId` but `SelectPageRequest` expects `SelectedId`. ASP.NET Core model binding will not populate `SelectedId`. Fix: change the frontend POST body to use `{ selectedId: selectedId, tempToken }` matching the backend record's camelCase binding.

The three gaps share a single root cause: the frontend (plan 25-04) was built against a slightly different API contract than what the backend (plan 25-03) actually implements. All three are in the selection/callback flow.

---

_Verified: 2026-05-23T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
