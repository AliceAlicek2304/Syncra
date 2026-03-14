# Syncra.NET Backend - Jira Backlog Chi Tiet

## 1. Muc dich tai lieu

Tai lieu nay chuyen sprint plan trong `docs/PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md` thanh backlog task chi tiet theo format Jira de:

Roadmap tong the 19 sprint tuong ung nam o `docs/PRD-Syncra-DotNet-Backend-19-Sprint-Roadmap.md`.
Breakdown engineering theo tung ngay cho Sprint 1 nam o `docs/Sprint 1/README.md`.

- Product va Tech Lead copy vao Jira nhanh
- Dev doc la biet pham vi va thu tu lam
- Scrum Master hoac PM co the dung de lap sprint board ngay

Backlog nay duoc khoa theo cac quyet dinh sau:

- Sprint target: MVP backend chay local va demo duoc
- Team size: 3+ backend dev
- Providers uu tien: X, TikTok, YouTube
- Kien truc .NET: Controller -> Application Service -> Repository -> EF Core
- Job engine: Hangfire

## 2. Quy uoc Jira de dung cho backlog nay

### Project setup de xuat

- Project/Board: `Syncra.NET Backend`
- Sprint: `Sprint 1 - 7 Day MVP`
- Labels chung: `Syncra-dotnet`, `backend`, `sprint-1`, `mvp`
- Priority scale: `Highest`, `High`, `Medium`

### Quy uoc issue key tam thoi

Vi chua co Jira key that, tai lieu nay dung placeholder key:

- Epic: `PZNET-EPxx`
- Story: `PZNET-STxx`
- Task/Sub-task: `PZNET-SUBxx`

Khi tao tren Jira, giu nguyen `Summary` va thay placeholder key bang key that.

### Rule grooming

- Tao tat ca Epic truoc
- Tao Story sau, link bang truong `Epic Link`
- Tao Sub-task duoi moi Story trong luc sprint planning
- Neu toi cuoi Day 3 ma 3 provider chua connect on dinh, move billing hoac analytics sang backlog sau sprint

## 3. Tong quan backlog

| Placeholder | Issue Type | Summary | Priority | Estimate | Owner Suggestion |
| --- | --- | --- | --- | --- | --- |
| PZNET-EP01 | Epic | Foundation and Platform Setup | Highest | Sprint scope | Dev A |
| PZNET-EP02 | Epic | Authentication and Organization Access | Highest | Sprint scope | Dev A |
| PZNET-EP03 | Epic | Social Integration Framework | Highest | Sprint scope | Dev B |
| PZNET-EP04 | Epic | Post Management and Publishing | Highest | Sprint scope | Dev C |
| PZNET-EP05 | Epic | Media Management | High | Sprint scope | Dev C |
| PZNET-EP06 | Epic | Billing and Stripe Webhooks | Medium | Sprint scope | Dev A |
| PZNET-EP07 | Epic | Analytics and Observability | Medium | Sprint scope | Dev A |
| PZNET-EP08 | Epic | Quality Gate and Release Candidate | Highest | Sprint scope | Tech Lead + ca team |

## 4. Epic va Story chi tiet

---

## PZNET-EP01

- Issue Type: Epic
- Summary: Foundation and Platform Setup
- Epic Name: Syncra.NET Foundation
- Priority: Highest
- Labels: `Syncra-dotnet`, `backend`, `sprint-1`, `foundation`
- Description:
  Xay nen tang ky thuat cho backend .NET moi, bao gom solution, project structure, configuration, DI, health checks, Swagger, persistence setup, migration va local runtime.
- Exit Criteria:
  - Solution build pass local
  - API boot thanh cong
  - Swagger hoat dong
  - PostgreSQL va Redis ket noi duoc
  - Initial migration apply duoc tren moi truong dev rong

### PZNET-ST01

