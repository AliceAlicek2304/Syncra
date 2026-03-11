# Sprint 1 - Day 2

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Hoan tat auth API-first va tenant isolation theo organization de Day 3 co the bat dau social integrations tren mot nen identity on dinh.

## 2. Jira scope

- ST04: Implement JWT authentication and refresh token flow
- ST05: Implement organization membership and tenant isolation

## 3. Exit criteria

- Register, login, refresh, logout chay duoc.
- Password duoc hash truoc khi luu.
- User tao va doc organization hien tai duoc.
- Query chinh duoc isolate theo organization.

## 4. Workboard

- [ ] D2-T01 Define auth contracts, DTOs, token payload, password policy
- [ ] D2-T02 Implement register and login services plus controller endpoints
- [ ] D2-T03 Implement refresh token persistence, rotation, and logout
- [ ] D2-T04 Implement organization, membership, and role model
- [ ] D2-T05 Add current organization endpoint and request organization resolver
- [ ] D2-T06 Add auth and tenant isolation tests

## 5. Engineering tasks chi tiet

### D2-T01 Define auth contracts, DTOs, token payload, password policy

- Jira mapping: ST04 / SUB12
- Owner: Dev A
- Do:
  - Chot request/response DTO cho register, login, refresh, logout.
  - Chot JWT claims can co cho user va organization context.
  - Chot password hashing strategy va basic validation rules.
- Verify:
  - Swagger contracts ro rang, khong co field mo ho.
- Prompt seed:
  - Implement D2-T01 only: define DTOs, token response contract, JWT claims, and password validation policy for the Sprint 1 auth flow.

### D2-T02 Implement register and login services plus controller endpoints

- Jira mapping: ST04 / SUB13
- Owner: Dev A
- Do:
  - Implement auth service cho register va login.
  - Tao controller endpoints va mapping loi co ban.
  - Luu user vao DB va phat access token sau login.
- Verify:
  - Register tao duoc account.
  - Login tra duoc access token va refresh token.
- Prompt seed:
  - Implement D2-T02 only: add register and login services and controller endpoints with hashed password storage and JWT issuance.

### D2-T03 Implement refresh token persistence, rotation, and logout

- Jira mapping: ST04 / SUB14 / SUB15
- Owner: Dev A
- Do:
  - Tao bang hoac storage cho refresh token.
  - Implement rotate refresh token va invalidate token cu.
  - Tao logout endpoint va auth protection middleware/policy.
- Verify:
  - Refresh token cu khong dung lai duoc.
  - Endpoint can auth tu choi token sai hoac het han.
- Prompt seed:
  - Implement D2-T03 only: persist refresh tokens, rotate them on refresh, invalidate on logout, and protect authenticated endpoints.

### D2-T04 Implement organization, membership, and role model

- Jira mapping: ST05 / SUB17
- Owner: Dev A
- Do:
  - Tao `Organization` va `OrganizationMember` model neu chua xong tu Day 1.
  - Chot role `ADMIN`, `USER` cho sprint nay.
  - Tao service tao organization va gan owner membership.
- Verify:
  - User tao organization duoc sau khi login.
- Prompt seed:
  - Implement D2-T04 only: add organization membership and role modeling so every primary resource can be scoped to one organization.

### D2-T05 Add current organization endpoint and request organization resolver

- Jira mapping: ST05 / SUB18 / SUB19
- Owner: Dev A
- Do:
  - Tao endpoint create organization va get current organization.
  - Them request pipeline logic de resolve organization context tu token hoac header da chot.
  - Dam bao service/repository lay organization context mot cach nhat quan.
- Verify:
  - User khong doc duoc du lieu organization khac.
- Prompt seed:
  - Implement D2-T05 only: expose create/current organization endpoints and add a request-level organization resolver for tenant isolation.

### D2-T06 Add auth and tenant isolation tests

- Jira mapping: ST04 / SUB16 va ST05 / SUB20
- Owner: Dev A
- Do:
  - Viet unit tests cho auth service.
  - Viet tests cho refresh token rotation.
  - Viet integration hoac service tests cho tenant isolation.
- Verify:
  - Test pass cho happy path va unauthorized path.
- Prompt seed:
  - Implement D2-T06 only: add tests for register, login, refresh rotation, and organization-level data isolation.

## 6. Cuoi ngay phai chot

- Team co auth usable de tiep tuc OAuth provider flow.
- Org isolation da khoa, tranh tinh trang Day 3-5 phai sua lai toan bo query.

## 7. Neu truot scope

- Khong duoc bo refresh token rotation.
- Chua can password reset day du, nhung auth core va organization isolation phai xong.
