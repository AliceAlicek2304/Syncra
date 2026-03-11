  # Sprint 1 - Day 1

Dieu huong: [Sprint 1 README](../README.md) | [Sprint plan](../../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md) | [Jira backlog](../../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)

## 1. Muc tieu trong ngay

Khoa duoc nen tang ky thuat cho service .NET moi: solution, startup, persistence, migration, seed va checklist credentials de khong bi block tu Day 2 tro di.

## 2. Jira scope

- ST01: Bootstrap .NET solution and API shell
- ST02: Set up persistence foundation with EF Core and initial migration
- ST03: Prepare local infrastructure and external credentials checklist

## 3. Exit criteria

- Solution build duoc.
- API boot duoc o local.
- Swagger va health check truy cap duoc.
- Migration apply duoc tren database dev rong.
- Danh sach credentials con thieu da co owner ro rang.

## 4. Workboard

- [x] D1-T01 Create solution skeleton and project references
- [x] D1-T02 Wire API startup, DI, Swagger, health checks, exception pipeline
- [x] D1-T03 Add configuration binding, appsettings structure, env checklist
- [x] D1-T04 Model core entities and `SyncraDbContext`
- [x] D1-T05 Add repositories, initial migration, seed data
- [x] D1-T06 Freeze local infra checklist and external credentials ownership

## 5. Engineering tasks chi tiet

### D1-T01 Create solution skeleton and project references

- Jira mapping: ST01 / SUB01
- Owner: Dev A
- Do:
  - Tao solution `.NET 8` va 5 projects `Syncra.Api`, `Syncra.Application`, `Syncra.Infrastructure`, `Syncra.Domain`, `Syncra.Shared`.
  - Add project references dung huong dependency tu API xuong Infrastructure, Domain, Shared.
  - Chot thu muc lam viec theo sprint plan: `src/Syncra.Api`, `src/Syncra.Application`, `src/Syncra.Infrastructure`, `src/Syncra.Domain`, `src/Syncra.Shared`.
- Expected output:
  - Solution file va project files co the restore va build.
- Verify:
  - `dotnet restore`
  - `dotnet build`
- Prompt seed:
    - Implement D1-T01 only: scaffold the .NET solution and the five projects under `src/` with correct project references for the locked architecture.

### D1-T02 Wire API startup, DI, Swagger, health checks, exception pipeline

- Jira mapping: ST01 / SUB02 / SUB03
- Owner: Dev A
- Do:
  - Cau hinh `Program.cs`, dependency injection modules, middleware order va exception handling toan cuc.
  - Bat Swagger/OpenAPI, health checks, routing va mot endpoint health don gian.
  - Dat san `Extensions/` hoac `Middleware/` de sprint sau khong doi startup shape.
- Expected output:
  - App boot duoc va mo Swagger UI.
- Verify:
  - Chay API local.
  - `GET /health` tra `200 OK`.
  - Swagger UI load duoc.
- Prompt seed:
  - Implement D1-T02 only: wire API startup, DI registration, Swagger, health checks, and a global exception pipeline without adding business modules yet.

### D1-T03 Add configuration binding, appsettings structure, env checklist

- Jira mapping: ST01 / SUB04 va ST03 / SUB09
- Owner: Dev A + Tech Lead
- Do:
  - Thiet ke `appsettings.*` va strongly typed options cho PostgreSQL, Redis, JWT, Stripe, Sentry, OAuth providers.
  - Tao `.env.example` hoac env checklist tuong duong cho sprint MVP.
  - Ghi ro bien nao bat buoc co ngay Day 1 va bien nao co the mock tam.
- Expected output:
  - Team clone repo co the biet chinh xac can dien env nao.
- Verify:
  - App boot duoc voi env mau.
  - Khong co hardcoded secrets.
- Prompt seed:
  - Implement D1-T03 only: add configuration binding and a complete environment variable checklist for PostgreSQL, Redis, JWT, Sentry, Stripe, X, TikTok, and YouTube.

### D1-T04 Model core entities and `SyncraDbContext`

- Jira mapping: ST02 / SUB05 / SUB06
- Owner: Dev A
- Do:
  - Tao entity va enum cho `Users`, `Organizations`, `OrganizationMembers`, `Integrations`, `Posts`, `Media`, `Subscriptions`.
  - Tao `SyncraDbContext` va Fluent API config cho cac quan he chinh.
  - Chot naming va audit fields can dung lai nhieu lan.
- Expected output:
  - DB schema core du cho auth, integrations, posts, media, billing.
- Verify:
  - Migration generate thanh cong.
  - Schema co du bang core.
- Prompt seed:
  - Implement D1-T04 only: create the core domain entities and EF Core mappings needed by Sprint 1, with organization isolation in mind.

### D1-T05 Add repositories, initial migration, seed data

- Jira mapping: ST02 / SUB07 / SUB08
- Owner: Dev A
- Do:
  - Tao repository interfaces va concrete repositories cho cac aggregate chinh.
  - Add initial migration.
  - Tao seed data toi thieu de smoke duoc auth, org, integrations va posts.
- Expected output:
  - Co the apply migration len database rong va boot app khong loi.
- Verify:
  - `dotnet ef migrations add InitialCreate`
  - `dotnet ef database update`
  - Seed data insert duoc.
- Prompt seed:
  - Implement D1-T05 only: add repository scaffolding, initial migration, and minimum seed data for local smoke testing.

### D1-T06 Freeze local infra checklist and external credentials ownership

- Jira mapping: ST03 / SUB10 / SUB11
- Owner: Tech Lead
- Do:
  - Liet ke credential cho X, TikTok, YouTube, Stripe sandbox, Sentry, PostgreSQL, Redis.
  - Danh dau credential nao da co, credential nao cho mock fallback.
  - Gan owner va han chot cung cap neu con thieu.
- Expected output:
  - Khong co blocker ngoai ky thuat bi de tron sang Day 3.
- Verify:
  - Co file checklist ro owner, due date, va phuong an fallback.
- Prompt seed:
  - Produce the Day 1 external dependency checklist for Sprint 1 with owners, due dates, and fallback plan for missing credentials.

## 6. Cuoi ngay phai chot

- App boot duoc o local.
- Swagger va `/health` da verify.
- Database len schema dau tien thanh cong.
- Team da biet ro ngay mai co the bat dau auth ma khong bi block boi env hoac credential.

## 7. Neu truot scope

- Khong duoc day ST01 va ST02 sang Day 2.
- D1-T06 co the chua co du credential that, nhung phai co fallback plan va owner ro rang.