- Issue Type: Story
- Summary: Bootstrap .NET solution and API shell
- Epic Link: Foundation and Platform Setup
- Priority: Highest
- Story Points: 5
- Original Estimate: 1 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `foundation`, `api-shell`
- Description:
  Tao solution .NET 8 va 5 projects theo architecture da chot. Cai dat dependency injection, app startup, middleware co ban, Swagger, health check va configuration binding.
- Acceptance Criteria:
  - Solution co 5 projects `Api`, `Application`, `Infrastructure`, `Domain`, `Shared`
  - App start duoc o local ma khong loi configuration
  - Swagger UI truy cap duoc
  - Co endpoint health check tra `200 OK`
  - Co global exception handling co ban
- Dependencies: None
- Suggested Sub-tasks:
  - PZNET-SUB01: Create solution and project references, 0.25 day
  - PZNET-SUB02: Configure dependency injection and configuration modules, 0.25 day
  - PZNET-SUB03: Add Swagger, health checks, exception middleware, 0.25 day
  - PZNET-SUB04: Add appsettings structure and environment variable binding, 0.25 day

### PZNET-ST02

- Issue Type: Story
- Summary: Set up persistence foundation with EF Core and initial migration
- Epic Link: Foundation and Platform Setup
- Priority: Highest
- Story Points: 5
- Original Estimate: 1 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `persistence`, `ef-core`
- Description:
  Tao `DbContext`, entity mappings, repositories co ban, migration dau tien va seed data toi thieu cho local development.
- Acceptance Criteria:
  - Tao bang thanh cong cho `Users`, `Organizations`, `Integrations`, `Posts`, `Media`, `Subscriptions`
  - Migration apply duoc len database rong
  - Co seed data toi thieu cho smoke test local
  - Repository base pattern co the duoc inject vao services
- Dependencies:
  - PZNET-ST01
- Suggested Sub-tasks:
  - PZNET-SUB05: Create core entities and enum mappings, 0.25 day
  - PZNET-SUB06: Implement `SyncraDbContext` and Fluent API config, 0.25 day
  - PZNET-SUB07: Add repositories and unit-of-work convention, 0.25 day
  - PZNET-SUB08: Create initial migration and seed data script, 0.25 day

### PZNET-ST03

- Issue Type: Task
- Summary: Prepare local infrastructure and external credentials checklist
- Epic Link: Foundation and Platform Setup
- Priority: Highest
- Story Points: 2
- Original Estimate: 0.5 day
- Assignee Suggestion: Tech Lead
- Labels: `Syncra-dotnet`, `infra`, `blocked-by-external`
- Description:
  Chot danh sach credentials va local services can co de sprint khong bi block giua chang, bao gom PostgreSQL, Redis, Stripe sandbox va OAuth apps cho X, TikTok, YouTube.
- Acceptance Criteria:
  - Co file checklist environment requirements
  - Co owner cho moi credential con thieu
  - Team biet ro credential nao bat buoc phai co trong Day 1
- Dependencies: None
- Suggested Sub-tasks:
  - PZNET-SUB09: List all env vars required for sprint MVP, 0.1 day
  - PZNET-SUB10: Confirm provider app credentials for X, TikTok, YouTube, 0.2 day
  - PZNET-SUB11: Confirm Stripe sandbox keys and webhook secret strategy, 0.2 day

---

## PZNET-EP02

- Issue Type: Epic
- Summary: Authentication and Organization Access
- Epic Name: Syncra.NET Auth and Org
- Priority: Highest
- Labels: `Syncra-dotnet`, `auth`, `organization`, `sprint-1`
- Description:
  Xay dung auth API-first bang JWT va tenant isolation theo organization de cac module khac co the phat trien an toan.
- Exit Criteria:
  - Register, login, refresh, logout chay duoc
  - User tao organization duoc
  - Resource isolation theo organization dung
  - Unauthorized request bi chan dung

### PZNET-ST04

- Issue Type: Story
- Summary: Implement JWT authentication and refresh token flow
- Epic Link: Authentication and Organization Access
- Priority: Highest
- Story Points: 8
- Original Estimate: 1.25 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `auth`, `jwt`
- Description:
  Implement dang ky, dang nhap, refresh token, logout va password hashing. Sprint nay uu tien auth API-first, chua can cookie parity voi NestJS.
- Acceptance Criteria:
  - User co the register account moi
  - User login nhan duoc access token va refresh token
  - Refresh token rotate duoc va refresh token cu bi invalid
  - Endpoint can auth tu choi token sai hoac het han
  - Password duoc hash truoc khi luu DB
- Dependencies:
  - PZNET-ST01
  - PZNET-ST02
- Suggested Sub-tasks:
  - PZNET-SUB12: Design auth DTOs and token response contract, 0.15 day
  - PZNET-SUB13: Implement register and login service, 0.35 day
  - PZNET-SUB14: Implement refresh token persistence and rotation, 0.35 day
  - PZNET-SUB15: Add auth middleware/policy and logout endpoint, 0.2 day
  - PZNET-SUB16: Add unit tests for auth service, 0.2 day

### PZNET-ST05

- Issue Type: Story
- Summary: Implement organization membership and tenant isolation
- Epic Link: Authentication and Organization Access
- Priority: Highest
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `organization`, `multi-tenant`
- Description:
  Tao organization, lay organization hien tai, membership mapping va authorization co ban theo role `ADMIN`, `USER`.
- Acceptance Criteria:
  - User tao organization duoc
  - User co the lay du lieu organization hien tai
  - Moi query cua domain chinh deu loc theo organization
  - User khong doc duoc data organization khac
- Dependencies:
  - PZNET-ST04
- Suggested Sub-tasks:
  - PZNET-SUB17: Create organization entities and membership mapping, 0.2 day
  - PZNET-SUB18: Implement create/current organization endpoints, 0.25 day
  - PZNET-SUB19: Add organization resolver in request pipeline, 0.15 day
  - PZNET-SUB20: Add tenant isolation tests, 0.15 day

---

## PZNET-EP03

- Issue Type: Epic
- Summary: Social Integration Framework
- Epic Name: Syncra.NET Integrations
- Priority: Highest
- Labels: `Syncra-dotnet`, `integrations`, `oauth`, `sprint-1`
- Description:
  Xay framework chung cho social providers, registry, OAuth flow, token refresh, integration health va list/disconnect APIs.
- Exit Criteria:
  - Co provider contract ro rang
  - X, TikTok, YouTube connect thanh cong
  - Token va metadata luu duoc
  - Token refresh job chay duoc

### PZNET-ST06

- Issue Type: Story
- Summary: Create social provider contract and integration registry
- Epic Link: Social Integration Framework
- Priority: Highest
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Dev B
- Labels: `Syncra-dotnet`, `integrations`, `provider-framework`
- Description:
  Tao `ISocialProvider`, base provider abstraction, registry va shared error model cho OAuth, publish, analytics va refresh token.
- Acceptance Criteria:
  - Co provider interface cho auth URL, callback exchange, refresh token, publish, analytics
  - Co registry hoac DI strategy de lay provider theo identifier
  - Them provider moi khong can sua business flow loi
  - Co error model chung cho provider-specific failures
- Dependencies:
  - PZNET-ST01
  - PZNET-ST02
- Suggested Sub-tasks:
  - PZNET-SUB21: Design provider interfaces and base classes, 0.2 day
  - PZNET-SUB22: Create registry/DI resolution by provider identifier, 0.2 day
  - PZNET-SUB23: Define normalized auth, publish and analytics models, 0.2 day
  - PZNET-SUB24: Add integration provider unit tests, 0.15 day

### PZNET-ST07

- Issue Type: Story
- Summary: Implement OAuth connect flow for X, TikTok, and YouTube
- Epic Link: Social Integration Framework
- Priority: Highest
- Story Points: 8
- Original Estimate: 1.5 day
- Assignee Suggestion: Dev B plus Dev C
- Labels: `Syncra-dotnet`, `oauth`, `x`, `tiktok`, `youtube`
- Description:
  Build connect URL, callback exchange, token persistence, integration list va disconnect cho ba provider uu tien.
- Acceptance Criteria:
  - User ket noi duoc X qua OAuth
  - User ket noi duoc TikTok qua OAuth
  - User ket noi duoc YouTube qua OAuth
  - Token, refresh token, account metadata duoc luu DB
  - API list integrations tra dung du lieu theo organization
  - API disconnect integration hoat dong
- Dependencies:
  - PZNET-ST05
  - PZNET-ST06
  - PZNET-ST03
- Suggested Sub-tasks:
  - PZNET-SUB25: Implement integration connect and callback endpoints, 0.25 day
  - PZNET-SUB26: Implement X OAuth provider, 0.35 day
  - PZNET-SUB27: Implement TikTok OAuth provider, 0.35 day
  - PZNET-SUB28: Implement YouTube OAuth provider, 0.35 day
  - PZNET-SUB29: Persist integration tokens and profile metadata, 0.2 day
  - PZNET-SUB30: Implement list and disconnect APIs, 0.15 day

### PZNET-ST08

- Issue Type: Story
- Summary: Implement integration token refresh and health tracking
- Epic Link: Social Integration Framework
- Priority: High
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Dev B
- Labels: `Syncra-dotnet`, `token-refresh`, `hangfire`, `integration-health`
- Description:
  Tao refresh token service, Hangfire recurring job va integration health status de xu ly token sap het han hoac refresh that bai.
- Acceptance Criteria:
  - Co recurring job quet integrations can refresh
  - Refresh thanh cong thi token moi duoc cap nhat
  - Refresh that bai thi integration duoc danh dau co van de
  - Co log du de debug refresh flow
- Dependencies:
  - PZNET-ST06
  - PZNET-ST07
- Suggested Sub-tasks:
  - PZNET-SUB31: Create refresh token service and result contract, 0.2 day
  - PZNET-SUB32: Add Hangfire recurring refresh job, 0.2 day
  - PZNET-SUB33: Add integration health fields and failure handling, 0.2 day
  - PZNET-SUB34: Add tests for refresh success/failure paths, 0.15 day

---

## PZNET-EP04

- Issue Type: Epic
- Summary: Post Management and Publishing
- Epic Name: Syncra.NET Posts and Publishing
- Priority: Highest
- Labels: `Syncra-dotnet`, `posts`, `scheduler`, `publishing`, `sprint-1`
- Description:
  Tao CRUD cho posts, scheduling, publish ngay, background job publish, state machine co ban va provider publish adapters cho X, TikTok, YouTube.
- Exit Criteria:
  - Create, list, get, update, delete post chay duoc
  - Scheduled post duoc publish dung gio
  - Publish fail cap nhat state va error message
  - X, TikTok, YouTube publish duoc end-to-end

### PZNET-ST09

- Issue Type: Story
- Summary: Implement post CRUD with integration and media mapping
- Epic Link: Post Management and Publishing
- Priority: Highest
- Story Points: 8
- Original Estimate: 1 day
- Assignee Suggestion: Dev C
- Labels: `Syncra-dotnet`, `posts`, `crud`
- Description:
  Tao APIs create/list/detail/update/delete post. Support draft, scheduled date, integration reference, media reference va cac filter co ban.
- Acceptance Criteria:
  - User tao duoc draft post
  - User tao duoc scheduled post
  - User xem duoc list posts theo organization
  - User xem duoc chi tiet mot post
  - User update va delete duoc post
  - Filter theo `status`, `date`, `integration` hoat dong
- Dependencies:
  - PZNET-ST05
  - PZNET-ST07
  - PZNET-ST02
- Suggested Sub-tasks:
  - PZNET-SUB35: Design post DTOs and validation rules, 0.2 day
  - PZNET-SUB36: Implement create and update post services, 0.3 day
  - PZNET-SUB37: Implement list/detail/delete repository queries, 0.25 day
  - PZNET-SUB38: Add status and date filter support, 0.15 day
  - PZNET-SUB39: Add tests for CRUD and tenant isolation, 0.1 day

### PZNET-ST10

- Issue Type: Story
- Summary: Implement scheduling pipeline and background publish job
- Epic Link: Post Management and Publishing
- Priority: Highest
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Dev C
- Labels: `Syncra-dotnet`, `scheduler`, `hangfire`, `publishing`
- Description:
  Tao publish immediate API, due post scanner, Hangfire jobs va state transition cho draft, queue, publishing, published, failed.
- Acceptance Criteria:
  - Co API publish ngay cho mot post
  - Scheduled post duoc worker publish khi den gio
  - State chuyen dung `Draft -> Queue -> Publishing -> Published` hoac `Failed`
  - Publish that bai luu duoc error message
  - Co retry policy co ban cho loi transient
- Dependencies:
  - PZNET-ST09
  - PZNET-ST08
- Suggested Sub-tasks:
  - PZNET-SUB40: Add state machine rules and transition guards, 0.15 day
  - PZNET-SUB41: Implement immediate publish endpoint and command, 0.2 day
  - PZNET-SUB42: Add Hangfire job to scan and publish due posts, 0.2 day
  - PZNET-SUB43: Store publish result and failure details, 0.1 day
  - PZNET-SUB44: Add tests for schedule and retry flow, 0.1 day

### PZNET-ST11

- Issue Type: Story
- Summary: Implement publish adapters for X, TikTok, and YouTube
- Epic Link: Post Management and Publishing
- Priority: Highest
- Story Points: 8
- Original Estimate: 1.25 day
- Assignee Suggestion: Dev C
- Labels: `Syncra-dotnet`, `publishing`, `x`, `tiktok`, `youtube`
- Description:
  Implement publish logic that cho 3 providers uu tien va chuan hoa publish response ve external post id, release URL va normalized error model.
- Acceptance Criteria:
  - Publish thanh cong len X tra external id hoac release URL
  - Publish thanh cong len TikTok tra external id hoac release URL
  - Publish thanh cong len YouTube tra external id hoac release URL
  - Loi provider-specific duoc map ve error model chung
  - Publish logs co correlation id de debug
- Dependencies:
  - PZNET-ST06
  - PZNET-ST07
  - PZNET-ST10
- Suggested Sub-tasks:
  - PZNET-SUB45: Implement normalized publish request/response model, 0.15 day
  - PZNET-SUB46: Implement X publish adapter, 0.35 day
  - PZNET-SUB47: Implement TikTok publish adapter, 0.35 day
  - PZNET-SUB48: Implement YouTube publish adapter, 0.35 day
  - PZNET-SUB49: Add publish adapter integration tests, 0.15 day

---

## PZNET-EP05

- Issue Type: Epic
- Summary: Media Management
- Epic Name: Syncra.NET Media
- Priority: High
- Labels: `Syncra-dotnet`, `media`, `upload`, `sprint-1`
- Description:
  Tao luong upload, save metadata, list, delete media va attach media vao post.
- Exit Criteria:
  - Upload local hoac R2 thanh cong
  - Media metadata luu duoc
  - Media list tra dung theo organization
  - Media attach duoc vao post

### PZNET-ST12

- Issue Type: Story
- Summary: Implement media upload, storage abstraction, and post attachment flow
- Epic Link: Media Management
- Priority: High
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Dev C
- Labels: `Syncra-dotnet`, `media`, `storage`
- Description:
  Build media upload endpoint, storage abstraction cho local va R2, save metadata, list/delete media va cho phep attach media vao post.
- Acceptance Criteria:
  - User upload file thanh cong
  - Metadata file duoc luu trong database
  - User lay list media theo organization duoc
  - User xoa media duoc
  - Post co the tham chieu media da upload
- Dependencies:
  - PZNET-ST02
  - PZNET-ST09
- Suggested Sub-tasks:
  - PZNET-SUB50: Implement storage abstraction and local provider, 0.2 day
  - PZNET-SUB51: Implement upload endpoint and validation, 0.2 day
  - PZNET-SUB52: Save media metadata and query list/delete, 0.2 day
  - PZNET-SUB53: Attach media to post and test flow, 0.15 day

---

## PZNET-EP06

- Issue Type: Epic
- Summary: Billing and Stripe Webhooks
- Epic Name: Syncra.NET Billing
- Priority: Medium
- Labels: `Syncra-dotnet`, `billing`, `stripe`, `sprint-1`
- Description:
  Build billing muc toi thieu de demo subscription sandbox, cancel flow va webhook update state.
- Exit Criteria:
  - Subscription read duoc
  - Co create subscription sandbox flow
  - Co cancel subscription flow
  - Stripe webhook cap nhat state duoc

### PZNET-ST13

- Issue Type: Story
- Summary: Implement basic Stripe subscription APIs and webhook handling
- Epic Link: Billing and Stripe Webhooks
- Priority: Medium
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `stripe`, `webhook`
- Description:
  Build get current subscription, create subscription session, cancel subscription va webhook skeleton cho Stripe sandbox.
- Acceptance Criteria:
  - API lay subscription hien tai tra duoc state
  - API tao subscription session tra duoc checkout hoac client secret phu hop
  - API cancel subscription hoat dong trong sandbox
  - Stripe webhook update subscription state vao DB
  - Cac event webhook quan trong duoc log lai
- Dependencies:
  - PZNET-ST05
  - PZNET-ST03
- Suggested Sub-tasks:
  - PZNET-SUB54: Create subscription entity/repository and DTOs, 0.15 day
  - PZNET-SUB55: Integrate Stripe sandbox create/cancel flow, 0.25 day
  - PZNET-SUB56: Implement webhook endpoint and signature verification, 0.2 day
  - PZNET-SUB57: Add billing service tests and webhook replay notes, 0.15 day

---

## PZNET-EP07

- Issue Type: Epic
- Summary: Analytics and Observability
- Epic Name: Syncra.NET Analytics and Observability
- Priority: Medium
- Labels: `Syncra-dotnet`, `analytics`, `observability`, `sprint-1`
- Description:
  Tao analytics API co ban va he thong logs/errors du de debug OAuth, publish va billing flow.
- Exit Criteria:
  - Co endpoint analytics co contract on dinh
  - Structured logs du de trace flow
  - Sentry nhan duoc runtime errors quan trong

### PZNET-ST14

- Issue Type: Story
- Summary: Implement basic post and integration analytics endpoints
- Epic Link: Analytics and Observability
- Priority: Medium
- Story Points: 3
- Original Estimate: 0.5 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `analytics`, `reporting`
- Description:
  Tao read model co ban cho analytics theo post va theo integration. Sprint nay uu tien contract on dinh va placeholder data model neu provider chua tra day du metric.
- Acceptance Criteria:
  - Co endpoint analytics theo post
  - Co endpoint analytics theo integration
  - Contract response on dinh va co docs tren Swagger
  - Analytics endpoint khong lam hong publish flow neu provider chua support du metric
- Dependencies:
  - PZNET-ST07
  - PZNET-ST11
- Suggested Sub-tasks:
  - PZNET-SUB58: Define analytics response model and fallback behavior, 0.15 day
  - PZNET-SUB59: Implement post analytics query/service, 0.15 day
  - PZNET-SUB60: Implement integration analytics query/service, 0.15 day
  - PZNET-SUB61: Document Swagger examples, 0.05 day

### PZNET-ST15

- Issue Type: Story
- Summary: Add structured logging, Sentry, and request tracing for critical flows
- Epic Link: Analytics and Observability
- Priority: Medium
- Story Points: 3
- Original Estimate: 0.5 day
- Assignee Suggestion: Dev A
- Labels: `Syncra-dotnet`, `logging`, `sentry`, `tracing`
- Description:
  Them structured logs, correlation id, Sentry error tracking va tracing toi thieu cho auth, integration, publish va billing flows.
- Acceptance Criteria:
  - Request co correlation id trong logs
  - Runtime error quan trong duoc gui Sentry
  - Publish flow, OAuth flow va webhook flow co log ro rang
  - Khong log secrets hoac token thuan
- Dependencies:
  - PZNET-ST01
- Suggested Sub-tasks:
  - PZNET-SUB62: Add request correlation middleware, 0.1 day
  - PZNET-SUB63: Configure structured logging sinks and format, 0.15 day
  - PZNET-SUB64: Add Sentry integration and filtered breadcrumbs, 0.15 day
  - PZNET-SUB65: Add log redaction for secrets and tokens, 0.1 day

---

## PZNET-EP08

- Issue Type: Epic
- Summary: Quality Gate and Release Candidate
- Epic Name: Syncra.NET Quality and Release
- Priority: Highest
- Labels: `Syncra-dotnet`, `quality`, `testing`, `release`, `sprint-1`
- Description:
  Chot test, docs, smoke run, known issues, demo script va release candidate de backend san sang ban giao cho frontend hoac pilot testing.
- Exit Criteria:
  - Unit tests va integration tests chay duoc cho flow chinh
  - Co smoke script auth -> integration -> post -> publish
  - Swagger, env docs, local setup docs du
  - Co known issues list va release note v0.1

### PZNET-ST16

- Issue Type: Story
- Summary: Add automated tests and smoke verification for MVP critical path
- Epic Link: Quality Gate and Release Candidate
- Priority: Highest
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Tech Lead plus ca team
- Labels: `Syncra-dotnet`, `testing`, `smoke-test`
- Description:
  Tao unit tests, integration tests va smoke flow cho duong di san pham quan trong nhat: auth -> connect integration -> upload media -> create post -> schedule -> publish.
- Acceptance Criteria:
  - Co unit tests cho auth, integration registry, publish flow
  - Co integration tests cho auth, integrations, posts
  - Co smoke test script hoac collection de chay lai flow chinh
  - Build pipeline local pass
- Dependencies:
  - PZNET-ST04
  - PZNET-ST07
  - PZNET-ST09
  - PZNET-ST10
  - PZNET-ST11
  - PZNET-ST12
- Suggested Sub-tasks:
  - PZNET-SUB66: Add unit tests for critical services, 0.25 day
  - PZNET-SUB67: Add integration test harness and seeded fixtures, 0.2 day
  - PZNET-SUB68: Create smoke test collection/script, 0.2 day
  - PZNET-SUB69: Run and fix blocking regressions, 0.1 day

### PZNET-ST17

- Issue Type: Story
- Summary: Finalize Swagger, runbook, deployment notes, and v0.1 release candidate
- Epic Link: Quality Gate and Release Candidate
- Priority: Highest
- Story Points: 5
- Original Estimate: 0.75 day
- Assignee Suggestion: Tech Lead plus Dev A
- Labels: `Syncra-dotnet`, `docs`, `release-candidate`, `swagger`
- Description:
  Hoan tat tai lieu ky thuat can thiet de team frontend, QA va backend co the chay local, demo va tiep tuc sprint sau ma khong mat context.
- Acceptance Criteria:
  - Swagger co mo ta cho MVP endpoints
  - Co local setup guide
  - Co env example hoac deployment notes cho dev
  - Co known issues list
  - Co demo script cho sprint review
  - Co release note `v0.1`
- Dependencies:
  - PZNET-ST16
  - PZNET-ST15
  - PZNET-ST13
  - PZNET-ST14
- Suggested Sub-tasks:
  - PZNET-SUB70: Complete Swagger descriptions and example payloads, 0.2 day
  - PZNET-SUB71: Write local setup and environment guide, 0.15 day
  - PZNET-SUB72: Write deployment notes and Hangfire run instructions, 0.15 day
  - PZNET-SUB73: Create sprint demo script and known issues list, 0.15 day
  - PZNET-SUB74: Cut release candidate checklist and sign-off notes, 0.1 day

---

## 5. Sprint board de xuat

### Day 1 focus

- PZNET-ST01
- PZNET-ST02
- PZNET-ST03

### Day 2 focus

- PZNET-ST04
- PZNET-ST05

### Day 3 focus

- PZNET-ST06
- PZNET-ST07

### Day 4 focus

- PZNET-ST07
- PZNET-ST09

### Day 5 focus

- PZNET-ST08
- PZNET-ST10
- PZNET-ST11
- PZNET-ST12

### Day 6 focus

- PZNET-ST13
- PZNET-ST14
- PZNET-ST15

### Day 7 focus

- PZNET-ST16
- PZNET-ST17

## 6. Dependency map ngan gon

- Foundation truoc tat ca: ST01, ST02, ST03
- Auth va org mo duong cho integrations: ST04, ST05 -> ST06, ST07
- Integrations va refresh mo duong cho publishing: ST06, ST07, ST08 -> ST10, ST11
- Posts CRUD va media la dependency cua smoke flow: ST09, ST12 -> ST16
- Billing, analytics va observability co the bi cat neu sprint co risk: ST13, ST14, ST15

## 7. Story nao khong duoc slip

Neu can cat scope, tuyet doi khong duoc slip cac story sau:

- PZNET-ST01
- PZNET-ST02
- PZNET-ST04
- PZNET-ST05
- PZNET-ST06
- PZNET-ST07
- PZNET-ST09
- PZNET-ST10
- PZNET-ST11
- PZNET-ST12
- PZNET-ST16
- PZNET-ST17

## 8. Story co the day ra sau sprint neu bi tre

Neu toi scope check cuoi Day 3 ma 3 provider chua on dinh, cho phep move cac story sau ra backlog tiep theo:

- PZNET-ST13
- PZNET-ST14
- PZNET-ST15

## 9. Definition of Done cho moi Story

Mot story chi duoc move sang `Done` khi dat du tat ca dieu kien sau:

- Build pass local
- Test toi thieu cho business logic trong pham vi story
- Swagger hoac API docs da cap nhat
- Khong hardcode secrets
- Logs va error handling du de debug
- Khong pha tenant isolation
- DB changes duoc version hoa
- Co cach verify ro rang cho QA hoac dev khac

## 10. Cach copy vao Jira nhanh nhat

1. Tao 8 Epic theo phan 4.
2. Tao 17 Story/Task va link `Epic Link` tuong ung.
3. Tao Sub-task trong luc sprint planning theo danh sach `Suggested Sub-tasks`.
4. Gan assignee theo track `Dev A`, `Dev B`, `Dev C`, `Tech Lead`.
5. Dat tat ca vao sprint `Sprint 1 - 7 Day MVP`.
6. Danh dau `Highest` cho ST01, ST02, ST04, ST05, ST06, ST07, ST09, ST10, ST11, ST16, ST17.

## 11. Ket qua mong doi sau khi backlog nay duoc tao tren Jira

Sau khi import hoac copy backlog nay vao Jira, team phai co kha nang:

- Phan cong viec ngay trong sprint planning
- Nhin ro duong gantt logic cua dependencies
- Biet story nao la MVP core, story nao co the cat
- Demo duoc mot backend .NET co auth, integrations, post publishing, media va quality gate co ban trong 7 ngay