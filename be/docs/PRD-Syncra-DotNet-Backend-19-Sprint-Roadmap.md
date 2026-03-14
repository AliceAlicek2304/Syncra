# Syncra.NET Backend - 19 Sprint Roadmap

## 1. Mục tiêu tài liệu

Tài liệu này mở rộng từ:

- `docs/PRD-Syncra-DotNet-Backend.md`
- `docs/PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md`
- `docs/PRD-Syncra-DotNet-Backend-Jira-Backlog.md`

Mục tiêu là tạo một roadmap đầy đủ cho 19 sprint để đội dev, PM, Tech Lead và stakeholder có thể nhìn rõ:

- Thứ tự triển khai backend .NET từ MVP đến production-ready
- Cách rollout 30+ social providers theo từng đợt
- Mốc nào đạt core parity với backend NestJS hiện tại
- Mốc nào dành cho AI, enterprise, analytics, automation và scale
- Mốc nào là decision gate để cắt hoặc mở rộng scope

## 2. Planning assumptions

Roadmap này được xây theo các giả định sau:

- 1 sprint = 7 ngày theo cadence hiện tại
- Team triển khai tối thiểu 3 backend dev, có Tech Lead review
- Backend .NET được build side-by-side với NestJS cho đến giai đoạn cutover
- Sprint 1 là sprint MVP đã được chốt trong sprint plan hiện tại
- Ưu tiên chung của sản phẩm là `Auth -> Integrations -> Posts -> Media -> Billing -> Analytics -> Automation -> AI -> Enterprise -> Migration`
- Các social provider sẽ được rollout theo wave, không cố complete 30+ provider ngay ở các sprint đầu

## 3. Nguyên tắc điều hành roadmap

- Không hy sinh core publishing flow để ôm thêm providers.
- Không mở rộng AI hoặc enterprise trước khi core posting và billing ổn định.
- Các sprint sau chỉ được mở khi sprint trước đạt release gate tối thiểu.
- Nếu roadmap cần nén thời gian, cắt `advanced analytics`, `AI media`, `enterprise extras` trước, không cắt `auth`, `integrations`, `posts`, `scheduler`, `media`, `observability`.

## 4. Milestone overview

| Milestone | Sprints | Mục tiêu | Kết quả kỳ vọng |
| --- | --- | --- | --- |
| M1 | Sprint 1-3 | MVP đến Pilot Core | Backend .NET chạy local, connect được provider priority, publish được, pilot nội bộ được |
| M2 | Sprint 4-7 | Social Platform Expansion | Mở rộng phần lớn social providers và hoàn thiện integration framework |
| M3 | Sprint 8-11 | Product Core Parity | Đạt parity cao cho scheduling, collaboration, media, billing |
| M4 | Sprint 12-15 | Analytics, Automation, Growth | Analytics usable, webhooks/notifications ổn, autopost và workflow automation chạy được |
| M5 | Sprint 16-19 | AI, Enterprise, Migration, Launch | Hoàn thiện AI, enterprise capabilities, hardening, cutover readiness |

## 5. Provider rollout strategy

### Wave A: Sprint 1

- X
- TikTok
- YouTube

### Wave B: Sprint 3

- LinkedIn
- LinkedIn Page
- Facebook

### Wave C: Sprint 4

- Instagram
- Instagram Standalone
- Threads
- Pinterest

### Wave D: Sprint 5

- Reddit
- Discord
- Slack
- Telegram

### Wave E: Sprint 6

- Bluesky
- Mastodon
- Farcaster
- Nostr
- Lemmy

### Wave F: Sprint 7

- VK
- Google My Business
- Dribbble
- Medium
- Dev.to
- Hashnode

### Wave G: Sprint 8

- WordPress
- Listmonk
- Beehiiv
- Twitch
- Kick

### Wave H: Sprint 9

- Skool
- Whop
- Custom or community providers needed for parity after product review

## 6. Release gates theo milestone

### Gate G1 sau Sprint 3

- Auth, organization, user access ổn định
- Ít nhất 6 provider hoạt động end-to-end
- Create, schedule, publish post ổn định
- Media upload usable
- Local demo và internal pilot khả thi

### Gate G2 sau Sprint 7

- Phần lớn provider priority hoàn thành
- Integration framework đủ generic để scale tiếp
- Scheduling và post operations không còn là bottleneck kỹ thuật
- Có billing cơ bản và quality baseline

### Gate G3 sau Sprint 11

- Product core parity đạt mức dùng được cho user thật
- Collaboration, media, billing, notifications, webhooks usable
- Dữ liệu analytics cơ bản đã có giá trị sản phẩm

### Gate G4 sau Sprint 15

- Automation và growth modules usable
- Public API hoặc third-party integration surface đã bắt đầu ổn định
- Hệ thống sẵn sàng cho AI/enterprise hardening cuối cùng

### Gate G5 sau Sprint 19

- Production readiness review pass
- Migration/cutover runbook hoàn tất
- Performance, security, observability đạt chuẩn release
- Có quyết định rõ ràng về cutover hoặc dual-run tiếp tục

## 7. Roadmap chi tiết theo 19 sprint

## Sprint 01 - Core MVP Foundation

- Theme: Foundation, Auth MVP, Provider Priority MVP
- Mục tiêu: Dựng backend .NET usable để demo local trong 7 ngày.
- Scope chính:
  - Solution .NET, DI, Swagger, HealthChecks, EF Core, PostgreSQL, Redis, Sentry
  - Local auth với JWT
  - Organization basic
  - Integration framework
  - X, TikTok, YouTube connect và publish được
  - Post CRUD, scheduler, media upload, billing basic, analytics basic, smoke tests
- Deliverables:
  - Release candidate `v0.1`
  - Sprint backlog Jira cho Sprint 1
  - Demo end-to-end local
- Exit criteria:
  - User login được
  - Connect được 3 provider priority
  - Schedule và publish được ít nhất 1 post thành công

## Sprint 02 - Auth and Workspace Core Parity

- Theme: Account system và tenant foundation
- Mục tiêu: Hoàn thiện account layer và workspace management ở mức dùng được.
- Scope chính:
  - Register, login, refresh, logout hardening
  - Password reset
  - Email verification
  - Organizations list, update, delete soft flow
  - User profile APIs
  - Team member invite basic
  - Role model cơ bản `ADMIN`, `USER`, `AGENCY_ADMIN`
  - Social login priority cho GitHub và Google
- Deliverables:
  - Account lifecycle gần parity với PRD
  - Workspace CRUD usable
  - Auth test suite mở rộng
- Exit criteria:
  - User có thể tạo workspace, chỉnh profile, invite member cơ bản
  - Auth local và social login đầu tiên hoạt động ổn định

## Sprint 03 - Pilot Expansion and Provider Wave B

- Theme: Pilot-ready core và social expansion đầu tiên
- Mục tiêu: Đưa backend từ MVP sang internal pilot stable, mở rộng thêm provider business-critical.
- Scope chính:
  - LinkedIn, LinkedIn Page, Facebook
  - Integration management cải tiến: list, disconnect, refresh, settings cơ bản
  - User management admin basics
  - Organization settings cơ bản
  - Rate limiting, audit logs cơ bản cho auth/integration
  - Hardening cho OAuth callbacks và token storage
- Deliverables:
  - Milestone M1 đạt điều kiện internal pilot
  - 6 provider hoạt động end-to-end
  - Security baseline cho auth và integrations
- Exit criteria:
  - LinkedIn, LinkedIn Page, Facebook connect và publish được
  - Admin có thể xem/quản lý user level cơ bản
  - Gate G1 pass

## Sprint 04 - Visual Publishing Wave C

- Theme: Visual-first platforms và platform-specific media rules
- Mục tiêu: Bổ sung các platform hình ảnh/video social phổ biến và rules riêng cho từng nền tảng.
- Scope chính:
  - Instagram
  - Instagram Standalone
  - Threads
  - Pinterest
  - Media validation theo provider
  - Platform-specific formatting rules
  - Character count và content validation rules
  - Attach media nâng cao cho post composer backend contracts
- Deliverables:
  - Visual/social publishing stack hoàn chỉnh cho nhóm B2C phổ biến
  - Contract rõ cho frontend composer về validation/provider constraints
- Exit criteria:
  - 4 provider visual/social mới connect và publish được
  - Backend trả validation/provider errors nhất quán

## Sprint 05 - Community and Messaging Wave D

- Theme: Communities, messaging và interaction-centric channels
- Mục tiêu: Mở rộng sang các kênh community và messaging cần flow publish khác social feed truyền thống.
- Scope chính:
  - Reddit
  - Discord
  - Slack
  - Telegram
  - Mention/autocomplete foundation cho integrations hỗ trợ mention
  - Short link decisioning cải tiến
  - Link tracking hooks chuẩn bị cho analytics sau này
- Deliverables:
  - Community/message provider set usable
  - Mention service foundation
- Exit criteria:
  - 4 provider community/message hoạt động end-to-end
  - Short link flow không phá publish pipeline

## Sprint 06 - Open Network Wave E

- Theme: Decentralized and open network support
- Mục tiêu: Hoàn thiện nhóm provider có API và auth pattern khác biệt hơn, tăng độ trưởng thành của provider framework.
- Scope chính:
  - Bluesky
  - Mastodon
  - Farcaster
  - Nostr
  - Lemmy
  - Provider abstraction nâng cấp để xử lý nhiều auth/publish style hơn
  - Integration health dashboard nội bộ
- Deliverables:
  - Provider framework đủ linh hoạt cho decentralized/open networks
  - Monitoring nội bộ tốt hơn cho integration failures
- Exit criteria:
  - 5 provider open network usable
  - Refresh/error handling không bị hardcode theo một nhóm provider duy nhất

## Sprint 07 - Publishing and Business Wave F

- Theme: Business, publishing, and long-tail channels
- Mục tiêu: Mở rộng coverage sang nhóm publishing/business channels để tăng breadth sản phẩm.
- Scope chính:
  - VK
  - Google My Business
  - Dribbble
  - Medium
  - Dev.to
  - Hashnode
  - Internal plugs và provider settings framework parity bước đầu
- Deliverables:
  - Milestone M2 hoàn thành
  - Social/publishing coverage đủ rộng cho phần lớn use cases chính
- Exit criteria:
  - Provider settings framework đủ để scale thêm provider không bị vỡ contract
  - Gate G2 pass

## Sprint 08 - Creator, CMS, and Newsletter Wave G

- Theme: CMS, newsletter, creator channels
- Mục tiêu: Bổ sung nhóm provider phục vụ creator, publishing pipeline dài hạn và newsletter integrations.
- Scope chính:
  - WordPress
  - Listmonk
  - Beehiiv
  - Twitch
  - Kick
  - Integration-specific scheduling windows cơ bản
  - Content type support mở rộng cho article/newsletter style
- Deliverables:
  - Coverage cho CMS/newsletter/creator nhóm đầu tiên
  - Một phần article-like publishing flows được xác nhận trên .NET
- Exit criteria:
  - Newsletter/CMS stack dùng được ở mức MVP
  - Backend có contract đủ linh hoạt cho article/post đa định dạng

## Sprint 09 - Remaining Provider Coverage and Post Operations Expansion

- Theme: Hoàn tất provider wave H và tăng độ sâu của post workflows
- Mục tiêu: Đóng phần lớn gap về provider coverage và hoàn thiện các thao tác post cấp sản phẩm.
- Scope chính:
  - Skool
  - Whop
  - Custom/community providers cần parity sau review
  - Duplicate post
  - Bulk scheduling
  - Reschedule
  - Timezone support
  - Best free slot suggestion
- Deliverables:
  - Provider coverage tiệm cận danh sách PRD
  - Scheduler usable hơn cho user thật
- Exit criteria:
  - User có thể duplicate, bulk schedule, reschedule ổn định
  - Danh sách provider trọng tâm của PRD đạt coverage cao

## Sprint 10 - Collaboration and Content Workflow

- Theme: Team collaboration và approval flows
- Mục tiêu: Hoàn thiện backend cho workflow làm việc nhóm quanh nội dung.
- Scope chính:
  - Comments trên post
  - Tags
  - Signatures
  - Post sets
  - Approval workflow v1
  - Invite/member permissions refinement
  - Notification hooks cho collaboration events
- Deliverables:
  - Milestone M3 phần collaboration usable
  - Backend đủ để frontend build flow review/approve nội dung
- Exit criteria:
  - Comment, tag, signature, set hoạt động ổn định
  - Có approval flow tối thiểu trước publish

## Sprint 11 - Media Library Advanced and Billing Parity

- Theme: Assets và monetization foundation
- Mục tiêu: Nâng media library lên mức production-usable và hoàn thiện billing beyond basic.
- Scope chính:
  - Thumbnail generation
  - Image processing, resize, compress
  - Storage backends local/R2/S3 abstraction hoàn chỉnh
  - Subscription tiers
  - Trial, prorate, invoice access, cancel/update subscription
  - Entitlement enforcement theo plan
- Deliverables:
  - Media stack production-usable
  - Billing gần parity với PRD core
- Exit criteria:
  - Plan limits thực thi được
  - Asset lifecycle không còn là lỗ hổng lớn về sản phẩm

## Sprint 12 - Webhooks, Notifications, and Public Surface

- Theme: Event delivery và platform ecosystem
- Mục tiêu: Mở các bề mặt tích hợp ra bên ngoài và hoàn thiện event delivery trong hệ thống.
- Scope chính:
  - Outbound webhooks
  - Webhook CRUD
  - Notification center basic
  - Email notifications và digest preferences
  - Public API foundation
  - Settings module mở rộng
- Deliverables:
  - Milestone M4 phase 1 hoàn thành
  - Các team ngoài có thể bắt đầu tích hợp qua API/webhook
- Exit criteria:
  - Webhooks và notifications usable end-to-end
  - Public API contract đủ ổn định cho pilot integrations

## Sprint 13 - Analytics Foundation

- Theme: Measurement first
- Mục tiêu: Tạo nền analytics có giá trị cho người dùng và cho chính team sản phẩm.
- Scope chính:
  - Post analytics
  - Integration analytics
  - Overview dashboard read models
  - Redis caching chiến lược cho analytics queries
  - Tracking data normalization
- Deliverables:
  - Dashboard analytics v1 usable
  - Read model rõ cho reporting
- Exit criteria:
  - User xem được analytics per post và per integration
  - Dashboard overview có số liệu cơ bản đáng tin cậy

## Sprint 14 - Analytics Advanced and Tracking Pixel

- Theme: Reporting depth và attribution
- Mục tiêu: Nâng analytics từ basic lên actionable insights.
- Scope chính:
  - Export analytics CSV/PDF
  - Tracking pixel
  - Link click attribution cải tiến
  - Benchmarking theo channel
  - Data retention và rollup strategy
- Deliverables:
  - Reporting stack usable cho marketing team
  - Attribution foundation cho growth use cases
- Exit criteria:
  - Export chạy được
  - Pixel/tracking không làm giảm ổn định hệ thống chính

## Sprint 15 - Autopost and Automation

- Theme: Automated content workflows
- Mục tiêu: Hoàn thiện nhóm tính năng automation để giảm công việc thủ công.
- Scope chính:
  - RSS feeds
  - Autopost rules
  - Content translation pipeline
  - Conditional posting rules
  - Background workflow scheduling cho automation jobs
- Deliverables:
  - Automation v1 usable
  - Rule engine foundation cho content automation
- Exit criteria:
  - User cấu hình được ít nhất một autopost workflow end-to-end
  - Gate G4 pass

## Sprint 16 - AI Copilot Foundation

- Theme: AI content workflows
- Mục tiêu: Tích hợp AI vào content generation mà không phá core reliability.
- Scope chính:
  - Generate content
  - Improve/rewrite content
  - Streaming response
  - Prompt templates và moderation guardrails
  - Credit accounting foundation cho AI usage
- Deliverables:
  - AI text copilot usable trong backend API
  - Streaming contract cho frontend
- Exit criteria:
  - AI endpoints ổn định
  - Có guardrails đủ để tránh output lỗi hệ thống hoặc abuse đơn giản

## Sprint 17 - AI Media and Credit System

- Theme: AI assets và monetization cho AI
- Mục tiêu: Mở rộng AI sang media generation và hoàn thiện billing/credit model tương ứng.
- Scope chính:
  - Generate images
  - Video generation integration
  - AI credit system đầy đủ
  - Usage metering
  - Quota enforcement theo subscription
- Deliverables:
  - AI media v1
  - Credits tie-in với billing và subscription
- Exit criteria:
  - User dùng được AI image hoặc video generation có giới hạn rõ ràng
  - Credit tracking khớp với usage records

## Sprint 18 - Enterprise, Security, and Scale Hardening

- Theme: Enterprise controls và operational maturity
- Mục tiêu: Chuẩn bị cho tenant lớn hơn, yêu cầu bảo mật cao hơn và ecosystem phức tạp hơn.
- Scope chính:
  - Advanced RBAC
  - Agency mode
  - OAuth apps
  - Approved apps
  - Third-party integrations surface
  - Security hardening, audit logs nâng cao
  - Performance tuning, queue strategy review, selective CQRS nếu cần
- Deliverables:
  - Enterprise foundation usable
  - Security/ops checklist gần release-ready
- Exit criteria:
  - Multi-tenant controls rõ ràng
  - Admin surface và app approval flows không còn là khoảng trống lớn

## Sprint 19 - Migration, Cutover, and Launch Readiness

- Theme: Final parity review, migration plan, go-live readiness
- Mục tiêu: Chốt hệ thống để có thể cutover hoặc chạy dual-run có kiểm soát với backend NestJS.
- Scope chính:
  - Full parity gap review với NestJS
  - Data migration utilities
  - Backfill jobs
  - Cutover runbook
  - UAT, bug bash, load test, DR checklist
  - Production monitoring dashboards
  - Rollback strategy
- Deliverables:
  - Milestone M5 hoàn thành
  - Release candidate production
  - Quyết định `cutover`, `dual-run`, hoặc `phased rollout`
- Exit criteria:
  - Gate G5 pass
  - Có go-live checklist và rollback checklist đầy đủ

## 8. Những sprint có thể nén hoặc cắt nếu cần tăng tốc

Nếu cần rút roadmap 19 sprint xuống còn 14 đến 16 sprint, các phần có thể gộp là:

- Sprint 13 và Sprint 14
- Sprint 16 và Sprint 17
- Sprint 18 và Sprint 19

Nếu cần rút thêm nữa, cắt scope theo thứ tự sau:

- AI video generation
- Advanced analytics export
- Enterprise extras ngoài RBAC cơ bản
- Community/custom providers có nhu cầu thấp

## 9. Những sprint tuyệt đối không nên nén quá mạnh

- Sprint 1
- Sprint 2
- Sprint 3
- Sprint 4
- Sprint 9
- Sprint 10
- Sprint 11
- Sprint 19

Đây là các sprint đặt nền hoặc là sprint quyết định chất lượng release. Nén quá mạnh sẽ làm roadmap nhìn nhanh hơn nhưng tăng rủi ro sản phẩm và nợ kỹ thuật rất lớn.

## 10. Recommendation của PM/Lead Product

Nếu mục tiêu thực tế là xây một Syncra.NET có thể thay backend NestJS theo lộ trình an toàn, roadmap 19 sprint này nên được dùng theo kiểu:

- Sprint 1-3: Chứng minh kiến trúc và pilot được
- Sprint 4-11: Hoàn thiện product core và provider breadth
- Sprint 12-15: Tăng chiều sâu sản phẩm và growth loops
- Sprint 16-19: Hoàn thiện AI, enterprise, migration và launch readiness

Roadmap này cho phép team ship giá trị sớm từ Sprint 1, nhưng vẫn giữ một đường phát triển đủ thực tế để chạm tới parity và production readiness ở Sprint 19.