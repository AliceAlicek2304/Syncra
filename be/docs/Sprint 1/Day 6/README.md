# Sprint 1 - Day 6

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Bo sung billing sandbox, analytics contracts, observability va hardening de MVP khong chi chay duoc ma con co the debug va demo co kiem soat.

## 2. Jira scope

- ST13: Implement basic Stripe subscription APIs and webhook handling
- ST14: Implement basic post and integration analytics endpoints
- ST15: Add structured logging, Sentry, and request tracing for critical flows

## 3. Exit criteria

- Co current subscription API, create/cancel sandbox flow, webhook update state.
- Analytics endpoints tra contract on dinh.
- Request co correlation id, error quan trong vao Sentry, logs khong lo secret.

## 4. Workboard

- [ ] D6-T01 Add subscription model, repository, and current subscription API
- [ ] D6-T02 Implement Stripe sandbox create and cancel flows
- [ ] D6-T03 Implement Stripe webhook with signature verification and state update
- [ ] D6-T04 Implement post and integration analytics contracts and endpoints
- [ ] D6-T05 Add correlation ID, structured logs, Sentry, and secret redaction
- [ ] D6-T06 Run hardening pass for validation, retries, and operational notes

## 5. Engineering tasks chi tiet

### D6-T01 Add subscription model, repository, and current subscription API

- Jira mapping: ST13 / SUB54
- Owner: Dev A
- Do:
  - Tao entity, repository va DTO cho subscription.
  - Tao endpoint lay trang thai subscription hien tai theo organization.
- Verify:
  - API tra duoc state subscription ngay ca khi chua co active subscription.
- Prompt seed:
  - Implement D6-T01 only: add subscription persistence and a current subscription API scoped to the current organization.

### D6-T02 Implement Stripe sandbox create and cancel flows

- Jira mapping: ST13 / SUB55
- Owner: Dev A
- Do:
  - Integrate Stripe sandbox tao subscription session.
  - Them cancel flow o muc MVP.
  - Ghi lai event log can thiet cho support debug.
- Verify:
  - Tao session va cancel sandbox chay duoc.
- Prompt seed:
  - Implement D6-T02 only: integrate Stripe sandbox create and cancel subscription flows for the MVP backend.

### D6-T03 Implement Stripe webhook with signature verification and state update

- Jira mapping: ST13 / SUB56 / SUB57
- Owner: Dev A
- Do:
  - Tao webhook endpoint.
  - Verify signature.
  - Update state subscription vao DB.
  - Ghi replay notes cho test lai webhook.
- Verify:
  - Webhook event quan trong cap nhat state duoc.
- Prompt seed:
  - Implement D6-T03 only: add Stripe webhook handling with signature verification, subscription state updates, and replay notes.

### D6-T04 Implement post and integration analytics contracts and endpoints

- Jira mapping: ST14 / SUB58 / SUB59 / SUB60 / SUB61
- Owner: Dev A
- Do:
  - Chot analytics response model cho per-post va per-integration.
  - Tra placeholder data neu provider chua co metric day du.
  - Cap nhat Swagger examples.
- Verify:
  - Frontend co contract on dinh de bat dau goi API.
- Prompt seed:
  - Implement D6-T04 only: add basic post and integration analytics endpoints with stable response contracts and placeholder fallback behavior.

### D6-T05 Add correlation ID, structured logs, Sentry, and secret redaction

- Jira mapping: ST15 / SUB62 / SUB63 / SUB64 / SUB65
- Owner: Dev A
- Do:
  - Tao request correlation middleware.
  - Cau hinh structured logging.
  - Tich hop Sentry cho runtime errors quan trong.
  - Redact secrets va token trong logs.
- Verify:
  - Auth, OAuth, publish, billing flow co correlation id va log du de debug.
- Prompt seed:
  - Implement D6-T05 only: add correlation IDs, structured logging, Sentry integration, and redaction for sensitive values in logs.

### D6-T06 Run hardening pass for validation, retries, and operational notes

- Jira mapping: Hardening round 1 trong sprint plan
- Owner: Tech Lead + Dev A
- Do:
  - Soat validation gaps o auth, integrations, posts, billing.
  - Soat retry va timeout cho publish va webhook flow.
  - Ghi operational notes cho Day 7 docs va smoke run.
- Verify:
  - Khong con blocker ro rang cho smoke test Day 7.
- Prompt seed:
  - Review the Sprint 1 backend after Day 6, identify validation or observability gaps, and propose the smallest hardening changes before the Day 7 smoke run.

## 6. Cuoi ngay phai chot

- Neu billing va analytics van trong scope, thi phai o muc demo duoc.
- Observability phai du tot de sang Day 7 co the debug nhanh khi smoke fail.

## 7. Neu truot scope

- ST13, ST14, ST15 la nhom co the day ra sau neu Day 3 da canh bao risk.
- Du co cat billing hay analytics, correlation ID va secret redaction van nen giu o muc co ban.
