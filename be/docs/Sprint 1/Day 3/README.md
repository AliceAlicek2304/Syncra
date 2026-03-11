# Sprint 1 - Day 3

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Dung framework social integration co the scale duoc, va connect thanh cong 2 provider dau tien la X va TikTok.

## 2. Jira scope

- ST06: Create social provider contract and integration registry
- ST07: Implement OAuth connect flow for X, TikTok, and YouTube

## 3. Exit criteria

- `ISocialProvider` va registry da chot.
- Endpoint connect, callback, list, disconnect da co.
- X va TikTok connect duoc end-to-end.
- Token va metadata luu duoc theo organization.

## 4. Workboard

- [ ] D3-T01 Define normalized provider contracts and shared error model
- [ ] D3-T02 Implement provider registry and DI resolution
- [ ] D3-T03 Add integration connect, callback, list, and disconnect endpoints
- [ ] D3-T04 Implement X OAuth provider
- [ ] D3-T05 Implement TikTok OAuth provider
- [ ] D3-T06 Persist integration tokens, profile metadata, and manual verification notes
- [ ] D3-T07 Run Day 3 scope check for billing and analytics

## 5. Engineering tasks chi tiet

### D3-T01 Define normalized provider contracts and shared error model

- Jira mapping: ST06 / SUB21 / SUB23
- Owner: Dev B
- Do:
  - Tao `ISocialProvider` va base abstraction cho auth URL, callback exchange, refresh token, publish, analytics.
  - Chot normalized models cho auth result, publish result, analytics result, provider error.
- Verify:
  - Them provider moi khong can doi business flow loi.
- Prompt seed:
  - Implement D3-T01 only: define the provider contracts and normalized auth/publish/analytics result models for Sprint 1 providers.

### D3-T02 Implement provider registry and DI resolution

- Jira mapping: ST06 / SUB22
- Owner: Dev B
- Do:
  - Tao registry hoac DI resolution theo provider key.
  - Chot convention dang ky provider de Day 4-5 them YouTube va publish adapters khong sua flow chung.
- Verify:
  - Co the resolve provider bang identifier `x`, `tiktok`, `youtube`.
- Prompt seed:
  - Implement D3-T02 only: add provider registry or DI resolution by provider identifier with clear extension points for future providers.

### D3-T03 Add integration connect, callback, list, and disconnect endpoints

- Jira mapping: ST07 / SUB25 / SUB30
- Owner: Dev B
- Do:
  - Tao API generate connect URL, callback exchange, list integrations, disconnect integration.
  - Dam bao flow chay theo organization context.
  - Chuan hoa response va error mapping.
- Verify:
  - API skeleton da san sang cho provider cu the.
- Prompt seed:
  - Implement D3-T03 only: expose connect, callback, list, and disconnect endpoints for integrations using the provider registry.

### D3-T04 Implement X OAuth provider

- Jira mapping: ST07 / SUB26
- Owner: Dev B
- Do:
  - Implement X auth URL, callback exchange, token mapping, va profile metadata can thiet.
  - Handle token response va error states ro rang.
- Verify:
  - X connect duoc trong sandbox/dev app.
- Prompt seed:
  - Implement D3-T04 only: add the X OAuth provider with connect URL generation, callback token exchange, and metadata mapping.

### D3-T05 Implement TikTok OAuth provider

- Jira mapping: ST07 / SUB27
- Owner: Dev C
- Do:
  - Implement TikTok auth URL, callback exchange, token mapping, va profile metadata.
  - Xu ly state va callback validation.
- Verify:
  - TikTok connect duoc trong sandbox/dev app.
- Prompt seed:
  - Implement D3-T05 only: add the TikTok OAuth provider with connect URL generation, callback token exchange, and metadata mapping.

### D3-T06 Persist integration tokens, profile metadata, and manual verification notes

- Jira mapping: ST07 / SUB29
- Owner: Dev B + Dev C
- Do:
  - Luu token, refresh token, expiry, external account info, status, provider metadata.
  - Ghi checklist test tay cho X va TikTok de QA va dev khac lap lai duoc.
- Verify:
  - List integrations tra dung du lieu theo organization.
- Prompt seed:
  - Implement D3-T06 only: persist integration credentials and metadata safely, then document the manual verification flow for the first two providers.

### D3-T07 Run Day 3 scope check for billing and analytics

- Jira mapping: Scope gate tu sprint plan
- Owner: Tech Lead
- Do:
  - Check X va TikTok da on dinh chua.
  - Check YouTube blocker co dang lon khong.
  - Neu provider flow con chua on dinh, danh dau truoc ST13-ST15 la first candidates de move.
- Verify:
  - Co ket luan giu hay cat billing/analytics neu can.
- Prompt seed:
  - Summarize Sprint 1 status at the end of Day 3 and recommend whether billing or analytics should remain in scope based on provider stability.

## 6. Cuoi ngay phai chot

- Framework integrations da dung shape.
- X va TikTok connect duoc hoac blocker da rat cu the.
- Team khong di tiep Day 4 voi mot provider abstraction mo ho.

## 7. Neu truot scope

- YouTube co the day sang Day 4 dung ke hoach.
- Tuyet doi khong duoc bo qua normalized provider contract va registry.
