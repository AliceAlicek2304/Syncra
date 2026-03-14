# Syncra.NET Backend - 7 Day Agile Scrum Plan

## 1. Mục tiêu tài liệu

Tài liệu này chuyển PRD trong `docs/PRD-Syncra-DotNet-Backend.md` thành một kế hoạch triển khai backend .NET trong 7 ngày, đủ cụ thể để đội dev có thể bám theo và build.

Tai lieu backlog Jira chi tiet tuong ung nam o `docs/PRD-Syncra-DotNet-Backend-Jira-Backlog.md`.
Roadmap tong the 19 sprint nam o `docs/PRD-Syncra-DotNet-Backend-19-Sprint-Roadmap.md`.
Breakdown engineering theo tung ngay cho Sprint 1 nam o `docs/Sprint 1/README.md`.

Plan này không giả định full parity với backend NestJS hiện tại trong 7 ngày. Thay vào đó, plan chốt một **MVP có thể chạy được**, giữ đúng các luồng cốt lõi của Syncra:

- Auth và organization access
- Kết nối social integrations qua OAuth
- Tạo, lên lịch, và publish post
- Upload media
- Billing cơ bản
- Analytics cơ bản
- Observability và tài liệu API

## 2. Reality Check

### Điều chắc chắn

- Codebase NestJS hiện tại đã có kiến trúc khá đầy đủ theo mô hình `Controller -> Service -> Repository`.
- Phần social integration hiện có hơn 30 provider thật, quản lý tập trung qua `libraries/nestjs-libraries/src/integrations/integration.manager.ts`.
- Các domain chính hiện diện rõ trong code: `auth`, `posts`, `integrations`, `media`, `billing`, `analytics`, `webhooks`, `notifications`, `settings`.

### Kết luận sản phẩm

Không thực tế để giao toàn bộ backend `.NET` với full feature parity và 30+ platform integrations trong 7 ngày.

### Scope khả thi trong 7 ngày

Trong 7 ngày, scope hợp lý là:

- Dựng xong solution và architecture nền .NET
- Hoàn tất core modules quan trọng
- Publish được post end-to-end cho **3 platform ưu tiên**
- Có provider framework để scale tiếp các platform còn lại sau sprint này
- Có test smoke, Swagger, migration, env mẫu, và runbook

## 3. Assumptions đã chốt

Plan này đã được khóa theo các quyết định sau.

1. Team triển khai có `3+ backend engineers` trong 7 ngày.
2. Sẽ build backend `.NET` như một service mới chạy song song, chưa thay ngay toàn bộ NestJS production.
3. Ưu tiên business value là `Auth -> Integrations -> Posts -> Scheduler -> Media -> Billing -> Analytics`.
4. Chỉ commit end-to-end cho `3 social providers` trong sprint này: `X`, `TikTok`, `YouTube`.
5. Chọn `Hangfire` thay vì `MassTransit` để giảm setup time và rủi ro trong sprint ngắn.
6. Auth model dùng `JWT access token + refresh token`, có thể thêm cookie mode sau nếu cần parity với NestJS.

## 4. Quyết định sản phẩm đã xác nhận

Các điểm sau đã được xác nhận và là input chính thức cho sprint:

1. Ba platform ưu tiên: `X`, `TikTok`, `YouTube`.
2. Mục tiêu của sprint: `MVP backend chạy local và demo được`.
3. Team size: `3+ dev`.
4. Hướng auth: `JWT API-first`, cookie compatibility để sprint sau nếu cần.

## 5. Mapping từ NestJS hiện tại sang .NET

Plan .NET nên tận dụng cách chia domain của code hiện tại thay vì thiết kế lại từ đầu.

