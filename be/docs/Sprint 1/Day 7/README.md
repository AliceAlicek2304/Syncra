# Sprint 1 - Day 7

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Khoa chat duong di MVP bang test, smoke, docs, release checklist va demo script de co the ban giao cho frontend hoac chay internal pilot.

## 2. Jira scope

- ST16: Add automated tests and smoke verification for MVP critical path
- ST17: Finalize Swagger, runbook, deployment notes, and v0.1 release candidate

## 3. Exit criteria

- Unit tests va integration tests cho flow chinh pass.
- Co smoke script auth -> connect integration -> upload media -> create post -> schedule -> publish.
- Swagger, env docs, runbook, known issues, demo script, release checklist deu co.

## 4. Workboard

- [ ] D7-T01 Add and fix unit tests for auth, integration registry, and publish flow
- [ ] D7-T02 Add integration test harness and seeded fixtures
- [ ] D7-T03 Build the MVP smoke test script or collection
- [ ] D7-T04 Run smoke, fix blocking regressions, and freeze scope
- [ ] D7-T05 Finalize Swagger descriptions and example payloads
- [ ] D7-T06 Write local setup guide, env notes, and Hangfire run instructions
- [ ] D7-T07 Create demo script, known issues list, and release checklist

## 5. Engineering tasks chi tiet

### D7-T01 Add and fix unit tests for auth, integration registry, and publish flow

- Jira mapping: ST16 / SUB66
- Owner: Ca team
- Do:
  - Chot bo unit tests cho auth service, provider registry, publish orchestration.
  - Fix test gaps truoc khi mo rong them docs.
- Verify:
  - Unit test suite pass.
- Prompt seed:
  - Implement D7-T01 only: add missing unit tests for auth, integration registry, and publish orchestration, then fix the smallest blockers to make them pass.

### D7-T02 Add integration test harness and seeded fixtures

- Jira mapping: ST16 / SUB67
- Owner: Ca team
- Do:
  - Tao integration test harness.
  - Seed fixture cho auth, organization, integration, post, media.
  - Chot cach reset state test.
- Verify:
  - Integration tests chay lap lai duoc tren may dev moi.
- Prompt seed:
  - Implement D7-T02 only: create the integration test harness and seeded fixtures for the Sprint 1 critical path.

### D7-T03 Build the MVP smoke test script or collection

- Jira mapping: ST16 / SUB68
- Owner: Tech Lead + Dev A
- Do:
  - Tao Postman collection, shell script, hoac huong dan smoke co the chay lai.
  - Bao phu duong di auth -> integration -> media -> post -> publish.
- Verify:
  - Mot dev khac co the chay lai smoke ma khong hoi tac gia.
- Prompt seed:
  - Implement D7-T03 only: produce a reusable smoke test script or API collection for the Sprint 1 end-to-end flow.

### D7-T04 Run smoke, fix blocking regressions, and freeze scope

- Jira mapping: ST16 / SUB69
- Owner: Tech Lead + ca team
- Do:
  - Chay smoke test.
  - Fix chi cac blocker cua release candidate.
  - Khong mo rong them feature moi.
- Verify:
  - Co ket qua smoke ro tung buoc pass/fail.
- Prompt seed:
  - Review the Sprint 1 smoke test results, fix only release-blocking regressions, and avoid expanding scope beyond the documented MVP.

### D7-T05 Finalize Swagger descriptions and example payloads

- Jira mapping: ST17 / SUB70
- Owner: Dev A
- Do:
  - Soat het MVP endpoints.
  - Them descriptions, request examples, response examples.
- Verify:
  - Frontend va QA doc Swagger la hieu flow.
- Prompt seed:
  - Implement D7-T05 only: finish Swagger descriptions and example payloads for all Sprint 1 MVP endpoints.

### D7-T06 Write local setup guide, env notes, and Hangfire run instructions

- Jira mapping: ST17 / SUB71 / SUB72
- Owner: Dev A
- Do:
  - Viet local setup guide.
  - Liet ke env vars va gia tri mau can thiet.
  - Ghi cach chay Hangfire worker/jobs.
- Verify:
  - Dev moi clone repo co the dung docs nay de boot local.
- Prompt seed:
  - Implement D7-T06 only: write the local setup guide, environment notes, and Hangfire run instructions for Sprint 1.

### D7-T07 Create demo script, known issues list, and release checklist

- Jira mapping: ST17 / SUB73 / SUB74
- Owner: Tech Lead
- Do:
  - Viet demo script theo narrative cuoi sprint.
  - Liet ke known issues va scope da cat.
  - Tao checklist release candidate `v0.1`.
- Verify:
  - Sprint review co script ro, khong demo theo nho nho.
- Prompt seed:
  - Implement D7-T07 only: create the Sprint 1 demo script, known issues list, and release candidate checklist for v0.1.

## 6. Cuoi ngay phai chot

- Team co mot release candidate ro rang.
- Team co the noi chinh xac cai gi da xong, cai gi chua xong, va route cho Sprint 2.

## 7. Rule freeze

- Sau khi bat dau D7-T04, khong them feature moi.
- Chi sua bug block smoke, demo, docs, hoac release readiness.
