# Validation

## Proof Strategy

We will prove the correct behavior of the Instagram integration by:
1. Ensuring backend and frontend code compile successfully without warnings/errors.
2. Creating an E2E test suite under `fe/tests/e2e/instagram-flows.spec.ts` using Playwright, modeled after `reddit-flows.spec.ts`, to mock the Instagram direct-connect redirect, profile retrieval, posting with specific settings, and verifying the exact payload format sent to the backend.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | None |
| Integration | Compile backend and frontend successfully. |
| E2E | `npx playwright test tests/e2e/instagram-flows.spec.ts` passes successfully on Chromium. |
| Platform | None |
| Performance | None |
| Logs/Audit | Verify Serilog prints creation of Instagram SocialAccount and post scheduling. |

## Fixtures

- Mock connected Instagram Business account: `acc_instagram123`
- Mock workspace and profile: `ws123`, `prof123`

## Commands

- Run E2E test suite:
  ```bash
  npx playwright test tests/e2e/instagram-flows.spec.ts
  ```

## Acceptance Evidence

TBD
