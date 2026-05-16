---
phase: 08
slug: core-api-integration-auth
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-03
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `fe/vitest.config.ts`, `fe/playwright.config.ts` |
| **Quick run command** | `npm test:unit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test:unit`
- **After every plan wave:** Run `npm test`
- **Before \`/gsd-verify-work\`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | REQ-8.1 | — | N/A | config | `cd fe && npm list axios` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 2 | REQ-11.3 | — | N/A | config | `test -f fe/vitest.config.ts` | ❌ W0 | ⬜ pending |
| 08-02-03 | 02 | 2 | REQ-8.3 | T1 | Token persistence | unit | `npm test:unit fe/src/context/AuthContext.test.tsx` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | REQ-8.3 | T1 | API Auth | unit | `npm test:unit fe/src/context/AuthContext.test.tsx` | ⬜ | ⬜ pending |
| 08-04-02 | 04 | 4 | REQ-8.3 | T2 | Protected Routes | unit | `npm test:unit fe/src/components/ProtectedRoute.test.tsx` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 5 | REQ-8.4 | — | N/A | integration | `grep "HttpPut" be/src/Syncra.Api/Controllers/UsersController.cs` | ⬜ | ⬜ pending |
| 08-06-01 | 06 | 6 | REQ-8.5 | — | Error feedback | config | `grep "ToastProvider" fe/src/App.tsx` | ⬜ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `fe/src/context/AuthContext.test.tsx` — verify token storage logic (Research Gap)
- [ ] `fe/src/components/ProtectedRoute.test.tsx` — verify redirection for unauthenticated users

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Workspace Switching | REQ-8.3 | UI/Context interaction | Log in, switch workspace via selector, verify \`X-Workspace-Id\` header in subsequent network calls. |
| Skeleton Visuals | REQ-11.2 | Visual feedback | Throttle network to "Slow 3G", refresh dashboard, observe Glassmorphism skeletons. |

---

## Validation Sign-Off

- [x] All tasks have \`<automated>\` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] \`nyquist_compliant: true\` set in frontmatter

**Approval:** pending
