# Sprint 1 – Backend Foundation

Duration: Day 1–2

Day Range:
- Day 1
- Day 2

Sprint Focus:
Project setup, architecture foundation, shared infrastructure, identity baseline, workspace base, and persistence standards.

Sprint Goal:
Establish a runnable backend foundation that the team can build on for the rest of the 7-day delivery plan, including solution structure, infrastructure wiring, base middleware, initial schema, and secured identity/workspace scaffolding.

Key Deliverables:
- backend solution structure finalized for API, application, domain, infrastructure, workers, contracts, tests, and deploy assets
- ASP.NET Core API skeleton running with Swagger and health endpoints
- PostgreSQL, Redis, and RabbitMQ connectivity configured and verified
- base middleware implemented for error handling, structured logging, correlation IDs, and auth skeleton
- database standards documented and base entity conventions applied
- initial migration created and applied
- auth, user/profile, workspace, plan seed, audit log, and idempotency skeletons in place
- protected `/api/v1/auth/me` and `/api/v1/users/me` endpoints available

Success Criteria:
- developers can clone, configure, and run the backend locally without manual patching
- health checks show API and infrastructure dependencies are reachable
- Swagger documents the base API surface
- first migration applies successfully on a clean database
- JWT authentication flow is scaffolded and protected endpoints reject anonymous requests
- audit and idempotency foundations are present for future mutation-heavy modules

Risks:
- local environment drift across machines may slow onboarding if env templates are incomplete
- infrastructure containers may fail to start consistently without version pinning
- auth implementation may over-expand if the team attempts full production auth on Day 2
- migration rework may occur if base entity conventions are not agreed early

Dependencies:
- architecture and module boundaries defined in `be/syncra-backend-plan/backend-task.md`
- agreement on modular monolith approach for 7-day delivery
- local/container access to PostgreSQL, Redis, and RabbitMQ
- selected JWT/token strategy for MVP

Next Sprint:
Sprint 2 will implement the first user-facing business capabilities: ideas management, AI request persistence, repurpose workflows, posts, media metadata, and calendar scheduling.