| NestJS hiện tại | Trách nhiệm hiện tại | Đích .NET đề xuất |
| --- | --- | --- |
| `apps/backend/src/api/routes/auth.controller.ts` | Auth endpoints | `Syncra.Api/Controllers/AuthController.cs` |
| `apps/backend/src/api/routes/posts.controller.ts` | Posts endpoints | `Syncra.Api/Controllers/PostsController.cs` |
| `apps/backend/src/api/routes/integrations.controller.ts` | Integration endpoints | `Syncra.Api/Controllers/IntegrationsController.cs` |
| `apps/backend/src/api/routes/media.controller.ts` | Media endpoints | `Syncra.Api/Controllers/MediaController.cs` |
| `apps/backend/src/api/routes/billing.controller.ts` | Billing endpoints | `Syncra.Api/Controllers/BillingController.cs` |
| `libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts` | Post business logic | `Syncra.Application/Services/Posts/PostService.cs` |
| `libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts` | Post data access | `Syncra.Infrastructure/Persistence/Repositories/PostRepository.cs` |
| `libraries/nestjs-libraries/src/integrations/integration.manager.ts` | Provider registry | `Syncra.Infrastructure/Integrations/IntegrationRegistry.cs` |
| `libraries/nestjs-libraries/src/integrations/social.abstract.ts` | Base provider contract | `Syncra.Infrastructure/Integrations/Social/SocialProviderBase.cs` |
| `libraries/nestjs-libraries/src/integrations/refresh.integration.service.ts` | Refresh token flow | `Syncra.Application/Services/Integrations/RefreshIntegrationService.cs` |
| `libraries/nestjs-libraries/src/database/prisma/prisma.service.ts` | ORM access layer | `Syncra.Infrastructure/Persistence/SyncraDbContext.cs` |

## 6. Kiến trúc .NET chốt cho sprint này

### Project structure

```text
src/
├── Syncra.Api/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Filters/
│   ├── Extensions/
│   └── Program.cs
├── Syncra.Application/
│   ├── Services/
│   ├── Interfaces/
│   ├── DTOs/
│   └── Jobs/
├── Syncra.Infrastructure/
│   ├── Persistence/
│   ├── Repositories/
│   ├── Integrations/
│   ├── Storage/
│   ├── Payments/
│   ├── Notifications/
│   └── Cache/
├── Syncra.Domain/
│   ├── Entities/
│   ├── Enums/
│   └── ValueObjects/
└── Syncra.Shared/
    ├── Constants/
    ├── Exceptions/
    └── Extensions/
```

### Technology choices cho sprint 7 ngày

- ASP.NET Core 8
- EF Core 8 + PostgreSQL
- Redis cho cache và lightweight coordination
- Hangfire cho scheduled publish jobs và token refresh jobs
- Swagger/OpenAPI
- Sentry
- Stripe sandbox
- Cloudflare R2 hoặc local storage abstraction

### Product decision

Trong sprint đầu, **không dùng CQRS đầy đủ**. Chỉ dùng 3-layer rõ ràng để giảm complexity:

`Controller -> Application Service -> Repository -> EF Core`

## 7. Sprint Goal

Sau 7 ngày, team phải demo được:

1. User đăng ký hoặc đăng nhập được.
2. User kết nối được `X`, `TikTok`, và `YouTube` qua OAuth.
3. User tạo draft post, schedule post, xem list post, và publish được.
4. System có job publish scheduled posts.
5. User upload media và attach vào post được.
6. Billing sandbox chạy được với Stripe ở mức tối thiểu.
7. Có Swagger, migration, seed cơ bản, logging, error tracking, smoke test.

## 8. Out of Scope cho sprint này

Các hạng mục sau không nên đưa vào sprint 7 ngày này:

- Full parity 30+ social providers
- AI content generation, image generation, video generation
- Approval workflow
- Auto-post RSS
- Advanced analytics export CSV/PDF
- White-label agency mode hoàn chỉnh
- Full notification center
- Real-time websockets
- Fine-grained RBAC đầy đủ enterprise

## 9. Sprint backlog đề xuất

### Epic E1. Foundation và platform setup

**Story E1-S1: Bootstrap solution .NET**

- Tạo solution, projects, project references, DI registration
- Add base middleware, exception filter, health check, Swagger
- Add env loading, configuration binding, `.env.example` hoặc `appsettings.*`

**Acceptance criteria**

- Solution build pass local
- Swagger mở được
- Health endpoint hoạt động
- Kết nối PostgreSQL và Redis thành công

**Story E1-S2: Persistence foundation**

- Tạo `DbContext`
- Tạo initial entities và migrations
- Seed dữ liệu mẫu tối thiểu

**Acceptance criteria**

- `Users`, `Organizations`, `Integrations`, `Posts`, `Media`, `Subscriptions` tạo bảng thành công
- Migration apply được trên môi trường dev trống

### Epic E2. Authentication và organization

**Story E2-S1: Auth basic**

- Register
- Login
- Refresh token
- Logout
- Forgot password skeleton

**Acceptance criteria**

- User tạo account được
- User login ra access token và refresh token
- Refresh token rotate được
- Unauthorized requests bị chặn đúng

**Story E2-S2: Organization access**

