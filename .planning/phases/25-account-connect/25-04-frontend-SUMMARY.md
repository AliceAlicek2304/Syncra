---
phase: 25-account-connect
plan: 25-04-frontend
subsystem: frontend
tags: [react, social-accounts, oauth, billing, settings]
dependency_graph:
  requires:
    - 25-03-oauth-connect-SUMMARY.md
  provides:
    - "SocialAccounts grid component (14-platform connect/disconnect UI)"
    - "BillingGateOverlay modal for HTTP 402 responses"
    - "SocialAccountsSelect headless OAuth callback selection page"
  affects:
    - fe/src/App.tsx
    - fe/src/pages/app/SettingsPage.tsx
tech_stack:
  added: []
  patterns:
    - "CSS modules for component-scoped styling"
    - "axios (api instance) for all backend calls"
    - "useSearchParams + useNavigate (react-router-dom) for callback page"
    - "useState + useEffect for local async data fetching"
key_files:
  created:
    - fe/src/components/BillingGateOverlay.tsx
    - fe/src/components/BillingGateOverlay.module.css
    - fe/src/pages/Settings/SocialAccounts.tsx
    - fe/src/pages/Settings/SocialAccounts.module.css
    - fe/src/pages/Settings/SocialAccountsSelect.tsx
    - fe/src/pages/Settings/SocialAccountsSelect.module.css
  modified:
    - fe/src/App.tsx
    - fe/src/pages/app/SettingsPage.tsx
decisions:
  - "Route /social-accounts/select placed outside /app ProtectedRoute so Zernio redirect callback works before re-authentication"
  - "BillingGateOverlay uses window.open with noopener,noreferrer for security (T-25-04-02)"
  - "Disconnect confirmation dialog explicitly warns about scheduled post cancellation per UI-SPEC (T-25-04-03)"
  - "SocialAccountsSelect verifies tempToken+state params before fetching pages (T-25-04-01)"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-23"
  tasks_completed: 4
  files_changed: 8
---

# Phase 25 Plan 04: Frontend Social Accounts Summary

**One-liner:** 14-platform social accounts grid with OAuth connect flow, headless secondary selection page, disconnect confirmation, and unified HTTP 402 billing overlay.

---

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Build BillingGateOverlay component | 8e02b50 | BillingGateOverlay.tsx, BillingGateOverlay.module.css |
| 2 | Build SocialAccounts grid component | 8e02b50 | SocialAccounts.tsx, SocialAccounts.module.css |
| 3 | Build SocialAccountsSelect callback component | 8e02b50 | SocialAccountsSelect.tsx, SocialAccountsSelect.module.css |
| 4 | Integrate settings page and routers | 8e02b50 | App.tsx, SettingsPage.tsx |

---

## Must-Have Verification

- [x] Grid displays all 14 supported platform cards (Twitter/X, Facebook, Instagram, LinkedIn, TikTok, YouTube, Pinterest, Google Business, Snapchat, Reddit, Threads, Mastodon, Bluesky, Tumblr)
- [x] Clicking connect on a platform calls `GET /api/v1/social-accounts/connect-url/{platform}` and redirects `window.location.href`
- [x] Redirect callback landing page `/social-accounts/select` parses `tempToken`, `state`, `platform` query params and lists secondary profiles
- [x] Confirmation dialog warns user before disconnecting accounts with "All pending posts scheduled for this account will be canceled"
- [x] HTTP 402 response from any social-accounts API call opens BillingGateOverlay with reason and dashboardUrl

---

## Threat Model Compliance

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-25-04-01 | SocialAccountsSelect validates all three query params (tempToken, state, platform) before making backend call; missing params render error state |
| T-25-04-02 | BillingGateOverlay reads reason and dashboardUrl only from backend API response; uses window.open with noopener,noreferrer |
| T-25-04-03 | Disconnect confirmation dialog shown before every DELETE call; explicitly states post cancellation consequences |

---

## Deviations from Plan

None — plan executed exactly as written. The `/social-accounts/select` route was placed outside the `/app` ProtectedRoute wrapper to ensure the Zernio OAuth redirect can land on the page before session re-hydration. This is consistent with the pattern used for `/auth/google/callback`.

---

## Known Stubs

None. All API calls wire directly to backend endpoints defined in Plan 25-03. Platform icon SVGs are inline brand-accurate paths, not placeholder content.

---

## Self-Check: PASSED

- [x] `fe/src/components/BillingGateOverlay.tsx` — exists
- [x] `fe/src/components/BillingGateOverlay.module.css` — exists
- [x] `fe/src/pages/Settings/SocialAccounts.tsx` — exists
- [x] `fe/src/pages/Settings/SocialAccounts.module.css` — exists
- [x] `fe/src/pages/Settings/SocialAccountsSelect.tsx` — exists
- [x] `fe/src/pages/Settings/SocialAccountsSelect.module.css` — exists
- [x] Commit 8e02b50 — verified
- [x] TypeScript build check (`npx tsc --noEmit`) — passed with zero errors
