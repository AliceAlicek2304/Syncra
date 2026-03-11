# Sprint 1 - Day 4

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Hoan tat provider thu 3 la YouTube va dung Post CRUD day du de den Day 5 chi con tap trung vao publishing, jobs va media.

## 2. Jira scope

- ST07: Implement OAuth connect flow for X, TikTok, and YouTube
- ST09: Implement post CRUD with integration and media mapping

## 3. Exit criteria

- YouTube connect duoc.
- Post CRUD hoat dong cho draft va scheduled post.
- Filter co ban theo `status`, `date`, `integration` chay duoc.

## 4. Workboard

- [ ] D4-T01 Implement YouTube OAuth provider
- [ ] D4-T02 Define post DTOs, validation rules, and status model
- [ ] D4-T03 Implement create and update post services
- [ ] D4-T04 Implement list, detail, delete, and filter queries
- [ ] D4-T05 Map post with integration and media references
- [ ] D4-T06 Add CRUD tests and Day 4 demo walkthrough

## 5. Engineering tasks chi tiet

### D4-T01 Implement YouTube OAuth provider

- Jira mapping: ST07 / SUB28
- Owner: Dev C
- Do:
  - Implement connect URL, callback exchange, token mapping va metadata persistence cho YouTube.
  - Dung chung normalized contracts da chot tu Day 3.
- Verify:
  - YouTube connect duoc va xuat hien trong list integrations.
- Prompt seed:
  - Implement D4-T01 only: add the YouTube OAuth provider using the existing provider registry and normalized auth result contracts.

### D4-T02 Define post DTOs, validation rules, and status model

- Jira mapping: ST09 / SUB35
- Owner: Dev C
- Do:
  - Chot post request/response DTO.
  - Chot status `Draft`, `Queue`, `Publishing`, `Published`, `Failed`.
  - Them validation cho content, schedule time, integration reference, media references.
- Verify:
  - Swagger contract ro, khong co field ambiguous.
- Prompt seed:
  - Implement D4-T02 only: define the post DTOs, validation rules, and status model for draft and scheduled publishing.

### D4-T03 Implement create and update post services

- Jira mapping: ST09 / SUB36
- Owner: Dev C
- Do:
  - Implement application service tao post va update post.
  - Dam bao loc theo organization va validate integration ownership.
  - Chua can publish ngay trong task nay.
- Verify:
  - User tao duoc draft va scheduled post.
- Prompt seed:
  - Implement D4-T03 only: add post create and update services with tenant isolation and validation against integration ownership.

### D4-T04 Implement list, detail, delete, and filter queries

- Jira mapping: ST09 / SUB37 / SUB38
- Owner: Dev C
- Do:
  - Tao query list posts, detail post, delete post.
  - Them filters theo status, date, integration.
  - Dam bao query khong lo data organization khac.
- Verify:
  - `GET /api/posts` va `GET /api/posts/{id}` tra dung theo org.
- Prompt seed:
  - Implement D4-T04 only: add post list/detail/delete queries with status, date, and integration filters scoped to the current organization.

### D4-T05 Map post with integration and media references

- Jira mapping: ST09 lien ket ST07 va ST12
- Owner: Dev C
- Do:
  - Cho phep post reference 1 hoac nhieu integration theo pham vi MVP da chot.
  - Tao cho dat san cho media references de Day 5 attach flow chi con noi vao.
- Verify:
  - Post luu duoc integration reference va media reference hop le.
- Prompt seed:
  - Implement D4-T05 only: map posts to connected integrations and media references in a way that is ready for the Day 5 media attachment flow.

### D4-T06 Add CRUD tests and Day 4 demo walkthrough

- Jira mapping: ST09 / SUB39
- Owner: Dev C
- Do:
  - Them tests cho create, update, list, delete, filters.
  - Ghi lai flow test tay ngan de show YouTube connect + post CRUD cuoi ngay.
- Verify:
  - CRUD tests pass.
- Prompt seed:
  - Implement D4-T06 only: add tests for post CRUD and basic filters, then describe the manual demo flow for Day 4.

## 6. Cuoi ngay phai chot

- Ca 3 provider priority da connect duoc.
- Post CRUD khong con la blocker cho publish pipeline.

## 7. Neu truot scope

- Khong duoc bo list/detail/delete.
- Neu media attach chua dep, co the de o dang reference placeholder nhung schema va contract phai dung.