- Tạo organization
- Lấy organization hiện tại
- Join user với organization
- Role cơ bản `ADMIN`, `USER`

**Acceptance criteria**

- Mọi resource đều isolate theo organization
- User không đọc được data organization khác

### Epic E3. Social integration framework

**Story E3-S1: Integration registry và base provider contract**

- Thiết kế `ISocialProvider`
- Thiết kế base provider handling cho OAuth, refresh token, publish, analytics
- Tạo provider registry tương tự `IntegrationManager`

**Acceptance criteria**

- Hệ thống đăng ký provider qua DI hoặc registry rõ ràng
- Thêm provider mới không cần sửa business flow lõi

**Story E3-S2: OAuth flow cho 3 providers ưu tiên**

- Generate auth URL
- Callback exchange token
- Persist token, refresh token, metadata
- Disconnect integration

**Acceptance criteria**

- `X`, `TikTok`, và `YouTube` connect thành công ở sandbox hoặc dev app
- Token lưu được và load lại được
- Có API list integrations theo organization

**Story E3-S3: Token refresh job**

- Refresh token service
- Hangfire recurring job cho integration hết hạn

**Acceptance criteria**

- Integration sắp hết hạn được refresh tự động
- Refresh fail thì đánh dấu trạng thái lỗi và log rõ ràng

### Epic E4. Post management và scheduler

**Story E4-S1: Post CRUD**

- Create post
- Get posts list
- Get single post
- Update post
- Delete post

**Acceptance criteria**

- Post lưu được với content, scheduled time, integration, media references
- Filter cơ bản theo `status`, `date`, `integration` hoạt động

**Story E4-S2: Scheduling và publish pipeline**

- Schedule post
- Publish immediate
- Background job scan due posts
- Cập nhật trạng thái `Draft`, `Queue`, `Publishing`, `Published`, `Failed`

**Acceptance criteria**

- Scheduled post được publish khi đến giờ
- Failed publish lưu error message và retry policy cơ bản

**Story E4-S3: Platform publish adapters**

- Implement publish thật cho 3 provider ưu tiên
- Normalize publish response về model chung

**Acceptance criteria**

- Có external post id hoặc release URL sau khi publish thành công cho `X`, `TikTok`, và `YouTube`
- Các lỗi provider-specific được convert về error model chung

### Epic E5. Media

**Story E5-S1: Media upload**

- Upload file
- Save metadata
- List media
- Delete media

**Acceptance criteria**

- Upload local hoặc R2 thành công
- Media attach vào post được

### Epic E6. Billing và webhooks

**Story E6-S1: Subscription basic**

- Get current subscription
- Create subscription session
- Cancel subscription
- Stripe webhook skeleton

**Acceptance criteria**

- Stripe sandbox callback cập nhật subscription state được
- Subscription limit có thể đọc được từ API

### Epic E7. Analytics và observability

**Story E7-S1: Basic analytics**

- Per post analytics read model
- Per integration summary skeleton

**Acceptance criteria**

- API trả ra dữ liệu analytics cơ bản hoặc placeholder contract ổn định

**Story E7-S2: Observability**

- Structured logging
- Sentry integration
- Request tracing cơ bản

**Acceptance criteria**

- Error runtime quan trọng được track
- Logs đủ để debug publish flow và OAuth flow

### Epic E8. Quality gate

**Story E8-S1: Test và docs**

- Unit tests cho services trọng yếu
- Integration tests cho auth, integrations, posts
- Swagger tags và example payloads
- Runbook local setup

**Acceptance criteria**

- Smoke test pass
- Dev mới clone repo có thể chạy local theo docs

## 10. 7-day execution plan

### Day 1. Foundation và architecture freeze

**Goal**

Khóa kiến trúc, project structure, persistence foundation, và môi trường chạy local.

**Tasks**

- Tạo solution `.NET`
- Tạo 5 projects: `Api`, `Application`, `Infrastructure`, `Domain`, `Shared`
- Setup `DbContext`, PostgreSQL, Redis, Swagger, Sentry, HealthChecks
- Tạo entities lõi và initial migration
- Tạo base repository pattern và dependency injection

**Deliverables cuối ngày**

- Repo build được
- App boot được
- Swagger up
- Migration chạy được
- Có decision log cho các lựa chọn kỹ thuật

### Day 2. Auth, organization, user access

**Goal**

Hoàn tất nền auth và tenant isolation.

**Tasks**

- Register, login, refresh, logout
- Password hashing
- Access token + refresh token issuing
- Organization creation và membership
- Authorization policy cơ bản theo organization

**Deliverables cuối ngày**

- Auth endpoints demo được qua Swagger hoặc Postman
- Multi-tenant access không bị rò dữ liệu

### Day 3. Integration framework và OAuth flow

**Goal**

Có framework tích hợp social và connect được 2 provider đầu tiên.

**Tasks**

- Thiết kế `ISocialProvider`, `SocialProviderBase`, `IntegrationRegistry`
- Build endpoints connect, callback, list, disconnect
- Implement `X` và `TikTok`
- Persist token, refresh token, account metadata

**Deliverables cuối ngày**

- `X` và `TikTok` connect thành công
- List integrations trả đúng dữ liệu theo organization

### Day 4. Provider thứ 3 và Post CRUD

**Goal**

Chốt end-to-end từ integration sang post data model.

**Tasks**

- Implement `YouTube`
- Build create post, list post, get post, update post, delete post
- Map post với integration và media
- Bổ sung validation cho content, schedule date, status transitions

**Deliverables cuối ngày**

- User tạo được draft post và scheduled post
- `X`, `TikTok`, `YouTube` đã connect xong

### Day 5. Scheduler, publishing, media

**Goal**

Post có thể publish bằng background jobs, media flow usable.

**Tasks**

- Build Hangfire jobs cho scheduled publishing
- Build publish service cho `X`, `TikTok`, `YouTube`
- Build token refresh recurring job
- Implement media upload, list, delete, attach

**Deliverables cuối ngày**

- Scheduled post tự publish được
- Publish lỗi thì có logging và status fail
- Media flow usable end-to-end

### Day 6. Billing, analytics, hardening round 1

**Goal**

Chốt các module supporting cần có để MVP usable.

**Tasks**

- Stripe sandbox create subscription và cancel flow
- Stripe webhook handler
- Basic analytics endpoints
- Structured logs, Sentry, retry strategy cơ bản
- Bổ sung validation, guard, exception handling

**Deliverables cuối ngày**

- Billing sandbox chạy được
- Analytics endpoint trả contract ổn định
- Major errors có track và log

### Day 7. QA, bug fixing, docs, release candidate

**Goal**

Đưa backend vào trạng thái có thể bàn giao cho frontend hoặc pilot testing.

**Tasks**

- Unit test và integration test cho luồng chính
- Smoke test toàn flow: auth -> connect integration -> create post -> schedule -> publish
- Cleanup technical debt blocking
- Hoàn tất Swagger descriptions, env docs, local setup guide, deployment notes

**Deliverables cuối ngày**

- Release candidate `v0.1`
- Demo script rõ ràng
- Known issues list
- Backlog sau sprint

## 11. Cách chia việc cho team 3+ backend dev

### Track A. Platform và infrastructure

- Solution setup
- DbContext, migrations
- Auth, org, permissions
- Billing, observability

### Track B. Integrations

- Integration registry
- OAuth provider `X`
- Token refresh
- Integration health checks

### Track C. Posts và publishing workflows

- OAuth provider `TikTok`
- OAuth provider `YouTube`
- Posts
- Scheduler
- Media

### Ghép nhịp

- Cuối Day 1: chốt contracts giữa entities, DTOs, repositories
- Cuối Day 3: ghép auth + integration flow
- Cuối Day 5: ghép post + publish + media flow

## 12. Fallback nếu team giảm còn 1 backend dev

Nếu team chỉ có 1 backend dev, plan 7 ngày vẫn làm được nhưng phải cắt scope còn:

- Auth basic
- Organization basic
- Posts CRUD + schedule
- Integration framework
- Chỉ `X` và `TikTok` hoặc `X` và `YouTube` end-to-end
- Media upload
- Swagger + migration + smoke test

Khi đó cần **đưa ra khỏi sprint**:

- Billing
- Analytics
- Webhooks ngoài Stripe
- Notification center

## 13. API scope chốt cho MVP sprint này

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Organizations

- `POST /api/organizations`
- `GET /api/organizations/current`

### Integrations

- `GET /api/integrations`
- `GET /api/integrations/connect/{provider}`
- `GET /api/integrations/callback/{provider}`
- `DELETE /api/integrations/{id}`
- `POST /api/integrations/{id}/refresh`

### Posts

- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/{id}`
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `POST /api/posts/{id}/publish`

### Media

- `POST /api/media/upload`
- `GET /api/media`
- `DELETE /api/media/{id}`

### Billing

- `GET /api/billing/subscription`
- `POST /api/billing/subscription`
- `DELETE /api/billing/subscription`
- `POST /api/billing/webhook`

### Analytics

- `GET /api/analytics/posts/{id}`
- `GET /api/analytics/integrations/{id}`

## 14. Definition of Done

Một story chỉ được coi là done khi đạt đủ các tiêu chí sau:

1. Code build pass local.
2. Có test tối thiểu cho business logic trọng yếu.
3. Swagger contract được cập nhật.
4. Không hardcode secrets.
5. Logging và exception handling đủ để debug.
6. Multi-tenant isolation không bị phá.
7. Migration hoặc DB change được version hóa.
8. Có example request hoặc runbook ngắn cho QA/dev khác verify.

## 15. Rủi ro lớn nhất và cách giảm rủi ro

| Rủi ro | Ảnh hưởng | Mitigation |
| --- | --- | --- |
| Scope trượt sang full parity | Sprint fail | Khóa sprint vào 3 providers và MVP endpoints |
| OAuth app credentials chưa sẵn | Block integration testing | Xin credential ngay Day 1, nếu thiếu thì mock callback contract |
| Billing tốn thời gian | Trễ core workflow | Giữ billing ở mức sandbox basic, không build full invoice portal |
| Publish logic mỗi platform khác nhau | Dễ vỡ schedule | Chuẩn hóa response contract và error model từ base provider |
| Token refresh lỗi | Mất kênh social | Có refresh job riêng, log lỗi, mark integration health |
| Team chỉ có 1 dev | Overcommit | Cut billing và analytics khỏi sprint |

## 16. Demo script cuối sprint

Demo cuối sprint nên đi theo đúng narrative sản phẩm:

1. Tạo user mới và login.
2. Tạo organization.
3. Connect `X`.
4. Upload media.
5. Tạo draft post.
6. Schedule post trong 1 đến 2 phút tới.
7. Cho Hangfire worker publish.
8. Xem trạng thái chuyển sang `Published`.
9. Mở analytics basic.
10. Nếu còn thời gian, demo Stripe sandbox subscription.

## 17. Backlog ngay sau sprint này

Sau khi xong sprint 7 ngày, backlog tiếp theo nên là:

1. Mở rộng từ 3 providers lên 8 đến 10 providers ưu tiên.
2. Bổ sung comments, signatures, post sets.
3. Hoàn tất advanced analytics.
4. Thêm notifications và webhooks.
5. Thêm AI module.
6. Xem xét CQRS cho các flow phức tạp nếu throughput tăng.

## 18. Recommendation cuối cùng của PM/Lead Product

Nếu mục tiêu là có một backend `.NET` mà dev có thể bắt đầu build ngay và demo được trong 7 ngày, thì sprint này nên được đóng khung là:

**"Core backend MVP with 3 production-priority integrations, post scheduling, media, billing basic, and observable infrastructure."**

Đây là scope đủ chặt để ship, đủ rộng để chứng minh kiến trúc đúng, và đủ gần với backend NestJS hiện tại để migration từng phần ở sprint kế tiếp.

## 19. Scrum setup đề xuất cho team 3+ dev

### Squad structure

- `Dev A`: Platform foundation, auth, org, security, observability
- `Dev B`: Integrations framework, OAuth, token refresh, provider `X`
- `Dev C`: Posts, scheduler, media, provider `TikTok` và `YouTube`
- `Tech Lead hoặc reviewer`: review cross-cutting, contracts, API consistency, release readiness

### Scrum rhythm tối thiểu

- `Sprint Planning`: 2 giờ ở đầu Day 1
- `Daily Scrum`: 15 phút mỗi sáng, chỉ trả lời 3 câu hỏi `đã làm gì`, `hôm nay làm gì`, `đang bị block gì`
- `Scope Check`: 30 phút cuối Day 3 để quyết định có giữ billing + analytics trong sprint hay không
- `Sprint Review`: 60 phút cuối Day 7 theo demo script ở phần 16

### Board columns

- `Todo`
- `In Progress`
- `Blocked`
- `Code Review`
- `Ready for Demo`
- `Done`

### Rule quản lý scope

Nếu tới cuối Day 3 mà cả 3 provider chưa connect ổn định, tự động đẩy `billing` hoặc `analytics` xuống sprint sau. Không hy sinh publish flow để giữ đủ danh sách module.