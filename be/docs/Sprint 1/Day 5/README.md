# Sprint 1 - Day 5

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Dung duoc publish pipeline end-to-end: token refresh, scheduled jobs, publish adapters cho 3 provider va media flow usable.

## 2. Jira scope

- ST08: Implement integration token refresh and health tracking
- ST10: Implement scheduling pipeline and background publish job
- ST11: Implement publish adapters for X, TikTok, and YouTube
- ST12: Implement media upload, storage abstraction, and post attachment flow

## 3. Exit criteria

- Co recurring job refresh token.
- Co immediate publish endpoint va due post scanner.
- X, TikTok, YouTube publish duoc end-to-end.
- Media upload, list, delete, attach vao post duoc.

## 4. Workboard

- [x] D5-T01 Implement refresh token service and recurring Hangfire job
- [x] D5-T02 Add publish state machine and immediate publish endpoint
- [x] D5-T03 Add due-post scanning job and publish result persistence
- [x] D5-T04 Implement X, TikTok, and YouTube publish adapters
- [x] D5-T05 Implement media storage abstraction and upload endpoint
- [x] D5-T06 Implement media list, delete, attachment flow, and integration tests

## 5. Engineering tasks chi tiet

### D5-T01 Implement refresh token service and recurring Hangfire job

- Jira mapping: ST08 / SUB31 / SUB32 / SUB33
- Owner: Dev B
- Do:
  - Tao refresh token service va contract ket qua.
  - Tao recurring job quet integration can refresh.
  - Cap nhat integration health khi refresh fail.
- Verify:
  - Integration sap het han duoc refresh hoac bi mark loi ro rang.
- Prompt seed:
  - Implement D5-T01 only: add refresh token service, recurring Hangfire job, and integration health tracking for expiring provider tokens.

### D5-T02 Add publish state machine and immediate publish endpoint

- Jira mapping: ST10 / SUB40 / SUB41
- Owner: Dev C
- Do:
  - Chot state transition rules.
  - Tao endpoint publish ngay cho post.
  - Chan publish neu post hoac integration khong hop le.
- Verify:
  - Post chuyen state dung tu `Draft` sang `Publishing` va ket thuc o `Published` hoac `Failed`.
- Prompt seed:
  - Implement D5-T02 only: add the post publish state machine and an immediate publish endpoint with guard checks.

### D5-T03 Add due-post scanning job and publish result persistence

- Jira mapping: ST10 / SUB42 / SUB43 / SUB44
- Owner: Dev C
- Do:
  - Tao Hangfire job scan cac post den gio publish.
  - Goi publish flow va luu publish result, external ids, loi neu co.
  - Them retry strategy co ban cho loi transient.
- Verify:
  - Scheduled post tu publish duoc khi den gio.
- Prompt seed:
  - Implement D5-T03 only: add the due-post scanning job, call publish flow for scheduled posts, persist publish result, and add a basic retry policy.

### D5-T04 Implement X, TikTok, and YouTube publish adapters

- Jira mapping: ST11 / SUB45 / SUB46 / SUB47 / SUB48 / SUB49
- Owner: Dev C
- Do:
  - Tao normalized publish request/response.
  - Implement publish logic cho X, TikTok, YouTube.
  - Map provider-specific error ve error model chung.
  - Them logs co correlation id.
- Verify:
  - Moi provider publish thanh cong tra duoc external id hoac release URL.
- Prompt seed:
  - Implement D5-T04 only: add publish adapters for X, TikTok, and YouTube using the normalized publish contract and shared error mapping.

### D5-T05 Implement media storage abstraction and upload endpoint

- Jira mapping: ST12 / SUB50 / SUB51
- Owner: Dev C
- Do:
  - Tao storage abstraction va local provider truoc.
  - Tao upload endpoint va validation file type, size.
  - Chuan bi extension point cho R2 neu can sau sprint.
- Verify:
  - Upload file thanh cong va file luu dung noi.
- Prompt seed:
  - Implement D5-T05 only: add media storage abstraction with a local provider and an upload endpoint with file validation.

### D5-T06 Implement media list, delete, attachment flow, and integration tests

- Jira mapping: ST12 / SUB52 / SUB53
- Owner: Dev C
- Do:
  - Luu media metadata vao DB.
  - Tao list/delete API.
  - Noi media vao post va test attach flow.
- Verify:
  - Post co the tham chieu media da upload.
- Prompt seed:
  - Implement D5-T06 only: persist media metadata, expose list/delete APIs, connect uploaded media to posts, and add tests for the attachment flow.

## 6. Cuoi ngay phai chot

- Core publish flow da demo duoc.
- Media khong con la blocker cho posting.
- Day 6 chi con handling cho billing, analytics, logs, hardening.

## 7. Neu truot scope

- Khong duoc cat ST10 hoac ST11.
- Media phai usable o muc local storage, chua can R2 that neu thieu thoi gian.
