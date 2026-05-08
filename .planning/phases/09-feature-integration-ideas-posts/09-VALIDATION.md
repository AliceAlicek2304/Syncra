---
phase: 9
slug: feature-integration-ideas-posts
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-07
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (unit/integration) + Playwright (E2E) |
| **Config file** | `fe/vite.config.ts` (Vitest inline), `fe/playwright.config.ts` |
| **Quick run command** | `cd fe && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd fe && npx vitest run && npx playwright test` |
| **Estimated runtime** | ~45s (vitest) + ~90s (playwright) |

---

## Sampling Rate

- **After every task commit:** Run `cd fe && npx vitest run --reporter=verbose`
- **After every plan wave:** Run full suite (vitest + playwright)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 09-01-01 | Ideas API | 1 | REQ-8.5 | unit | `vitest src/api/ideas.test.ts` | ⬜ pending |
| 09-01-02 | Groups API | 1 | REQ-8.5 | unit | `vitest src/api/groups.test.ts` | ⬜ pending |
| 09-01-03 | Media API | 1 | REQ-8.4 | unit | `vitest src/api/media.test.ts` | ⬜ pending |
| 09-01-04 | AI API | 1 | REQ-8.5 | unit | `vitest src/api/ai.test.ts` | ⬜ pending |
| 09-01-05 | Posts API | 1 | REQ-8.5 | unit | `vitest src/api/posts.test.ts` | ⬜ pending |
| 09-02-01 | useR2Upload hook | 1 | REQ-8.4 | unit | `vitest src/hooks/useR2Upload.test.ts` | ⬜ pending |
| 09-03-02 | Ideas Board fetching | 2 | REQ-8.5 | unit | `vitest src/pages/app/IdeasPage.test.tsx` | ⬜ pending |
| 09-03-04 | Board drag-reorder | 2 | REQ-8.5 | unit | `vitest src/pages/app/IdeasPage.test.tsx` | ⬜ pending |
| 09-04-02 | AI Generator backend | 2 | REQ-8.5 | unit | `vitest src/components/AIIdeaGenerator.test.tsx` | ⬜ pending |
| 09-05-02 | Editor auto-save | 3 | REQ-8.5 | unit | `vitest src/components/MultiPlatformEditor.test.tsx` | ⬜ pending |
| 09-06-01 | Media Library page | 3 | REQ-8.4 | E2E | `playwright test media-library` | ⬜ pending |
| 09-07-01 | API Test Stubs | 0 | REQ-8.5 | unit | `vitest run src/api/*.test.ts` | ⬜ pending |
| 09-07-02 | Hook Test Stubs | 0 | REQ-8.4 | unit | `vitest run src/hooks/*.test.ts` | ⬜ pending |
| 09-07-03 | E2E UAT Specs | 0 | REQ-8.5 | E2E | `playwright test --dry-run` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `fe/src/api/ideas.test.ts` — API client shape tests (msw/vi mocks)
- [ ] `fe/src/api/groups.test.ts` — Groups API shape tests
- [ ] `fe/src/api/media.test.ts` — Media API + presign flow tests
- [ ] `fe/src/api/ai.test.ts` — AI generation API tests
- [ ] `fe/src/api/posts.test.ts` — Posts API shape tests
- [ ] `fe/src/hooks/useR2Upload.test.ts` — R2 upload hook tests
- [ ] `fe/tests/e2e/phase9-uat.spec.ts` — E2E UAT spec stubs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI cooldown indicator shows countdown | REQ-8.5 | Requires real backend cooldown response | Trigger generate twice rapidly; observe button disabled with countdown |
| R2 file deduplication | REQ-8.4 | Requires real R2 + backend hash check | Upload identical image twice; verify only 1 asset in Media Library |
| Drag-and-drop order persists across sessions | REQ-8.5 | Requires real DB persistence | Reorder ideas; reload page; verify order preserved |
| Auto-save "Saved" toast / indicator | REQ-8.5 | Timing-sensitive UI feedback | Type in editor, stop, wait 1.5s; observe save indicator |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified

