# Sprint 1 - Development Breakdown

Tai lieu nay bien Sprint 1 thanh bo huong dan van hanh hang ngay de dev biet hom nay phai lam gi, task nao phai chot truoc, task nao AI co the generate code theo tung buoc, va can verify gi truoc khi move sang task tiep theo.

## 1. Tai lieu nguon

- Sprint plan goc: [../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md](../PRD-Syncra-DotNet-Backend-7-Day-Sprint-Plan.md)
- Jira backlog chi tiet: [../PRD-Syncra-DotNet-Backend-Jira-Backlog.md](../PRD-Syncra-DotNet-Backend-Jira-Backlog.md)
- Roadmap 19 sprint: [../PRD-Syncra-DotNet-Backend-19-Sprint-Roadmap.md](../PRD-Syncra-DotNet-Backend-19-Sprint-Roadmap.md)

## 2. Muc tieu cua bo docs nay

- Chuyen Sprint 1 thanh checklist engineering thuc thi duoc theo tung ngay.
- Chia task nho hon story Jira de AI hoac dev co the xu ly task-by-task.
- Giu ro dependency giua Foundation, Auth, Integrations, Posts, Media, Billing, Analytics va Quality Gate.
- Tao mot cach track tien do don gian: task nao xong thi tick, task nao blocked thi ghi ly do ngay tai file cua ngay do.

## 3. Cach dung cho dev va AI

1. Moi buoi sang, mo file README cua ngay hien tai.
2. Lam theo thu tu tu tren xuong duoi, khong nhay qua task co dependency chua xong.
3. Moi lan chi giao cho AI mot task ID duy nhat.
4. Sau moi task, cap nhat `Status`, ket qua verify, va file da cham vao.
5. Cuoi ngay, doi chieu voi `Exit criteria` cua ngay do truoc khi move sang ngay tiep theo.

## 4. Prompt template de dua cho AI

```text
Implement <TASK_ID> from the Sprint 1 docs in this repo only.
Read the task details in docs/Sprint 1/Day X/README.md and stay inside that scope.
Follow Controller -> Service -> Repository, keep tenant isolation intact, add tests required by the task, and report verification steps.
```

## 5. Daily map

| Day | Main outcome | Jira focus | Hard exit criteria |
| --- | --- | --- | --- |
| Day 1 | Solution boot, persistence base, env checklist | ST01, ST02, ST03 | App boot duoc, Swagger ok, migration apply duoc, blocker list ro rang |
| Day 2 | Auth va organization isolation | ST04, ST05 | Register/login/refresh/logout chay duoc, org isolation dung |
| Day 3 | Integration framework va 2 provider dau tien | ST06, ST07 | Registry xong, X va TikTok connect duoc |
| Day 4 | Provider thu 3 va Post CRUD | ST07, ST09 | YouTube connect duoc, post CRUD chay duoc |
| Day 5 | Refresh jobs, publish pipeline, media | ST08, ST10, ST11, ST12 | Scheduled publish chay duoc, media attach duoc |
| Day 6 | Billing, analytics, observability | ST13, ST14, ST15 | Stripe sandbox, analytics contracts, logs va Sentry ok |
| Day 7 | Tests, docs, smoke, release candidate | ST16, ST17 | Smoke pass, docs day du, demo script va release checklist xong |

## 6. Rule quan ly scope

- Khong duoc slip: ST01, ST02, ST04, ST05, ST06, ST07, ST09, ST10, ST11, ST12, ST16, ST17.
- Co the day ra sau neu bi tre tu Day 3 tro di: ST13, ST14, ST15.
- Neu cuoi Day 3 ma 3 provider chua on dinh, uu tien giu publish flow va cat billing hoac analytics truoc.

## 7. Track ownership goi y

- Dev A: Foundation, auth, organization, billing, observability.
- Dev B: Integration framework, OAuth, token refresh, provider X.
- Dev C: TikTok, YouTube, posts, scheduler, media, publish adapters.
- Tech Lead: Scope gate, review contracts, smoke verification, release readiness.

## 8. Cach track tien do

Copy bang nay vao dau moi PR hoac su dung truc tiep trong file cua ngay:

| Task ID | Owner | Status | PR/Commit | Verify | Notes |
| --- | --- | --- | --- | --- | --- |
| D?-T?? | Dev A/B/C | Todo / Doing / Review / Done / Blocked | Link | Lenh hoac buoc verify | Blocker neu co |

## 9. Dieu huong nhanh

- [Day 1](./Day%201/README.md)
- [Day 2](./Day%202/README.md)
- [Day 3](./Day%203/README.md)
- [Day 4](./Day%204/README.md)
- [Day 5](./Day%205/README.md)
- [Day 6](./Day%206/README.md)
- [Day 7](./Day%207/README.md)

## 10. Definition of done o muc task

Mot task chi duoc tick xong khi:

- Code build pass trong pham vi task.
- File config, contract, migration hoac docs lien quan da duoc cap nhat.
- Co cach verify ro rang bang API call, test, hoac smoke step.
- Khong mo rong scope ra ngoai ngay do neu khong can thiet.
