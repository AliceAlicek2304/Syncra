# Sprint 2 – Core Services

Duration: Day 3–4

Day Range:
- Day 3
- Day 4

Sprint Focus:
Deliver the first high-value backend product capabilities: ideas management, AI request persistence, repurpose workflows, posts, media handling, and calendar scheduling.

Sprint Goal:
Implement the core application services that support the frontend’s main workflows, while preserving workspace scoping, validation, auditability, usage controls, and extensibility for later integrations.

Key Deliverables:
- idea groups and ideas CRUD with move/status workflows
- AI idea generation request contract and persistence model
- repurpose generation contract and history storage
- plan-based AI usage counter enforcement
- posts, post variants, media metadata, and draft/edit flows
- calendar query, schedule, and reschedule APIs
- object storage integration with upload validation and signed access flow

Success Criteria:
- idea and post workflows are usable end-to-end through API calls
- AI and repurpose requests can be recorded and returned with normalized contracts
- scheduling flows work with UTC normalization and workspace scoping
- uploads are validated and media metadata persists correctly
- key mutation endpoints align with audit logging, idempotency, and optimistic concurrency rules
- the frontend team can begin integrating against stable contracts for core content workflows

Risks:
- AI implementation may expand beyond contract-first scope if provider-specific logic is attempted too early
- media upload flow may slip if storage configuration is incomplete or inconsistent across environments
- post and calendar models may need rework if timezone handling is not normalized from the start
- usage counters may become inaccurate if updates are not transaction-safe and idempotent
- DTO drift between backend and frontend can create rework late in the 7-day timeline

Dependencies:
- Sprint 1 foundation completed successfully
- working PostgreSQL, Redis, and API environment from Sprint 1
- auth, workspace context, audit logging, and idempotency skeletons already available
- agreed DTO direction for ideas, AI generation, posts, and scheduling
- object storage target available for media flow implementation

Next Sprint:
Sprint 3 will implement social integrations, publishing pipeline scaffolding, analytics, trends, notification hooks, and support operations.